import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pushOneHubCalendarEvents } from '@/lib/google.calendar';

export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgs = await prisma.organization.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
      select: { id: true },
    });
    const orgIds = orgs.map((org) => org.id);

    const events = await prisma.calendarEvent.findMany({
      where: { orgId: { in: orgIds } },
      orderBy: { startAt: 'asc' },
      take: 250,
    });

    const result = await pushOneHubCalendarEvents(session.user.id, events);

    return NextResponse.json({ ok: result.failed === 0, ...result });
  } catch (error: unknown) {
    console.error('Sync push error:', error);
    const message = error instanceof Error && error.message ? error.message : 'Failed to sync';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
