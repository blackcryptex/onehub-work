import { KPIStat, TrendSparkline, Card } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canAccessDashboard } from "@/lib/rbac";
import { redirect } from "next/navigation";

function money(cents: number | null | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents || 0) / 100);
}

type CommandCard = {
  title: string;
  eyebrow: string;
  body: string;
  href: string;
  cta: string;
};

type AdminDispute = { id: string; title?: string | null };
type AdminRefund = { id: string; amountRequestedCents?: number | null; currency?: string | null };
type AdminHoldback = { id: string; paymentIntentId?: string | null; triggerSummary?: string | null };
type AdminPayout = { id: string; amountCents?: number | null };
type AdminAbuseReport = { id: string; reason?: string | null; targetType?: string | null };
type AdminCrisisIssue = { id: string; title: string; severity: string; status: string };

type AdminPrisma = typeof prisma & {
  dispute: {
    count(args: unknown): Promise<number>;
    findFirst(args: unknown): Promise<AdminDispute | null>;
  };
  refundRequest: {
    count(args: unknown): Promise<number>;
    findFirst(args: unknown): Promise<AdminRefund | null>;
  };
  paymentHoldback: {
    count(args: unknown): Promise<number>;
    findFirst(args: unknown): Promise<AdminHoldback | null>;
  };
  payout: {
    count(args: unknown): Promise<number>;
    findFirst(args: unknown): Promise<AdminPayout | null>;
  };
  abuseReport: {
    count(args: unknown): Promise<number>;
    findFirst(args: unknown): Promise<AdminAbuseReport | null>;
  };
  crisisIssue?: {
    count(args: unknown): Promise<number>;
    findFirst(args: unknown): Promise<AdminCrisisIssue | null>;
  };
  paymentIntent?: {
    count(args: unknown): Promise<number>;
  };
  webhookEvent?: {
    count(args: unknown): Promise<number>;
  };
  auditLog?: {
    count(args: unknown): Promise<number>;
  };
  task: {
    count(args: unknown): Promise<number>;
  };
  milestone: {
    count(args: unknown): Promise<number>;
  };
};

export default async function AdminOverviewPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessDashboard(user, "ADMIN")) {
    redirect("/app");
  }
  const adminPrisma = prisma as unknown as AdminPrisma;
  const executionTaskModel = adminPrisma.task;
  const executionMilestoneModel = adminPrisma.milestone;
  const [
    metrics,
    orgs,
    users,
    events,
    openDisputes,
    openRefunds,
    activeHoldbacks,
    pendingPayouts,
    openAbuseReports,
    adminUsers,
    eventDreamers,
    urgentDispute,
    urgentRefund,
    urgentHoldback,
    urgentPayout,
    urgentAbuseReport,
    blockedTasks,
    criticalOpenTasks,
    overdueTasks,
    overdueMilestones,
    openCrisisIssues,
    urgentCrisisIssue,
    failedPaymentIntents,
    unprocessedWebhookEvents,
    auditTrailEntries,
  ] = await Promise.all([
    prisma.metricDaily.findMany({ orderBy: { date: "desc" }, take: 30 }),
    prisma.organization.count(),
    prisma.user.count(),
    prisma.event.count(),
    adminPrisma.dispute.count({ where: { status: { in: ["OPEN", "NEEDS_INFO", "UNDER_ADMIN_REVIEW", "ESCALATED"] } } }),
    adminPrisma.refundRequest.count({ where: { status: "OPEN" } }),
    adminPrisma.paymentHoldback.count({ where: { state: "ACTIVE" } }),
    adminPrisma.payout.count({ where: { status: "PENDING" } }),
    adminPrisma.abuseReport.count({ where: { status: "OPEN" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { role: "EVENT_DREAMER" } }),
    adminPrisma.dispute.findFirst({
      where: { status: { in: ["UNDER_ADMIN_REVIEW", "ESCALATED", "OPEN", "NEEDS_INFO"] } },
      orderBy: { updatedAt: "desc" },
    }),
    adminPrisma.refundRequest.findFirst({ where: { status: "OPEN" }, orderBy: { createdAt: "asc" } }),
    adminPrisma.paymentHoldback.findFirst({ where: { state: "ACTIVE" }, orderBy: { updatedAt: "asc" } }),
    adminPrisma.payout.findFirst({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } }),
    adminPrisma.abuseReport.findFirst({ where: { status: "OPEN" }, orderBy: { createdAt: "asc" } }),
    executionTaskModel?.count({ where: { status: "BLOCKED" } }) ?? Promise.resolve(0),
    executionTaskModel?.count({ where: { status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] }, priority: "CRITICAL" } }) ?? Promise.resolve(0),
    executionTaskModel?.count({ where: { status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] }, dueAt: { lt: new Date() } } }) ?? Promise.resolve(0),
    executionMilestoneModel?.count({ where: { done: false, dueAt: { lt: new Date() } } }) ?? Promise.resolve(0),
    adminPrisma.crisisIssue?.count({ where: { status: { in: ["OPEN", "IMPACT_REVIEW", "REPLACEMENT_STARTED"] } } }) ?? Promise.resolve(0),
    adminPrisma.crisisIssue?.findFirst({ where: { status: { in: ["OPEN", "IMPACT_REVIEW", "REPLACEMENT_STARTED"] } }, orderBy: [{ severity: "desc" }, { createdAt: "desc" }] }) ?? Promise.resolve(null),
    adminPrisma.paymentIntent?.count({ where: { status: "FAILED" } }) ?? Promise.resolve(0),
    adminPrisma.webhookEvent?.count({ where: { processedAt: null } }) ?? Promise.resolve(0),
    adminPrisma.auditLog?.count({ where: {} }) ?? Promise.resolve(0),
  ]);

  const latest = metrics[0];
  const trustQueueSummary = `${openDisputes} open disputes • ${openRefunds} refund request${openRefunds === 1 ? "" : "s"} • ${activeHoldbacks} active holdback${activeHoldbacks === 1 ? "" : "s"}`;
  const moneyQueueSummary = `${pendingPayouts} pending payout${pendingPayouts === 1 ? "" : "s"} • ${openRefunds} refund request${openRefunds === 1 ? "" : "s"} • ${activeHoldbacks} holdback${activeHoldbacks === 1 ? "" : "s"}`;
  const operationsSummary = `${failedPaymentIntents} failed payment${failedPaymentIntents === 1 ? "" : "s"} • ${unprocessedWebhookEvents} unprocessed webhook event${unprocessedWebhookEvents === 1 ? "" : "s"} • ${auditTrailEntries} audit trail entr${auditTrailEntries === 1 ? "y" : "ies"}`;

  const reviewNowCard = buildReviewNowCard(urgentDispute, urgentRefund, urgentHoldback, trustQueueSummary);
  const userRoleCard: CommandCard = {
    title: "Users, roles & verification",
    eyebrow: "Role safety",
    body: `${adminUsers} admins • ${eventDreamers} event dreamers to verify. Role roster is visible; keep admin access limited and review event dreamer conversions before changing permissions.`,
    href: "/admin/users",
    cta: "Review users and roles",
  };
  const moneyCard: CommandCard = {
    title: "Payments needing oversight",
    eyebrow: "Refunds, holdbacks, payouts",
    body:
      pendingPayouts || openRefunds || activeHoldbacks
        ? moneyQueueSummary
        : "No pending payouts, refund requests, or active holdbacks. Keep using verification overview before any manual release.",
    href: pendingPayouts ? "/admin/verification?payoutStatus=PENDING" : "/admin/verification",
    cta: "Open verification queues",
  };
  const safetyCard: CommandCard = {
    title: "Support operations queue",
    eyebrow: "Failed sends, payment risks, audit trail",
    body: openAbuseReports
      ? `${openAbuseReports} open abuse report${openAbuseReports === 1 ? "" : "s"}: ${urgentAbuseReport?.reason || "needs admin triage"}. ${operationsSummary}.`
      : `No open abuse reports. ${operationsSummary}. Continue monitoring verification, failed payment/webhook events, and user-role changes.`,
    href: "/admin/abuse",
    cta: "Open support queue",
  };
  const executionRiskCard: CommandCard = {
    title: "Execution accountability",
    eyebrow: "Tasks & milestones",
    body:
      blockedTasks || criticalOpenTasks || overdueTasks || overdueMilestones || openCrisisIssues
        ? `${blockedTasks} blocked task${blockedTasks === 1 ? "" : "s"} • ${criticalOpenTasks} critical open task${criticalOpenTasks === 1 ? "" : "s"} • ${overdueTasks + overdueMilestones} overdue task/milestone item${overdueTasks + overdueMilestones === 1 ? "" : "s"} • ${openCrisisIssues} crisis issue${openCrisisIssues === 1 ? "" : "s"}`
        : "No blocked, critical, or overdue execution tasks/milestones. Continue reviewing money movement only through verification queues.",
    href: "/admin/verification",
    cta: "Open verification context",
  };
  const nextActionCard: CommandCard = urgentCrisisIssue
    ? {
        title: "Next safe admin action",
        eyebrow: "Crisis oversight",
        body: `Review crisis issue ${urgentCrisisIssue.title} before any refund, payout, contract cancellation, or legal decision.`,
        href: "/admin/verification",
        cta: "Review crisis context",
      }
    : buildNextActionCard(urgentDispute, urgentRefund, urgentHoldback, urgentPayout, urgentAbuseReport);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin trust &amp; risk command center</h1>
          <p className="text-sm text-slate-600">Oversight only: no live money movement or credential changes from this dashboard.</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <a href="/admin/verification" className="text-indigo-600 hover:text-indigo-800">
            Verification →
          </a>
          <a href="/admin/users" className="text-indigo-600 hover:text-indigo-800">
            Manage users →
          </a>
          <a href="/admin/abuse" className="text-indigo-600 hover:text-indigo-800">
            Abuse reports →
          </a>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-6" aria-label="Admin first-screen command cards">
        {[reviewNowCard, userRoleCard, moneyCard, safetyCard, executionRiskCard, nextActionCard].map((card) => (
          <AdminCommandCard key={card.title} card={card} />
        ))}
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <KPIStat label="Organizations" value={orgs} />
        <KPIStat label="Users" value={users} />
        <KPIStat label="Events" value={events} />
        <KPIStat label="Open trust queue" value={openDisputes + openRefunds + activeHoldbacks + openAbuseReports} />
        <KPIStat label="Execution risk" value={blockedTasks + criticalOpenTasks + overdueTasks + overdueMilestones + openCrisisIssues} />
      </div>
      {latest && (
        <Card className="p-4">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <h2 className="font-semibold">Platform volume trend</h2>
            <p className="text-sm text-slate-600">
              Latest GMV {money(latest.gmvInCents)} • payouts {money(latest.payoutsCents)}
            </p>
          </div>
          <TrendSparkline data={[...metrics].reverse().map((m) => m.gmvInCents / 100)} />
        </Card>
      )}
    </div>
  );
}

function AdminCommandCard({ card }: { card: CommandCard }) {
  return (
    <Card className="flex h-full flex-col justify-between p-4">
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.eyebrow}</div>
        <h2 className="text-base font-semibold text-slate-950">{card.title}</h2>
        <p className="text-sm leading-6 text-slate-700">{card.body}</p>
      </div>
      <a href={card.href} className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-800">
        {card.cta} →
      </a>
    </Card>
  );
}

function buildReviewNowCard(
  dispute: AdminDispute | null,
  refund: AdminRefund | null,
  holdback: AdminHoldback | null,
  trustQueueSummary: string,
): CommandCard {
  if (dispute) {
    return {
      title: "Review now",
      eyebrow: "Trust/risk item",
      body: `Dispute: ${dispute.title || dispute.id}. ${trustQueueSummary}`,
      href: `/admin/verification/disputes/${dispute.id}`,
      cta: "Open dispute detail",
    };
  }
  if (refund) {
    return {
      title: "Review now",
      eyebrow: "Trust/risk item",
      body: `Refund request ${refund.id} for ${money(refund.amountRequestedCents, refund.currency || undefined)}. ${trustQueueSummary}`,
      href: `/admin/verification/refunds/${refund.id}`,
      cta: "Open refund detail",
    };
  }
  if (holdback) {
    return {
      title: "Review now",
      eyebrow: "Trust/risk item",
      body: `Holdback ${holdback.paymentIntentId || holdback.id}: ${holdback.triggerSummary || "manual risk review"}. ${trustQueueSummary}`,
      href: `/admin/verification/holdbacks/${holdback.paymentIntentId || holdback.id}`,
      cta: "Open holdback detail",
    };
  }
  return {
    title: "Review now",
    eyebrow: "Trust/risk item",
    body: "No open trust queue item needs immediate admin review. Verification, users, and abuse routes remain reachable for routine oversight.",
    href: "/admin/verification",
    cta: "Scan verification overview",
  };
}

function buildNextActionCard(
  dispute: AdminDispute | null,
  refund: AdminRefund | null,
  holdback: AdminHoldback | null,
  payout: AdminPayout | null,
  abuseReport: AdminAbuseReport | null,
): CommandCard {
  if (dispute) {
    return {
      title: "Next safe admin action",
      eyebrow: "Read-only step",
      body: "Open the dispute detail and verify context before any override. Keep freeze/release decisions inside existing guarded verification surfaces.",
      href: `/admin/verification/disputes/${dispute.id}`,
      cta: "Review dispute context",
    };
  }
  if (refund) {
    return {
      title: "Next safe admin action",
      eyebrow: "Read-only step",
      body: "Open the refund detail, confirm proposal and fee context, then use only existing guarded decision surfaces.",
      href: `/admin/verification/refunds/${refund.id}`,
      cta: "Review refund context",
    };
  }
  if (holdback) {
    return {
      title: "Next safe admin action",
      eyebrow: "Read-only step",
      body: "Open holdback context and confirm risk triggers before any existing guarded release review.",
      href: `/admin/verification/holdbacks/${holdback.paymentIntentId || holdback.id}`,
      cta: "Review holdback context",
    };
  }
  if (payout) {
    return {
      title: "Next safe admin action",
      eyebrow: "Read-only step",
      body: `Inspect pending payout ${payout.id} for ${money(payout.amountCents)} before release or receipt review.`,
      href: `/admin/verification/payouts/${payout.id}`,
      cta: "Review payout context",
    };
  }
  if (abuseReport) {
    return {
      title: "Next safe admin action",
      eyebrow: "Read-only step",
      body: `Open abuse report ${abuseReport.id} and verify the reported ${abuseReport.targetType?.toLowerCase?.() || "target"} before user-role changes.`,
      href: "/admin/abuse",
      cta: "Review abuse report",
    };
  }
  return {
    title: "Next safe admin action",
    eyebrow: "Read-only step",
    body: "Scan verification overview and user roles before changing platform settings. Keep platform safety review evidence-backed.",
    href: "/admin/verification",
    cta: "Open verification overview",
  };
}
