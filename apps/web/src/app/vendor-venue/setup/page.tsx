"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ProviderType = "vendor" | "venue";

type LegacySetupData = {
  userRole?: "VENDOR" | "VENUE";
};

function getProviderType(
  explicitProviderType: string | null,
  legacyDataParam: string | null,
): ProviderType {
  if (explicitProviderType === "venue") return "venue";
  if (explicitProviderType === "vendor") return "vendor";

  if (legacyDataParam) {
    try {
      const parsed = JSON.parse(decodeURIComponent(legacyDataParam)) as LegacySetupData;
      if (parsed.userRole === "VENUE") return "venue";
    } catch {
      // Ignore malformed legacy data and fall back to vendor.
    }
  }

  return "vendor";
}

export default function VendorVenueSetupRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const providerType = getProviderType(
      searchParams.get("providerType"),
      searchParams.get("data"),
    );

    const targetUrl = searchParams.get("createOrg") === "true"
      ? `/providers/onboarding?providerType=${providerType}`
      : `/providers/start?providerType=${providerType}`;

    router.replace(targetUrl);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[color:var(--oh-bg)] px-4">
      <p className="text-sm text-slate-600">Redirecting to provider onboarding…</p>
    </div>
  );
}
