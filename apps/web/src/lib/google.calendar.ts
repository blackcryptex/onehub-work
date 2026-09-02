// lib/google.calendar.ts
import { google } from 'googleapis';
import { prisma } from './prisma';
import { getGoogleOAuthCredentials } from './google.auth';

type GoogleEventPayload = {
  summary: string;
  description?: string;
  location?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  colorId?: string;
  extendedProperties?: { private?: Record<string, string> };
};

type OneHubCalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
};

function getOAuthConfig() {
  const { clientId, clientSecret } = getGoogleOAuthCredentials();
  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL;

  if (!clientId || !clientSecret || !baseUrl) {
    throw new Error('Google Calendar is not configured for this environment');
  }

  return { clientId, clientSecret, redirectUri: `${baseUrl.replace(/\/$/, '')}/api/auth/callback/google` };
}

export async function clearGoogleCalendarTokens(userId: string) {
  await prisma.calendarAccount.updateMany({
    where: { userId, provider: 'google' },
    data: {
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      googleCalendarId: null,
    },
  });
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function oneHubCalendarEventToGoogleEvent(event: OneHubCalendarEvent): GoogleEventPayload {
  const privateProperties = {
    onehubEntityType: 'calendarEvent',
    onehubEntityId: event.id,
  };

  if (event.allDay) {
    return {
      summary: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
      start: { date: isoDate(event.startAt) },
      end: { date: isoDate(event.endAt) },
      colorId: '9',
      extendedProperties: { private: privateProperties },
    };
  }

  return {
    summary: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    start: { dateTime: event.startAt.toISOString() },
    end: { dateTime: event.endAt.toISOString() },
    colorId: '9',
    extendedProperties: { private: privateProperties },
  };
}

export async function getGoogleClient(userId: string) {
  const account = await prisma.calendarAccount.findFirst({
    where: { userId, provider: 'google' },
  });

  if (!account || !account.accessToken) {
    throw new Error('Google Calendar not connected');
  }

  const oauth = getOAuthConfig();
  const oauth2Client = new google.auth.OAuth2(oauth.clientId, oauth.clientSecret, oauth.redirectUri);

  oauth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken || undefined,
    expiry_date: account.expiresAt?.getTime(),
  });

  if (account.expiresAt && account.expiresAt < new Date(Date.now() + 60_000)) {
    if (!account.refreshToken) {
      await clearGoogleCalendarTokens(userId);
      throw new Error('Google Calendar token expired; reconnect Google Calendar');
    }
    let credentials: {
      access_token?: string | null;
      refresh_token?: string | null;
      expiry_date?: number | null;
    };
    try {
      ({ credentials } = await oauth2Client.refreshAccessToken());
    } catch {
      await clearGoogleCalendarTokens(userId);
      throw new Error('Google Calendar token refresh failed; reconnect Google Calendar');
    }

    if (!credentials.access_token) {
      await clearGoogleCalendarTokens(userId);
      throw new Error('Google Calendar token refresh failed; reconnect Google Calendar');
    }

    await prisma.calendarAccount.update({
      where: { id: account.id },
      data: {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || account.refreshToken,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : account.expiresAt,
      },
    });
    oauth2Client.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || account.refreshToken || undefined,
      expiry_date: credentials.expiry_date || account.expiresAt?.getTime(),
    });
  }

  return { oauth2Client, calendarAccount: account };
}

export async function ensureOneHubCalendar(userId: string): Promise<string> {
  const { oauth2Client, calendarAccount } = await getGoogleClient(userId);

  if (calendarAccount.googleCalendarId) {
    return calendarAccount.googleCalendarId;
  }

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const calendars = await calendar.calendarList.list();
  const existing = calendars.data.items?.find(c => c.summary === 'OneHub');

  if (existing?.id) {
    await prisma.calendarAccount.update({
      where: { id: calendarAccount.id },
      data: { googleCalendarId: existing.id },
    });
    return existing.id;
  }

  const created = await calendar.calendars.insert({
    requestBody: {
      summary: 'OneHub',
      description: 'OneHub event planning calendar',
      timeZone: 'UTC',
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
  payload: GoogleEventPayload
): Promise<string> {
  const { oauth2Client } = await getGoogleClient(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const [entityType, entityId] = mappingKey.split(':');
  if (!entityType || !entityId) {
    throw new Error('Invalid mapping key format');
  }
  const mapping = await prisma.calendarMapping.findUnique({
    where: { userId_entityType_entityId: { userId, entityType, entityId } },
  });

  if (mapping?.googleEventId) {
    try {
      const updated = await calendar.events.update({
        calendarId: mapping.googleCalendarId || calendarId,
        eventId: mapping.googleEventId,
        requestBody: payload,
      });
      await prisma.calendarMapping.update({
        where: { id: mapping.id },
        data: { lastSyncedAt: new Date() },
      });
      return updated.data.id || mapping.googleEventId;
    } catch (error: unknown) {
      const status = (error as { code?: number; status?: number }).code || (error as { status?: number }).status;
      if (status !== 404 && status !== 410) throw error;
      await prisma.calendarMapping.delete({ where: { id: mapping.id } });
    }
  }

  const created = await calendar.events.insert({
    calendarId,
    requestBody: payload,
  });

  if (!created.data.id) {
    throw new Error('Failed to create Google Calendar event');
  }

  const account = await prisma.calendarAccount.findFirst({
    where: { userId, provider: 'google' },
  });

  if (account) {
    await prisma.calendarMapping.upsert({
      where: { userId_entityType_entityId: { userId, entityType, entityId } },
      update: {
        calendarAccountId: account.id,
        googleEventId: created.data.id,
        googleCalendarId: calendarId,
        lastSyncedAt: new Date(),
      },
      create: {
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

export async function syncOneHubCalendarEventToGoogle(userId: string, event: OneHubCalendarEvent) {
  const calendarId = await ensureOneHubCalendar(userId);
  return upsertGoogleEvent(userId, calendarId, `calendarEvent:${event.id}`, oneHubCalendarEventToGoogleEvent(event));
}

export async function pushOneHubCalendarEvents(userId: string, events: OneHubCalendarEvent[]) {
  const calendarId = await ensureOneHubCalendar(userId);
  const results = { synced: 0, failed: 0, errors: [] as string[] };

  for (const event of events) {
    try {
      await upsertGoogleEvent(userId, calendarId, `calendarEvent:${event.id}`, oneHubCalendarEventToGoogleEvent(event));
      results.synced += 1;
    } catch (error: unknown) {
      results.failed += 1;
      results.errors.push(error instanceof Error ? error.message : 'Google rejected a calendar event');
    }
  }

  return results;
}

export async function pullMappedGoogleCalendarEvents(userId: string) {
  const { oauth2Client, calendarAccount } = await getGoogleClient(userId);
  const calendarId = calendarAccount.googleCalendarId || await ensureOneHubCalendar(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const mappings = await prisma.calendarMapping.findMany({
    where: { userId, entityType: 'calendarEvent', googleCalendarId: calendarId },
  });
  const results = { updated: 0, missing: 0, failed: 0, errors: [] as string[] };

  for (const mapping of mappings) {
    try {
      const response = await calendar.events.get({ calendarId, eventId: mapping.googleEventId });
      const googleEvent = response.data;
      if (googleEvent.status === 'cancelled') {
        results.missing += 1;
        continue;
      }
      const startValue = googleEvent.start?.dateTime || googleEvent.start?.date;
      const endValue = googleEvent.end?.dateTime || googleEvent.end?.date || startValue;
      if (!startValue || !endValue) continue;

      await prisma.calendarEvent.update({
        where: { id: mapping.entityId },
        data: {
          title: googleEvent.summary || 'Untitled Google event',
          description: googleEvent.description || null,
          location: googleEvent.location || null,
          startAt: new Date(startValue),
          endAt: new Date(endValue),
          allDay: Boolean(googleEvent.start?.date),
          source: 'google-sync',
        },
      });
      await prisma.calendarMapping.update({ where: { id: mapping.id }, data: { lastSyncedAt: new Date() } });
      results.updated += 1;
    } catch (error: unknown) {
      const status = (error as { code?: number; status?: number }).code || (error as { status?: number }).status;
      if (status === 404 || status === 410) {
        results.missing += 1;
      } else {
        results.failed += 1;
        results.errors.push(error instanceof Error ? error.message : 'Google pull failed');
      }
    }
  }

  return results;
}

export async function listOverlayEvents(
  userId: string,
  timeMin: string,
  timeMax: string
): Promise<unknown[]> {
  const { oauth2Client, calendarAccount } = await getGoogleClient(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendar.events.list({
    calendarId: calendarAccount.googleCalendarId || 'primary',
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
  await calendar.events.delete({ calendarId, eventId: googleEventId });
}
