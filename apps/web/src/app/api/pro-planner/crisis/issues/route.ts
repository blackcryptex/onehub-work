import { NextRequest, NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { crisisRouter } from "@/server/routers/crisis";

export async function POST(request: NextRequest) {
  try {
    const input = await request.json();
    const result = await crisisRouter.createCaller({}).create(input);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof TRPCError) {
      const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "FORBIDDEN" ? 403 : error.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid crisis issue request", details: error.issues }, { status: 400 });
    }
    console.error("Error creating crisis issue:", error);
    return NextResponse.json({ error: "Failed to create crisis issue" }, { status: 500 });
  }
}
