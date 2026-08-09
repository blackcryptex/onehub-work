import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checklistRouter } from "@/server/routers/checklist";

const checklistToggleSchema = z.object({ done: z.boolean() });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const resolvedParams = await params;
  try {
    const parsed = checklistToggleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const item = await checklistRouter.createCaller({}).toggleItem({ id: resolvedParams.itemId, done: parsed.data.done });
    return NextResponse.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update persisted checklist item";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
