import Link from "next/link";

type EventSubpageHeaderProps = {
  eventName: string;
  eventSlug: string;
  sectionTitle: string;
  description: string;
};

export function EventSubpageHeader({
  eventName,
  eventSlug,
  sectionTitle,
  description,
}: EventSubpageHeaderProps) {
  return (
    <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5 border border-slate-100">
      <Link
        href={`/diy-planner/vault/${eventSlug}` as never}
        className="text-sm font-medium text-indigo-700 hover:text-indigo-900"
      >
        ← Back to Event Vault
      </Link>
      <div className="mt-4">
        <p className="text-sm font-medium text-slate-500">{eventName}</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{sectionTitle}</h1>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      </div>
    </div>
  );
}
