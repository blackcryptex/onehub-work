import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { taskRouter } from "@/server/routers/task";

const updateTaskSchema = z.object({
  data: z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    assigneeId: z.string().optional(),
    dueAt: z.coerce.date().optional(),
  }),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const resolvedParams = await params;
  try {
    const parsed = updateTaskSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const task = await taskRouter.createCaller({}).update({ id: resolvedParams.taskId, data: parsed.data.data });
    return NextResponse.json(task);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update persisted task";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
