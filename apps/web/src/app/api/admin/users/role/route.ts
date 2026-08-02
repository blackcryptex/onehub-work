import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const FOUNDER_ADMIN_EMAIL = "marlon.smith35@gmail.com";

const roleUpdateSchema = z.object({
  userId: z.string().min(1),
  role: z.enum([
    "DIY_PLANNER",
    "PRO_PLANNER",
    "VENDOR",
    "VENUE",
    "CLIENT",
    "ADMIN",
    "EVENT_DREAMER",
  ]),
});

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function isFounder(user: { email?: string | null; role?: string | null } | null) {
  return user?.role === "ADMIN" && normalizeEmail(user.email) === FOUNDER_ADMIN_EMAIL;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();

  if (!isFounder(actor)) {
    return NextResponse.json({ error: "Founder authorization required" }, { status: 403 });
  }

  const input = roleUpdateSchema.safeParse(await request.json());
  if (!input.success) {
    return NextResponse.json({ error: "Invalid role update request" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: input.data.userId },
    data: { role: input.data.role },
    select: { id: true, email: true, role: true },
  });

  return NextResponse.json({ user });
}
