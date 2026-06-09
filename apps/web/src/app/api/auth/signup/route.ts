import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { validatePublicSignupRole } from "@/lib/signup-roles";

// Dynamically import bcryptjs
async function hashPassword(password: string): Promise<string> {
  const bcryptjsModule = await import("bcryptjs");
  const bcrypt = bcryptjsModule.default || bcryptjsModule;
  return bcrypt.hash(password, 10);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role } = body;
    const roleValidation = validatePublicSignupRole(role);

    if (!roleValidation.ok) {
      return NextResponse.json({ error: roleValidation.error }, { status: 400 });
    }

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: roleValidation.role,
      },
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}

