import type { Role } from "@onehub/types/src/roles";

export function RoleBadge({ role }: { role: Role | undefined }) {
  if (!role) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
      {role}
    </span>
  );
}
