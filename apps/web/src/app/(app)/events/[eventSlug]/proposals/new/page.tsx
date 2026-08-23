"use client";

import { Card, Button } from "@/components/ui";
import { useRouter, useParams } from "next/navigation";
import { Sparkles } from "lucide-react";

export default function NewProposalPage() {
  const router = useRouter();
  const params = useParams();
  const eventSlug = params?.eventSlug as string;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Create Proposal</h1>
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-indigo-900 mb-1">Use the Event Vault proposal workflow</h3>
              <p className="text-sm text-indigo-800 mb-3">
                Create or compare proposals from the Event Vault. That path keeps proposals attached to this event, selected vendors, pricing context, and provider-backed approval rules.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => eventSlug && router.push(`/diy-planner/vault/${eventSlug}`)}
                  className="bg-indigo-600 hover:bg-indigo-700"
                  disabled={!eventSlug}
                >
                  Open Event Vault proposals
                </Button>
                <Button 
                  variant="secondary"
                  onClick={() => router.back()}
                >
                  Go Back
                </Button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-600 mb-2">
              <strong>Manual proposal entry</strong> is handled through the event workflow so proposal records stay connected to the event.
            </p>
            <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
              <li>Open the Event Vault for this event</li>
              <li>Review existing vendor and venue options</li>
              <li>Generate or compare proposals from the event context</li>
              <li>Return here only after choosing the active event workflow</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

