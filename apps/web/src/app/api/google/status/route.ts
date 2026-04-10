import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      connected: !!account,
      calendarId: account?.googleCalendarId || undefined,
      email: account?.email || undefined,
      overlay: account?.syncState?.syncMode === 'overlay',
    });
  } catch (error) {
    console.error('Google status error:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
