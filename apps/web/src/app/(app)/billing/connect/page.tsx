import { Card, Button } from "@onehub/ui";

export default function BillingConnectPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Stripe Connect Setup</h1>
      <Card className="p-4">
        <p className="text-sm text-slate-600 mb-4">Connect your Stripe account to receive payments.</p>
        <Button>Start Onboarding</Button>
      </Card>
    </div>
  );
}

