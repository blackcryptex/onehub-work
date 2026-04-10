import { KPIStat, TrendSparkline, Card } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canAccessDashboard } from "@/lib/rbac";
import { redirect } from "next/navigation";

export default async function AdminOverviewPage() {
  const user = await getCurrentUser();
  // TODO: centralized via RBAC helper: canAccessDashboard(user, "ADMIN")
  if (!user || !canAccessDashboard(user, "ADMIN")) {
    redirect("/app");
  }
  const metrics = await prisma.metricDaily.findMany({ orderBy: { date: "desc" }, take: 30 });
  const latest = metrics[0];
  const orgs = await prisma.organization.count();
  const users = await prisma.user.count();
  const events = await prisma.event.count();
  const disputes = await prisma.dispute.count({ where: { status: "OPEN" } });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-4 text-sm">
          <a href="/app/admin/verification" className="text-indigo-600 hover:text-indigo-800">
            Verification →
          </a>
          <a href="/admin/users" className="text-indigo-600 hover:text-indigo-800">
            Manage Users →
          </a>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <KPIStat label="Organizations" value={orgs} />
        <KPIStat label="Users" value={users} />
        <KPIStat label="Events" value={events} />
        <KPIStat label="Open Disputes" value={disputes} />
      </div>
      {latest && (
        <Card className="p-4">
          <h2 className="font-semibold mb-4">GMV Trends</h2>
          <TrendSparkline data={metrics.reverse().map((m) => m.gmvInCents / 100)} />
        </Card>
      )}
    </div>
  );
}
