import { getCurrentUser } from "@/lib/auth-helpers";
import { dashboard, vaultIndex } from "@/lib/routes";
import { redirect } from "next/navigation";

/**
 * Legacy compatibility redirect: /app/proposals → canonical in-app commercial surface.
 */
export default async function ProposalsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin?redirect=/app/proposals");
  }

  if (user.role === "VENDOR" || user.role === "VENUE") {
    redirect(dashboard(user.role) as never);
  }

  redirect(vaultIndex(user.role) as never);
}

