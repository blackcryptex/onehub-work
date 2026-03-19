// lib/calendar.mapping.ts
import { EventItem, Task, Milestone } from './types.event';

export function getMappingKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

export function getEventColorId(type: 'event'|'task'|'milestone'|'payment'|'other'): string {
  const colorMap: Record<string, string> = {
    event: '1',      // primary (lavender)
    task: '9',       // blue
    milestone: '3',  // purple
    payment: '6',    // orange/amber
    other: '8',      // grey
  };
  return colorMap[type] || '8';
}

export function eventToGoogleEvent(event: EventItem): {
  summary: string;
  description: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  colorId: string;
} {
  const date = new Date(event.date);
  const dateStr = date.toISOString().split('T')[0];
  
  return {
    summary: `[Event] ${event.name}`,
    description: `OneHub Event: ${event.name}\n\n${event.description || ''}\n\nView in OneHub: ${process.env.NEXTAUTH_URL}/diy-planner?event=${event.id}`,
    start: { date: dateStr },
    end: { date: dateStr },
    colorId: getEventColorId('event'),
  };
}

export function taskToGoogleEvent(task: Task, eventName?: string): {
  summary: string;
  description: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  colorId: string;
} {
  const due = new Date(task.due);
  const dateStr = due.toISOString().split('T')[0];
  const prefix = task.done ? '✓ ' : '';
  
  return {
    summary: `${prefix}[Task] ${task.title}`,
    description: `OneHub Task: ${task.title}\n\n${eventName ? `Event: ${eventName}\n` : ''}${task.assignee ? `Assignee: ${task.assignee}\n` : ''}Due: ${due.toLocaleDateString()}\n\nView in OneHub: ${process.env.NEXTAUTH_URL}/diy-planner?event=${task.linkedId || ''}`,
    start: { date: dateStr },
    end: { date: dateStr },
    colorId: getEventColorId('task'),
  };
}

export function milestoneToGoogleEvent(milestone: Milestone, eventName?: string): {
  summary: string;
  description: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  colorId: string;
} {
  const targetDate = new Date(milestone.targetDate);
  const dateStr = targetDate.toISOString().split('T')[0];
  
  return {
    summary: `[Milestone] ${milestone.title}`,
    description: `OneHub Milestone: ${milestone.title}\n\n${eventName ? `Event: ${eventName}\n` : ''}Status: ${milestone.status || 'planned'}\nTarget: ${targetDate.toLocaleDateString()}\n\nView in OneHub: ${process.env.NEXTAUTH_URL}/diy-planner?event=${milestone.linkedTaskIds?.[0] || ''}`,
    start: { date: dateStr },
    end: { date: dateStr },
    colorId: getEventColorId('milestone'),
  };
}

export function paymentToGoogleEvent(payment: { id: string; title: string; due: string; amount?: number; overdue?: boolean }, eventName?: string): {
  summary: string;
  description: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  colorId: string;
} {
  const due = new Date(payment.due);
  const dateStr = due.toISOString().split('T')[0];
  
  return {
    summary: `[Payment] ${payment.title}${payment.amount ? ` - $${payment.amount.toLocaleString()}` : ''}`,
    description: `OneHub Payment: ${payment.title}\n\n${eventName ? `Event: ${eventName}\n` : ''}Due: ${due.toLocaleDateString()}\n${payment.amount ? `Amount: $${payment.amount.toLocaleString()}\n` : ''}\nView in OneHub: ${process.env.NEXTAUTH_URL}/diy-planner`,
    start: { date: dateStr },
    end: { date: dateStr },
    colorId: payment.overdue ? '11' : getEventColorId('payment'), // red if overdue
  };
}

