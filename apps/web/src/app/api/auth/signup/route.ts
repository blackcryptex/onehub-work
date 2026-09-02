import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

const PUBLIC_SIGNUP_ROLES = new Set<Role>([
  "DIY_PLANNER",
  "PRO_PLANNER",
  "VENDOR",
  "VENUE",
  "CLIENT",
  "EVENT_DREAMER",
]);

// Dynamically import bcryptjs
async function hashPassword(password: string): Promise<string> {
  const bcryptjsModule = await import("bcryptjs");
  const bcrypt = bcryptjsModule.default || bcryptjsModule;
  return bcrypt.hash(password, 10);
}

function normalizeEmail(email: unknown) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function publicSignupRole(role: unknown): Role {
  return typeof role === "string" && PUBLIC_SIGNUP_ROLES.has(role as Role)
    ? (role as Role)
    : "DIY_PLANNER";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, name, role = "DIY_PLANNER", inviteToken } = body;
    const email = normalizeEmail(body.email);
    const safeRole = publicSignupRole(role);

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
    }

    const invite = typeof inviteToken === "string" && inviteToken.trim()
      ? await prisma.invite.findUnique({ where: { token: inviteToken.trim() } })
      : null;

    if (inviteToken && !invite) {
      return NextResponse.json({ error: "This invite link is invalid. Please ask your team admin for a new invitation." }, { status: 400 });
    }

    if (invite) {
      if (invite.accepted) {
        return NextResponse.json({ error: "This invite has already been used. Please sign in or ask your team admin for a new invitation." }, { status: 400 });
      }

      if (invite.expiresAt < new Date()) {
        return NextResponse.json({ error: "This invite has expired. Please ask your team admin for a new invitation." }, { status: 400 });
      }

      if (normalizeEmail(invite.email) !== email) {
        return NextResponse.json({ error: "This invite was sent to a different email address." }, { status: 403 });
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: safeRole,
        },
      });

      if (invite) {
        const existingMembership = await tx.membership.findUnique({
          where: { userId_orgId: { userId: createdUser.id, orgId: invite.orgId } },
        });

        if (existingMembership) {
          throw new Error("INVITE_MEMBERSHIP_EXISTS");
        }

        await tx.membership.create({
          data: { userId: createdUser.id, orgId: invite.orgId, role: invite.role },
        });

        const accepted = await tx.invite.updateMany({
          where: { id: invite.id, accepted: false },
          data: { accepted: true },
        });

        if (accepted.count !== 1) {
          throw new Error("INVITE_ALREADY_ACCEPTED");
        }
      }

      return createdUser;
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    if (error instanceof Error && error.message === "INVITE_MEMBERSHIP_EXISTS") {
      return NextResponse.json({ error: "This account is already a member of the invited organization." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "INVITE_ALREADY_ACCEPTED") {
      return NextResponse.json({ error: "This invite has already been used. Please ask your team admin for a new invitation." }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}

