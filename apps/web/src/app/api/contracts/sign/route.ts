import { NextResponse } from "next/server";

/**
 * POST /api/contracts/sign
 *
 * Deprecated legacy signing surface. Contract signing must use the canonical
 * /api/contracts/[id]/sign route so signer identity, acceptance proof,
 * signer-slot matching, and contract status transitions stay in one guarded path.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Legacy contract signing endpoint is disabled. Use /api/contracts/[id]/sign with acceptance proof.",
    },
    { status: 410 }
  );
}
