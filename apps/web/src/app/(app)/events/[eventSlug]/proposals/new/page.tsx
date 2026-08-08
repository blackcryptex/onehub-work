"use client";

import { Card, Button } from "@/components/ui";
import { useRouter, useParams } from "next/navigation";
import { FileSignature, Sparkles, ShieldCheck } from "lucide-react";

export default function NewProposalPage() {
  const router = useRouter();
  const params = useParams();
  const eventSlug = params?.eventSlug as string;

  const eventWorkspaceHref = eventSlug ? `/events/${eventSlug}` : "/app/vault";
  const vaultHref = eventSlug ? `/app/vault/${eventSlug}` : "/app/vault";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Create Proposal</h1>
      <Card className="p-6">
        <div className="space-y-5">
          <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div className="flex-1">
              <h2 className="font-semibold text-indigo-900 mb-1">Use the active proposal workspace</h2>
              <p className="text-sm text-indigo-800 mb-3">
                OneHub’s MVP proposal flow starts from the event workspace so the draft stays tied to the selected event, vendor context, payment milestones, and trust history.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={() => router.push(eventWorkspaceHref as never)}
                  className="bg-indigo-600 hover:bg-indigo-700"
                  disabled={!eventSlug}
                >
                  Open Event Workspace
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => router.push(vaultHref as never)}
                >
                  Open Event Vault
                </Button>
                <Button variant="secondary" onClick={() => router.back()}>
                  Go Back
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <FileSignature className="mb-3 h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-900">What happens there</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                <li>Select or confirm vendors and venues.</li>
                <li>Generate proposal line items from the event context.</li>
                <li>Preview before sending.</li>
                <li>Track accepted, rejected, and contract-ready proposal states.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <ShieldCheck className="mb-3 h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold text-slate-900">Why this path is safer</h3>
              <p className="mt-2 text-sm text-slate-600">
                Keeping proposal creation inside the event workspace prevents orphan proposals and preserves OneHub’s event, contract, payment, and audit trail.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
