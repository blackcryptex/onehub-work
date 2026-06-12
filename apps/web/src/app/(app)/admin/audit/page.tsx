import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canAccessDashboard } from "@/lib/rbac";
import { redactAdminMetadata } from "@/lib/admin-oversight";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: { q?: string; action?: string; targetType?: string };
}) {
  const user = await getCurrentUser();
  if (!user || !canAccessDashboard(user, "ADMIN")) redirect("/app");

  const q = searchParams.q?.trim() || "";
  const containsQ = q ? { contains: q, mode: "insensitive" as const } : undefined;

  const [auditLogs, overrides] = await Promise.all([
    db.auditLog.findMany({
      where: {
        ...(searchParams.action ? { action: { contains: searchParams.action, mode: "insensitive" as const } } : {}),
        ...(q
          ? {
              OR: [
                { id: containsQ },
                { actorId: containsQ },
                { orgId: containsQ },
                { action: containsQ },
                { target: containsQ },
              ],
            }
          : {}),
      },
      orderBy: { at: "desc" },
      take: 25,
      include: { actor: { select: { email: true, name: true, role: true } }, org: { select: { name: true, slug: true } } },
    }),
    (db as UnsafeAny).adminOverride.findMany({
      where: {
        ...(searchParams.targetType ? { targetType: searchParams.targetType } : {}),
        ...(q
          ? {
              OR: [
                { id: containsQ },
                { actorId: containsQ },
                { orgId: containsQ },
                { targetId: containsQ },
                { proposalId: containsQ },
                { paymentIntentId: containsQ },
                { refundRequestId: containsQ },
                { disputeId: containsQ },
                { payoutId: containsQ },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin audit log</h1>
        <p className="text-sm text-slate-600">
          Read-only audit foundation over local AuditLog/AdminOverride records. Metadata is redacted for keys that look like secrets, tokens, credentials, provider payloads, signatures, or raw webhook payloads.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-5">
        <input name="q" defaultValue={q} placeholder="Search ids, actor, org, target" className="rounded border px-3 py-2 md:col-span-2" />
        <input name="action" defaultValue={searchParams.action} placeholder="Audit action" className="rounded border px-3 py-2" />
        <input name="targetType" defaultValue={searchParams.targetType} placeholder="Override target type" className="rounded border px-3 py-2" />
        <button className="rounded bg-slate-900 px-4 py-2 text-white">Filter</button>
      </form>

      <section className="rounded-xl border bg-white">
        <div className="border-b px-4 py-3 font-semibold">AuditLog records</div>
        <div className="divide-y">
          {auditLogs.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">No audit records found.</div>
          ) : (
            auditLogs.map((item) => (
              <article key={item.id} className="space-y-2 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold">{item.action}</div>
                  <div className="text-xs text-slate-500">{item.at.toLocaleString()}</div>
                </div>
                <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                  <div>id: <span className="font-mono">{item.id}</span></div>
                  <div>actor: {item.actor?.email || item.actorId || "system/unknown"}</div>
                  <div>org: {item.org?.name || item.orgId || "n/a"}</div>
                  <div>target: {item.target || "n/a"}</div>
                </div>
                <RedactedJson value={item.metadata} />
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-white">
        <div className="border-b px-4 py-3 font-semibold">AdminOverride records</div>
        <div className="divide-y">
          {overrides.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">No override records found.</div>
          ) : (
            overrides.map((item: any) => (
              <article key={item.id} className="space-y-2 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold">{item.targetType} • {item.decision}</div>
                  <div className="text-xs text-slate-500">{item.createdAt.toLocaleString()}</div>
                </div>
                <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                  <div>id: <span className="font-mono">{item.id}</span></div>
                  <div>target: <span className="font-mono">{item.targetId}</span></div>
                  <div>exception: {item.exceptionType}</div>
                  <div>authority: {item.authorityPath}</div>
                  <div>reason: {item.reason}</div>
                  <div>auditLogId: <span className="font-mono">{item.auditLogId}</span></div>
                </div>
                <RedactedJson value={item.metadata} />
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function RedactedJson({ value }: { value: unknown }) {
  if (!value) return <div className="text-xs text-slate-400">No metadata.</div>;
  return (
    <pre className="overflow-auto rounded bg-slate-50 p-3 text-xs text-slate-700">
      {JSON.stringify(redactAdminMetadata(value), null, 2)}
    </pre>
  );
}
