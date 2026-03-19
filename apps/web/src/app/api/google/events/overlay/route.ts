import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listOverlayEvents } from '@/lib/google.calendar';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get('timeMin');
    const timeMax = searchParams.get('timeMax');

    if (!timeMin || !timeMax) {
      return NextResponse.json({ error: 'timeMin and timeMax required' }, { status: 400 });
    }

    const events = await listOverlayEvents(session.user.id, timeMin, timeMax);

    return NextResponse.json({ events });
  } catch (error: unknown) {
    console.error('Overlay events error:', error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Failed to fetch events';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

