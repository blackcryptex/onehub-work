import { NextResponse } from "next/server";

/**
 * Legacy duplicate signing endpoint.
 * Canonical product signing is POST /api/contracts/[id]/sign with acceptance proof.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Use /api/contracts/[id]/sign" },
    { status: 410 }
  );
}
