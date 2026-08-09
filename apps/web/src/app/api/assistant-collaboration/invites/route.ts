import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inviteRouter } from "@/server/routers/invite";

const inviteSchema = z.object({ orgId: z.string().min(1), email: z.string().email() });

export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get("orgId");
    const parsed = z.object({ orgId: z.string().min(1) }).safeParse({ orgId });
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const invites = await inviteRouter.createCaller({}).getInvites(parsed.data);
    return NextResponse.json(invites);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load assistant invites";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = inviteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const invite = await inviteRouter.createCaller({}).createAssistantInvite(parsed.data);
    return NextResponse.json(invite);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create assistant invite";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
