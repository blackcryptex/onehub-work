import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { taskRouter } from "@/server/routers/task";

const createTaskSchema = z.object({
  eventId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  dueAt: z.coerce.date().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
});

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get("eventId");
    const status = request.nextUrl.searchParams.get("status") || undefined;
    const parsedStatus = z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]).optional().safeParse(status);
    if (!parsedStatus.success) {
      return NextResponse.json({ error: "Validation failed", details: parsedStatus.error.flatten() }, { status: 400 });
    }

    const caller = taskRouter.createCaller({});
    const tasks = eventId
      ? await caller.listByEvent({ eventId, status: parsedStatus.data })
      : await caller.listMyAssigned({ status: parsedStatus.data });
    return NextResponse.json(tasks);
  } catch (error) {
    return errorResponse(error, "Failed to load persisted tasks");
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = createTaskSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const task = await taskRouter.createCaller({}).create(parsed.data);
    return NextResponse.json(task);
  } catch (error) {
    return errorResponse(error, "Failed to create persisted task");
  }
}
