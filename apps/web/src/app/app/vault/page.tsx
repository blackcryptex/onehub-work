import EventVaultPage from "@/app/(app)/vault/page";
import { getCurrentUser } from "@/lib/auth-helpers";
import { vaultIndex } from "@/lib/routes";
import { redirect } from "next/navigation";

// Keep /app/vault available as a legacy route, but normalize planner users before
// rendering so DIY/PRO planners never keep a mixed legacy/canonical vault URL.
export default async function LegacyAppVaultPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin?redirect=/app/vault");
  }

  if (user.role === "DIY_PLANNER" || user.role === "PRO_PLANNER") {
    redirect(vaultIndex(user.role) as never);
  }

  return EventVaultPage();
}

