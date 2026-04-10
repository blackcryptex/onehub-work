import Link from "next/link";

export function LegalNotice({
  label,
  version,
  href,
}: {
  label: string;
  version: string;
  href: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
      <div>{label}</div>
      <div className="mt-1">Legal version: <span className="font-medium text-slate-800">{version}</span></div>
      <Link href={href} className="mt-1 inline-block text-indigo-600 hover:underline">
        Review policy
      </Link>
    </div>
  );
}
