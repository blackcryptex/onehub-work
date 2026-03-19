import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ensureOneHubCalendar } from '@/lib/google.calendar';

export async function POST(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const calendarId = await ensureOneHubCalendar(session.user.id);

    return NextResponse.json({ ok: true, calendarId });
  } catch (error: unknown) {
    console.error('Create calendar error:', error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Failed to create calendar';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

