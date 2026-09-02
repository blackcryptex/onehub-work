import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isGoogleAuthConfigured } from '@/lib/google.auth';

export async function POST(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isGoogleAuthConfigured()) {
      return NextResponse.json({ error: 'Google Calendar is not configured' }, { status: 503 });
    }

    // Return redirect URL for client-side navigation
    return NextResponse.json({ 
      ok: true, 
      redirectUrl: '/api/auth/signin/google?callbackUrl=/api/google/callback' 
    });
  } catch {
    console.error('Google connect error');
    return NextResponse.json({ error: 'Failed to connect' }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isGoogleAuthConfigured()) {
      return NextResponse.json({ connected: false, configured: false });
    }

    const { prisma } = await import('@/lib/prisma');
    const account = await prisma.calendarAccount.findFirst({
      where: { userId: session.user.id, provider: 'google' },
    });

    return NextResponse.json({
      connected: Boolean(account?.accessToken),
      configured: true,
      calendarId: account?.googleCalendarId || undefined,
      email: account?.email || undefined,
    });
  } catch {
    console.error('Google status error');
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}

