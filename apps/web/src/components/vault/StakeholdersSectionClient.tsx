"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ManageStakeholders } from "@/components/events/ManageStakeholders";

interface Stakeholder {
  id: string;
  userId: string;
  role: "CLIENT" | "STAKEHOLDER";
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface StakeholdersSectionClientProps {
  eventSlug: string;
  stakeholders: Stakeholder[];
}

/**
 * Client Component wrapper for ManageStakeholders.
 * Owns the onStakeholdersChange handler to avoid passing functions from Server Components.
 */
export function StakeholdersSectionClient({
  eventSlug,
  stakeholders: initialStakeholders,
}: StakeholdersSectionClientProps) {
  const [localStakeholders, setLocalStakeholders] = useState<Stakeholder[]>(initialStakeholders);
  const router = useRouter();

  // Sync local state when props change (after router.refresh())
  useEffect(() => {
    setLocalStakeholders(initialStakeholders);
  }, [initialStakeholders]);

  const handleStakeholdersChange = () => {
    // Refresh the page to get updated stakeholders from the server
    router.refresh();
  };

  return (
    <ManageStakeholders
      eventSlug={eventSlug}
      stakeholders={localStakeholders}
      onStakeholdersChange={handleStakeholdersChange}
    />
  );
}

