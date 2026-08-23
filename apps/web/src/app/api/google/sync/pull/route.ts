import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { pullMappedGoogleCalendarEvents } from '@/lib/google.calendar';

export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pullMappedGoogleCalendarEvents(session.user.id);
    return NextResponse.json({ ok: result.failed === 0, ...result });
  } catch (error: unknown) {
    console.error('Sync pull error:', error);
    const message = error instanceof Error && error.message ? error.message : 'Failed to pull Google Calendar changes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
