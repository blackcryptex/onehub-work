import { CURRENT_ACCEPTANCE_VERSIONS } from "@/lib/acceptance-versions";

export const LEGAL_CONTENT_METADATA = {
  lastUpdated: "2026-08-27",
  status: "Guarded MVP pilot explainer — not public-launch legal approval",
  reviewer: "OneHub manual legal/finance review required before public launch claims",
  versions: CURRENT_ACCEPTANCE_VERSIONS,
} as const;

export function LegalMetadataNotice({ surface }: { surface: keyof typeof CURRENT_ACCEPTANCE_VERSIONS | "fees" | "disputes" | "refunds" }) {
  const version = surface in CURRENT_ACCEPTANCE_VERSIONS
    ? CURRENT_ACCEPTANCE_VERSIONS[surface as keyof typeof CURRENT_ACCEPTANCE_VERSIONS]
    : CURRENT_ACCEPTANCE_VERSIONS.adminOverride;

  return (
    <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
      <p className="font-semibold">{LEGAL_CONTENT_METADATA.status}</p>
      <p>Last updated: {LEGAL_CONTENT_METADATA.lastUpdated}. Version reference: {version}.</p>
      <p>{LEGAL_CONTENT_METADATA.reviewer}. No live payment, payout, refund, dispute, tax, jurisdiction, or legal-readiness claim is made by this page.</p>
    </aside>
  );
}
