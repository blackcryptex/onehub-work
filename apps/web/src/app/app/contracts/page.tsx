import { getCurrentUser } from "@/lib/auth-helpers";
import { dashboard, vaultIndex } from "@/lib/routes";
import { redirect } from "next/navigation";

/**
 * Legacy compatibility redirect: /app/contracts → canonical in-app commercial surface.
 */
export default async function ContractsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin?redirect=/app/contracts");
  }

  if (user.role === "VENDOR" || user.role === "VENUE") {
    redirect(dashboard(user.role) as never);
  }

  redirect(vaultIndex(user.role) as never);
}

