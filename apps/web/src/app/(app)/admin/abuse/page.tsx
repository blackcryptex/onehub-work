import { Card } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canAccessDashboard } from "@/lib/rbac";
import { redirect } from "next/navigation";

export default async function AbuseReportsPage() {
  const user = await getCurrentUser();
  // Centralized permission check: see apps/web/src/lib/rbac.ts
  if (!user || !canAccessDashboard(user, "ADMIN")) {
    redirect("/app");
  }
  const reports = await prisma.abuseReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Abuse Reports</h1>
      <div className="space-y-3">
        {reports.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{r.reason}</div>
                <div className="text-sm text-slate-600 mt-1">
                  {r.targetType}: {r.targetId}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Reported at {new Date(r.createdAt).toLocaleString()}
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded ${r.status === "OPEN" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                {r.status}
              </span>
            </div>
            {r.notes && <div className="mt-2 text-sm text-slate-600">{r.notes}</div>}
          </Card>
        ))}
        {reports.length === 0 && <div className="text-sm text-slate-600">No abuse reports.</div>}
      </div>
    </div>
  );
}
