import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureOneHubCalendar, upsertGoogleEvent } from '@/lib/google.calendar';
import { getMappingKey, eventToGoogleEvent, taskToGoogleEvent, milestoneToGoogleEvent } from '@/lib/calendar.mapping';
import { EventItem as EventItemExtended, Task as DomainTask, Milestone as DomainMilestone } from '@/lib/types.event';

type PrismaEventWithRelations = Awaited<ReturnType<typeof prisma.event.findMany<{
  include: {
    tasks: true;
    milestones: true;
  };
}>>>[number];

function mapPrismaTaskToDomain(task: PrismaEventWithRelations['tasks'][number], fallbackDate: Date): DomainTask {
  const dueAt = task.dueAt ?? fallbackDate;
  const priorityMap: Record<string, DomainTask['priority']> = {
    LOW: 'low',
    MEDIUM: 'med',
    HIGH: 'high',
    CRITICAL: 'high',
  };
  return {
    id: task.id,
    title: task.title,
    due: dueAt.toISOString(),
    done: task.status === 'DONE',
    assignee: task.assigneeId ?? undefined,
    priority: priorityMap[task.priority] ?? undefined,
    linkedTo: null,
    linkedId: undefined,
    checklist: undefined,
  };
}

function mapPrismaMilestoneToDomain(milestone: PrismaEventWithRelations['milestones'][number]): DomainMilestone {
  return {
    id: milestone.id,
    title: milestone.title,
    targetDate: milestone.dueAt.toISOString(),
    status: milestone.done ? 'achieved' : 'planned',
    critical: false,
    linkedTaskIds: [],
  };
}

function mapPrismaEventToDomain(event: PrismaEventWithRelations): EventItemExtended {
  const tasks = (event.tasks || []).map((task) => mapPrismaTaskToDomain(task, event.startAt));
  const milestones = (event.milestones || []).map(mapPrismaMilestoneToDomain);
  const total = tasks.length + milestones.length;
  const completed =
    tasks.filter((task) => task.done).length +
    milestones.filter((milestone) => milestone.status === 'achieved').length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    id: event.id,
    type: event.eventTypeRaw?.toLowerCase() as EventItemExtended['type'],
    name: event.name,
    date: event.startAt.toISOString(),
    location: event.venueCity ?? undefined,
    city: event.venueCity ?? undefined,
    description: event.description ?? undefined,
    progress,
    budget: undefined,
    vendors: [],
    proposals: [],
    contracts: [],
    guests: [],
    tasks,
    milestones,
  };
}

export async function POST(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const calendarId = await ensureOneHubCalendar(session.user.id);

    // Get all events for this user
    const dbEvents = await prisma.event.findMany({
      where: { createdById: session.user.id },
      include: { tasks: true, milestones: true },
    });
    
    // Convert DB events to EventItem format
    const events: EventItemExtended[] = dbEvents.map((event) => mapPrismaEventToDomain(event));

    const synced: string[] = [];

    // Sync events
    for (const event of events) {
      const mappingKey = getMappingKey('event', event.id);
      const payload = eventToGoogleEvent(event);
      await upsertGoogleEvent(session.user.id, calendarId, mappingKey, payload);
      synced.push(`event:${event.id}`);
    }

    // Sync tasks from all events
    for (const event of events) {
      for (const task of event.tasks || []) {
        const mappingKey = getMappingKey('task', task.id);
        const payload = taskToGoogleEvent(task, event.name);
        await upsertGoogleEvent(session.user.id, calendarId, mappingKey, payload);
        synced.push(`task:${task.id}`);
      }
    }

    // Sync milestones from all events
    for (const event of events) {
      for (const milestone of event.milestones || []) {
        const mappingKey = getMappingKey('milestone', milestone.id);
        const payload = milestoneToGoogleEvent(milestone, event.name);
        await upsertGoogleEvent(session.user.id, calendarId, mappingKey, payload);
        synced.push(`milestone:${milestone.id}`);
      }
    }

    return NextResponse.json({ ok: true, synced: synced.length });
  } catch (error: unknown) {
    console.error('Sync push error:', error);
    const message =
      error instanceof Error && error.message ? error.message : 'Failed to sync';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

