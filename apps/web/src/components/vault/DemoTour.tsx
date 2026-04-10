"use client";

import { Card, Button } from "@/components/ui";
import { MapPin, FileText, FileCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { contractDetail } from "@/lib/routes";

interface DemoTourProps {
  eventSlug: string;
  eventId: string;
  proposalId?: string;
  contractId?: string;
  show?: boolean;
}

export function DemoTour({ eventSlug, eventId, proposalId, contractId, show = false }: DemoTourProps) {
  // Only show if explicitly enabled (server passes this)
  if (!show) {
    return null;
  }

  return (
    <Card className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-indigo-600" />
        <h3 className="font-semibold text-indigo-900">Demo Tour</h3>
      </div>
      <p className="text-xs text-indigo-700 mb-3">
        Quick navigation for investor demo. Follow the flow: Event → Proposals → Contracts → Payments
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          asChild
          variant="secondary"
          size="sm"
          className="justify-start text-xs"
        >
          <Link href={`/app/vault/${eventSlug}`}>
            <MapPin className="w-3 h-3 mr-1" />
            Event Vault
          </Link>
        </Button>
        {proposalId ? (
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="justify-start text-xs"
          >
            <Link href={`/app/proposals/${proposalId}`}>
              <FileText className="w-3 h-3 mr-1" />
              View Proposal
            </Link>
          </Button>
        ) : (
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="justify-start text-xs"
            disabled
          >
            <span>
              <FileText className="w-3 h-3 mr-1" />
              No Proposal Yet
            </span>
          </Button>
        )}
        {contractId ? (
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="justify-start text-xs"
          >
            <Link href={contractDetail(contractId)}>
              <FileCheck className="w-3 h-3 mr-1" />
              View Contract
            </Link>
          </Button>
        ) : (
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="justify-start text-xs"
            disabled
          >
            <span>
              <FileCheck className="w-3 h-3 mr-1" />
              No Contract Yet
            </span>
          </Button>
        )}
        <Button
          asChild
          variant="secondary"
          size="sm"
          className="justify-start text-xs"
        >
          <Link href={`/app/vault/${eventSlug}`}>
            <Sparkles className="w-3 h-3 mr-1" />
            AI Source
          </Link>
        </Button>
      </div>
    </Card>
  );
}

