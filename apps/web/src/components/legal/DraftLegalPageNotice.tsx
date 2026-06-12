import Link from "next/link";

type DraftLegalPageNoticeProps = {
  versionLabel: string;
};

export function DraftLegalPageNotice({ versionLabel }: DraftLegalPageNoticeProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">NOT LEGAL-APPROVED / INTERNAL DRAFT</p>
      <p className="mt-1">
        This page is a guarded MVP policy anchor for internal/local review only. It is not legal-approved, not a
        public launch approval, and not user acceptance text.
      </p>
      <p className="mt-1">
        Draft effective/version placeholder: <span className="font-medium">{versionLabel}</span>. Final effective
        date and approved copy require Marlon/legal approval before launch.
      </p>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        <Link href="/terms" className="underline">Terms</Link>
        <Link href="/privacy" className="underline">Privacy</Link>
        <Link href="/support" className="underline">Support</Link>
        <Link href="/legal/payments" className="underline">Payments</Link>
        <Link href="/legal/refunds" className="underline">Refunds</Link>
        <Link href="/legal/disputes" className="underline">Disputes</Link>
        <Link href="/legal/fees" className="underline">Fees</Link>
        <Link href="/legal/booking-classification" className="underline">Booking Classification</Link>
      </div>
    </div>
  );
}
