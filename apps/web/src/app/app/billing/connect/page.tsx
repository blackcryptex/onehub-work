import { Card, Button } from "@onehub/ui";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { appRouter } from "@/server/router";
import { redirect } from "next/navigation";

type BillingConnectPageProps = {
  searchParams?: {
    success?: string;
  };
};

async function getEligibleSellerOrg(userId: string) {
  return prisma.organization.findFirst({
    where: {
      type: { in: ["VENDOR", "VENUE"] },
      members: {
        some: {
          userId,
          role: { in: ["OWNER", "ADMIN"] },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      stripeConnectAccountId: true,
    },
  });
}

export default async function BillingConnectPage({ searchParams }: BillingConnectPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin?redirect=/app/billing/connect");
  }

  const org = await getEligibleSellerOrg(user.id);

  async function startOnboarding() {
    "use server";

    const actionUser = await getCurrentUser();
    if (!actionUser) {
      redirect("/signin?redirect=/app/billing/connect");
    }

    const eligibleOrg = await getEligibleSellerOrg(actionUser.id);
    if (!eligibleOrg) {
      redirect("/app");
    }

    const caller = appRouter.createCaller({});
    const result = await caller.billing.connectOnboard({ orgId: eligibleOrg.id });
    redirect(result.url);
  }

  if (!org) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Stripe Connect Setup</h1>
        <Card className="p-4">
          <p className="text-sm text-slate-600">
            You need to be an admin or owner of a vendor or venue organization to connect Stripe.
          </p>
        </Card>
      </div>
    );
  }

  const isConnected = Boolean(org.stripeConnectAccountId);
  const success = searchParams?.success === "true";

  const caller = appRouter.createCaller({});
  const connectStatus = org.stripeConnectAccountId
    ? await caller.billing.connectStatus({ orgId: org.id })
    : {
        connected: false,
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      };

  const payoutReady = Boolean(connectStatus.chargesEnabled && connectStatus.payoutsEnabled);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Stripe Connect Setup</h1>
      <Card className="p-4 space-y-4">
        <div className="space-y-1">
          <p className="text-sm text-slate-600">Connect your Stripe account to receive payments.</p>
          <p className="text-xs text-slate-500">
            Organization: {org.name} ({org.type === "VENUE" ? "Venue" : "Vendor"})
          </p>
          {success ? (
            <p className="text-sm text-emerald-600">
              Stripe returned successfully. Seller payout readiness was refreshed from Stripe.
            </p>
          ) : null}
          {isConnected ? (
            <div className="space-y-1 text-xs text-slate-500">
              <p>Stripe account saved: {connectStatus.accountId ?? org.stripeConnectAccountId}</p>
              <p>Details submitted: {connectStatus.detailsSubmitted ? "Yes" : "No"}</p>
              <p>Charges enabled: {connectStatus.chargesEnabled ? "Yes" : "No"}</p>
              <p>Payouts enabled: {connectStatus.payoutsEnabled ? "Yes" : "No"}</p>
              <p className={payoutReady ? "text-emerald-600" : "text-amber-600"}>
                Seller payout readiness: {payoutReady ? "Ready" : "More Stripe onboarding required"}
              </p>
            </div>
          ) : null}
        </div>

        <form action={startOnboarding}>
          <Button type="submit">{isConnected ? "Continue Onboarding" : "Start Onboarding"}</Button>
        </form>
      </Card>
    </div>
  );
}
