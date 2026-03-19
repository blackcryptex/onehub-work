"use client";

import { Card, Button } from "@/components/ui";
import { useRouter, useParams } from "next/navigation";
import { Sparkles } from "lucide-react";

/**
 * Manual Proposal Creation Page
 * 
 * NOTE: This page is currently a placeholder. For now, users should generate proposals
 * using AI from the Event Vault page at /app/vault/[eventSlug].
 * 
 * This page will be implemented in a future update to allow manual proposal creation.
 */
export default function NewProposalPage() {
  const router = useRouter();
  const params = useParams();
  const eventSlug = params?.eventSlug as string;
  
  // For now, redirect users to use AI proposal generation from the vault page
  // In the future, this page will allow manual proposal creation
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Create Proposal</h1>
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-indigo-900 mb-1">Use AI Proposal Generation</h3>
              <p className="text-sm text-indigo-800 mb-3">
                For the best results, generate proposals using AI from the Event Vault page. 
                AI-generated proposals include professional sections, pricing breakdowns, and payment schedules 
                tailored to your event and selected vendors/venues.
              </p>
              <div className="flex gap-2">
                <Button 
                  // Type assertion: Next.js typed routes don't support dynamic template strings, so we cast to satisfy TypeScript
                  onClick={() => eventSlug && router.push(`/app/vault/${eventSlug}` as any)}
                  className="bg-indigo-600 hover:bg-indigo-700"
                  disabled={!eventSlug}
                >
                  Go to Event Vault
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
              <strong>Manual proposal creation</strong> is coming soon. This will allow you to:
            </p>
            <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
              <li>Create proposals from scratch</li>
              <li>Add custom line items and pricing</li>
              <li>Set payment milestones manually</li>
              <li>Edit AI-generated proposals</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

