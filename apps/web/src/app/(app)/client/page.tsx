import Link from "next/link";
import { redirect } from "next/navigation";

import { RoleOnboardingPanel } from "@/components/onboarding/RoleOnboardingPanel";
import { Card, Button } from "@/components/ui";
import { auth } from "@/lib/auth";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { dashboard } from "@/lib/routes";

export default async function ClientLandingPage() {
  const session = await auth();
  const sessionUser = session?.user;
  const dbUser = sessionUser ? await getCurrentUser() : null;

  if (!sessionUser && !dbUser) {
    redirect("/signin?callbackUrl=/client");
  }

  const user = dbUser || {
    id: sessionUser!.id,
    email: sessionUser!.email,
    name: sessionUser!.name,
    role: sessionUser!.role,
  };

  if (isAdmin(user)) {
    redirect(dashboard("ADMIN") as any);
  }

  if (user.role !== "CLIENT") {
    redirect(dashboard(user.role) as any);
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">Client portal</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Your event access is invite-only</h1>
        <p className="mt-3 text-slate-600">
          Clients join OneHub through a planner invitation or an event-linked share. Use the event link from your planner to open the scoped client-safe event summary.
        </p>
      </div>

      <RoleOnboardingPanel role="CLIENT" source="client-portal" />

      <Card className="space-y-3 p-6">
        <h2 className="text-lg font-semibold text-slate-900">No public client signup path</h2>
        <p className="text-sm text-slate-600">
          For MVP, client accounts are not broad self-service planner accounts. They can view only explicitly shared event information, approvals, payments, and messages tied to an invitation.
        </p>
        <Button asChild variant="secondary">
          <Link href="/signin">Use a different account</Link>
        </Button>
      </Card>
    </main>
  );
}
