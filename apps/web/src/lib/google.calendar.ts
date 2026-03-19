// lib/google.calendar.ts
import { google } from 'googleapis';
import { prisma } from './prisma';

export async function getGoogleClient(userId: string) {
  const account = await prisma.calendarAccount.findFirst({
    where: { userId, provider: 'google' },
  });

  if (!account || !account.accessToken) {
    throw new Error('Google Calendar not connected');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL
  );

  oauth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken || undefined,
  });

  // Auto-refresh if expired
  if (account.expiresAt && account.expiresAt < new Date()) {
    if (!account.refreshToken) {
      throw new Error('Token expired and no refresh token available');
    }
    const { credentials } = await oauth2Client.refreshAccessToken();
    await prisma.calendarAccount.update({
      where: { id: account.id },
      data: {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || account.refreshToken,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
      },
    });
    oauth2Client.setCredentials(credentials);
  }

  return { oauth2Client, calendarAccount: account };
}

export async function ensureOneHubCalendar(userId: string): Promise<string> {
  const { oauth2Client, calendarAccount } = await getGoogleClient(userId);

  if (calendarAccount.googleCalendarId) {
    return calendarAccount.googleCalendarId;
  }

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Check if OneHub calendar already exists
  const calendars = await calendar.calendarList.list();
  const existing = calendars.data.items?.find(c => c.summary === 'OneHub');

  if (existing && existing.id) {
    await prisma.calendarAccount.update({
      where: { id: calendarAccount.id },
      data: { googleCalendarId: existing.id },
    });
    return existing.id;
  }

  // Create new OneHub calendar
  const created = await calendar.calendars.insert({
    requestBody: {
      summary: 'OneHub',
      description: 'OneHub event planning calendar',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  if (!created.data.id) {
    throw new Error('Failed to create OneHub calendar');
  }

  await prisma.calendarAccount.update({
    where: { id: calendarAccount.id },
    data: { googleCalendarId: created.data.id },
  });

  return created.data.id;
}

export async function upsertGoogleEvent(
  userId: string,
  calendarId: string,
  mappingKey: string,
  payload: {
    summary: string;
    description?: string;
    start: { date?: string; dateTime?: string; timeZone?: string };
    end: { date?: string; dateTime?: string; timeZone?: string };
    colorId?: string;
  }
): Promise<string> {
  const { oauth2Client } = await getGoogleClient(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Check for existing mapping
  const [entityType, entityId] = mappingKey.split(':');
  if (!entityType || !entityId) {
    throw new Error('Invalid mapping key format');
  }
  const mapping = await prisma.calendarMapping.findUnique({
    where: { userId_entityType_entityId: { userId, entityType, entityId } },
  });

  if (mapping && mapping.googleEventId) {
    // Update existing event
    const updated = await calendar.events.update({
      calendarId,
      eventId: mapping.googleEventId,
      requestBody: payload,
    });
    await prisma.calendarMapping.update({
      where: { id: mapping.id },
      data: { lastSyncedAt: new Date() },
    });
    return updated.data.id || mapping.googleEventId;
  }

  // Create new event
  const created = await calendar.events.insert({
    calendarId,
    requestBody: payload,
  });

  if (!created.data.id) {
    throw new Error('Failed to create Google Calendar event');
  }

  // Create mapping
  const account = await prisma.calendarAccount.findFirst({
    where: { userId, provider: 'google' },
  });

  if (account && created.data.id) {
    await prisma.calendarMapping.create({
      data: {
        userId,
        calendarAccountId: account.id,
        entityType,
        entityId,
        googleEventId: created.data.id,
        googleCalendarId: calendarId,
      },
    });
  }

  return created.data.id;
}

export async function listOverlayEvents(
  userId: string,
  timeMin: string,
  timeMax: string
): Promise<unknown[]> {
  const { oauth2Client } = await getGoogleClient(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    maxResults: 250,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return response.data.items || [];
}

export async function deleteGoogleEvent(
  userId: string,
  calendarId: string,
  googleEventId: string
): Promise<void> {
  const { oauth2Client } = await getGoogleClient(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  await calendar.events.delete({
    calendarId,
    eventId: googleEventId,
  });
}

