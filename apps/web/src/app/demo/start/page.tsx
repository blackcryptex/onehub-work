import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * GET /demo/start?role=pro|diy
 * Role-aware redirect to canonical demo vault route
 */
export default async function DemoStartPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }> | { role?: string };
}) {
  // Handle both Next.js 13-14 (object) and 15+ (Promise) patterns
  const params = searchParams instanceof Promise ? await searchParams : searchParams;
  // Default to pro if role missing or invalid
  const role = params.role === "diy" ? "diy" : "pro";

  // Check if demo event exists (preflight check)
  try {
    const demoEvent = await prisma.event.findUnique({
      where: { slug: "demo-wedding" },
      select: { id: true },
    });

    if (!demoEvent) {
      // Seed not OK - redirect back with error
      redirect("/demo?error=seed");
    }
  } catch (error) {
    console.error("[demo/start] Error checking seed:", error);
    // On error, redirect back (safer than crashing)
    redirect("/demo?error=seed");
  }

  // Redirect to role-specific vault route
  if (role === "diy") {
    redirect("/diy-planner/vault/demo-wedding");
  } else {
    redirect("/pro/planner/vault/demo-wedding");
  }
}

