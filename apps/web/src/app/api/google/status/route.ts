import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isGoogleAuthConfigured } from '@/lib/google.auth';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isGoogleAuthConfigured()) {
      return NextResponse.json({ connected: false, configured: false });
    }

    const account = await prisma.calendarAccount.findFirst({
      where: { userId: session.user.id, provider: 'google' },
      include: { 
        syncState: {
          select: {
            syncMode: true,
          },
        },
      },
    });

    return NextResponse.json({
      connected: Boolean(account?.accessToken),
      configured: true,
      calendarId: account?.googleCalendarId || undefined,
      email: account?.email || undefined,
      overlay: account?.syncState?.syncMode === 'overlay',
    });
  } catch {
    console.error('Google status error');
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
