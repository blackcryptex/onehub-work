import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/server/db';

export async function POST(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return redirect URL for client-side navigation
    return NextResponse.json({ 
      ok: true, 
      redirectUrl: '/api/auth/signin/google?callbackUrl=/api/google/callback' 
    });
  } catch (error) {
    console.error('Google connect error:', error);
    return NextResponse.json({ error: 'Failed to connect' }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const account = await db.calendarAccount.findFirst({
      where: { userId: session.user.id, provider: 'google' },
    });

    return NextResponse.json({
      connected: !!account,
      calendarId: account?.googleCalendarId || undefined,
      email: account?.email || undefined,
    });
  } catch (error) {
    console.error('Google status error:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}

