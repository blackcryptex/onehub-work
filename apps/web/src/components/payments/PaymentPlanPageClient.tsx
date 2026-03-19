"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Money } from "@/components/ui";
import { DollarSign, TrendingUp, Info, Sparkles, Plus, CheckCircle2, FileText } from "lucide-react";
import { EditPaymentLineModal } from "./EditPaymentLineModal";
import { DepositActions, PayoutActions } from "./PaymentPlanActions";
import { useToast } from "@/hooks/useToast";

const formatStatus = (s?: string) =>
  (s ?? "").toLowerCase().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

const formatDate = (d?: string | Date) => {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(dt);
};

const getStatusBadgeColor = (status?: string) => {
  switch (status) {
    case "FUNDED":
    case "SUCCEEDED":
    case "SENT":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "PENDING":
    case "PROCESSING":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "FAILED":
    case "CANCELED":
    case "CANCELLED":
      return "bg-rose-100 text-rose-800 border-rose-200";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
};

interface Listing {
  id: string;
  title: string;
  category: string;
  type: string;
}

interface Proposal {
  id: string;
  title: string;
  listing?: Listing | null;
}

interface Event {
  id: string;
  slug: string;
  name: string;
  orgId: string;
  proposals: Proposal[];
}

interface Deposit {
  id: string;
  title: string;
  amountCents: number;
  status: string;
  dueDate: Date | null;
  description: string | null;
}

interface PayoutProposal {
  id: string;
  totalCents: number;
  title: string;
  status: string;
}

interface Payout {
  id: string;
  amountCents: number;
  status: string;
  listing?: Listing | null;
  proposal?: PayoutProposal | null;
  isLocked?: boolean;
  displayAmountCents?: number;
  proposalId: string;
}

interface RevenueBreakdown {
  payout: Payout;
  gross: number;
  platformFee: number;
  processingFee: number;
  vendorPayout: number;
}

interface PaymentPlanPageClientProps {
  event: Event;
  deposits: Deposit[];
  payouts: Payout[];
  listings: Listing[];
  firstProposal: Proposal | undefined;
  isPlanner: boolean;
  demoModeActive: boolean;
  hasAcceptedProposals: boolean;
  escrowBalance: number;
  fundedTotal: number;
  releasedTotal: number;
  pendingTotal: number;
  revenueBreakdown: RevenueBreakdown[];
  totalGross: number;
  totalPlatformFee: number;
  totalProcessingFee: number;
  totalVendorPayout: number;
}

const PLATFORM_FEE_BPS = 300;

export function PaymentPlanPageClient({
  event,
  deposits,
  payouts,
  listings,
  firstProposal,
  isPlanner,
  demoModeActive,
  hasAcceptedProposals,
  escrowBalance,
  fundedTotal,
  releasedTotal,
  pendingTotal,
  revenueBreakdown,
  totalGross,
  totalPlatformFee,
  totalProcessingFee,
  totalVendorPayout,
}: PaymentPlanPageClientProps) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLine, setEditLine] = useState<{
    id?: string;
    label?: string;
    amountCents?: number;
    payeeListingId?: string | null;
  } | null>(null);
  const [editMode, setEditMode] = useState<"deposit" | "payout">("deposit");

  const handleEdit = (line: Deposit | Payout, mode: "deposit" | "payout") => {
    if (mode === "deposit") {
      const deposit = line as Deposit;
      setEditLine({
        id: deposit.id,
        label: deposit.title,
        amountCents: deposit.amountCents,
      });
    } else {
      const payout = line as Payout;
      setEditLine({
        id: payout.id,
        label: "", // Payouts don't have a label in the model, but we could add one
        amountCents: payout.amountCents,
        payeeListingId: payout.listing?.id || null,
      });
    }
    setEditMode(mode);
    setEditModalOpen(true);
  };

  const handleDelete = async (line: Deposit | Payout, mode: "deposit" | "payout") => {
    if (!confirm(`Are you sure you want to delete this ${mode}?`)) return;

    const lineId = line.id;
    try {
      const response = await fetch(`/api/payments/lines/${lineId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to delete ${mode}`);
      }

      router.refresh();
    } catch (err) {
      console.error(`Error deleting ${mode}:`, err);
      alert(err instanceof Error ? err.message : `Failed to delete ${mode}`);
    }
  };

  const handleAutoBuild = async () => {
    try {
      const response = await fetch("/api/payments/plan/from-accepted-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, mode: "SINGLE" }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to build payout plan from accepted proposals");
      }

      router.refresh();
    } catch (err) {
      console.error("Error building payout plan:", err);
      alert(err instanceof Error ? err.message : "Failed to build payout plan from accepted proposals");
    }
  };

  const handleAutoCreateDeposits = async () => {
    try {
      const response = await fetch("/api/payments/deposits/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, mode: "THREE" }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to auto-create deposit schedule");
      }

      const data = await response.json();
      const totalFormatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(data.totalDepositsCents / 100);

      router.refresh();
      success(`Deposit schedule created: ${totalFormatted} total across ${data.deposits.length} deposit(s).`);
    } catch (err) {
      console.error("Error auto-creating deposits:", err);
      showError(err instanceof Error ? err.message : "Failed to auto-create deposit schedule");
    }
  };

  // Calculate coverage: deposits total vs payouts total
  const depositsTotal = deposits.reduce((sum, d) => sum + d.amountCents, 0);
  const payoutsTotal = payouts.reduce((sum, p) => {
    const displayAmount = p.displayAmountCents ?? p.amountCents;
    return sum + displayAmount;
  }, 0);
  const coverageDiff = depositsTotal - payoutsTotal;
  const isCovered = coverageDiff >= 0;

  const handleLockToggle = async (payout: Payout, newLockState: boolean) => {
    try {
      const response = await fetch(`/api/payments/lines/${payout.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "payout",
          lockedToProposal: newLockState,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${newLockState ? "lock" : "unlock"} payout`);
      }

      router.refresh();
    } catch (err) {
      console.error(`Error ${newLockState ? "locking" : "unlocking"} payout:`, err);
      alert(err instanceof Error ? err.message : `Failed to ${newLockState ? "lock" : "unlock"} payout`);
    }
  };

  const handleModalSaved = () => {
    router.refresh();
  };

  if (!firstProposal) {
    return (
      <div className="space-y-6 p-6">
        <Card className="p-6 text-center text-slate-500">
          <p>No proposals found for this event. Create a proposal first.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-indigo-600" />
          Payments & Escrow
        </h1>
        <p className="mt-2 text-slate-600 max-w-2xl">
          Clients fund escrow. Planners allocate payouts to vendors. OneHub earns a fee on releases.
        </p>
      </div>

      {demoModeActive && (
        <div className="flex items-center gap-2 text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 p-3 rounded-lg">
          <Sparkles className="w-4 h-4" />
          <span>Demo simulation active — no real transactions.</span>
        </div>
      )}

      {/* Escrow Summary */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Escrow Summary</h2>
          {demoModeActive && (
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
              <Info className="w-3 h-3 mr-1" />
              Demo simulation
            </span>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-sm text-slate-600">Escrow Balance</div>
            <div className="mt-1 text-2xl font-semibold">
              <Money cents={escrowBalance} currency="USD" />
            </div>
            <div className="mt-1 text-xs text-slate-500">Funds held in escrow</div>
          </div>
          <div>
            <div className="text-sm text-slate-600">Funded Total</div>
            <div className="mt-1 text-2xl font-semibold text-blue-600">
              <Money cents={fundedTotal} currency="USD" />
            </div>
            <div className="mt-1 text-xs text-slate-500">Total deposits funded</div>
          </div>
          <div>
            <div className="text-sm text-slate-600">Released to Vendor</div>
            <div className="mt-1 text-2xl font-semibold text-green-600">
              <Money cents={releasedTotal} currency="USD" />
            </div>
            <div className="mt-1 text-xs text-slate-500">Payments completed</div>
          </div>
        </div>
        {!demoModeActive && (
          <p className="mt-4 text-xs text-slate-500">
            Stripe Connect escrow coming next.
          </p>
        )}
      </Card>

      {/* Client Funding */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Client Funding</h2>
          {isPlanner && (
            <div className="flex items-center gap-2">
              {payoutsTotal > 0 && (
                <div className="flex flex-col items-end gap-1">
                  <Button
                    onClick={handleAutoCreateDeposits}
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Sparkles className="w-4 h-4" />
                    Auto-create deposit schedule
                  </Button>
                  <p className="text-xs text-slate-500">Matches escrow deposits to your payout plan.</p>
                </div>
              )}
              <Button
                onClick={() => {
                  setEditLine(null);
                  setEditMode("deposit");
                  setEditModalOpen(true);
                }}
                variant="secondary"
                size="sm"
                className="flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Deposit
              </Button>
            </div>
          )}
        </div>

        {/* Coverage Indicator */}
        {payoutsTotal > 0 && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-700">Escrow Coverage</div>
                <div className="mt-1 text-xs text-slate-600">
                  Deposits total: <Money cents={depositsTotal} currency="USD" /> • Payouts total: <Money cents={payoutsTotal} currency="USD" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isCovered ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Covered
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
                    Short by <Money cents={Math.abs(coverageDiff)} currency="USD" />
                  </span>
                )}
              </div>
            </div>
            {isCovered && depositsTotal === payoutsTotal && (
              <div className="mt-2 text-xs text-slate-500">
                Recommended schedule: 30/40/30 (editable)
              </div>
            )}
          </div>
        )}

        {deposits.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No deposits yet. {isPlanner && "Add a deposit to get started."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Label
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {deposits.map((deposit) => (
                  <tr key={deposit.id}>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-slate-900">
                      {deposit.title}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-slate-900">
                      <Money cents={deposit.amountCents} currency="USD" />
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(
                          deposit.status
                        )}`}
                      >
                        {formatStatus(deposit.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      <DepositActions
                        depositId={deposit.id}
                        currentStatus={deposit.status}
                        onEdit={() => handleEdit(deposit, "deposit")}
                        onDelete={() => handleDelete(deposit, "deposit")}
                        isDemoMode={demoModeActive}
                        isPlanner={isPlanner}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Payout Plan */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Payout Plan (Who gets paid what)</h2>
          <div className="flex items-center gap-2">
            {hasAcceptedProposals && isPlanner && (
              <Button
                onClick={handleAutoBuild}
                variant="secondary"
                size="sm"
                className="flex items-center gap-1"
              >
                <Sparkles className="w-4 h-4" />
                Auto-build from proposals
              </Button>
            )}
            {isPlanner && (
              <Button
                onClick={() => {
                  setEditLine(null);
                  setEditMode("payout");
                  setEditModalOpen(true);
                }}
                variant="secondary"
                size="sm"
                className="flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Payout Line
              </Button>
            )}
          </div>
        </div>

        {payouts.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No payout lines yet. {isPlanner && "Add payout lines or auto-build from accepted proposals."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Payee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {payouts.map((payout) => {
                  const displayAmount = payout.displayAmountCents ?? payout.amountCents;
                  const isLocked = payout.isLocked ?? false;
                  
                  return (
                    <tr key={payout.id}>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-slate-900">
                        {payout.listing?.title || payout.proposal?.title || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                        {payout.listing?.category || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-slate-900">
                        <Money cents={displayAmount} currency="USD" />
                        {isLocked && (
                          <span className="ml-2 text-xs text-slate-400" title="Synced to proposal total">
                            (locked)
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        {isLocked ? (
                          <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                            Locked to Proposal
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Manual</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(
                            payout.status
                          )}`}
                        >
                          {formatStatus(payout.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          {isPlanner && (
                            <Button
                              onClick={() => handleLockToggle(payout, !isLocked)}
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              title={isLocked ? "Unlock to edit amount manually" : "Lock to sync with proposal total"}
                            >
                              {isLocked ? "Unlock" : "Lock"}
                            </Button>
                          )}
                          {payout.status === "SENT" && (
                            <a
                              href={`/api/payments/receipts/${payout.id}`}
                              download
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50"
                              title="Download Receipt"
                            >
                              <FileText className="w-3 h-3" />
                              Receipt
                            </a>
                          )}
                          <PayoutActions
                            payoutId={payout.id}
                            currentStatus={payout.status}
                            amountCents={displayAmount}
                            escrowBalanceCents={escrowBalance}
                            onEdit={() => handleEdit(payout, "payout")}
                            onDelete={() => handleDelete(payout, "payout")}
                            isDemoMode={demoModeActive}
                            isPlanner={isPlanner}
                            isLocked={isLocked}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* OneHub Revenue */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            OneHub Revenue
          </h2>
          {demoModeActive && (
            <span className="text-xs text-slate-500">
              Platform fee: {PLATFORM_FEE_BPS / 100}% • Processing fee: illustrative
            </span>
          )}
        </div>

        {revenueBreakdown.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No payments released yet. Revenue will appear here once payouts are released.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Payout
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Gross
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      OneHub Fee
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Processor
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Vendor Payout
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {revenueBreakdown.map((breakdown) => (
                    <tr key={breakdown.payout.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                        {breakdown.payout.listing?.title || `Payout ${breakdown.payout.id.slice(0, 8)}`}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-900">
                        <Money cents={breakdown.gross} currency="USD" />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-indigo-600">
                        <Money cents={breakdown.platformFee} currency="USD" />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-500">
                        <Money cents={breakdown.processingFee} currency="USD" />
                        <span className="ml-1 text-xs text-slate-400">(illustrative)</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">
                        <Money cents={breakdown.vendorPayout} currency="USD" />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-900">
                      Totals
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-slate-900">
                      <Money cents={totalGross} currency="USD" />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-indigo-600">
                      <Money cents={totalPlatformFee} currency="USD" />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-slate-500">
                      <Money cents={totalProcessingFee} currency="USD" />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-slate-700">
                      <Money cents={totalVendorPayout} currency="USD" />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {demoModeActive && (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                <p className="text-xs text-indigo-800">
                  <strong>Demo simulation</strong> — Stripe Connect escrow in production. Platform fee of{" "}
                  {PLATFORM_FEE_BPS / 100}% applies to all released payments.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Edit Modal */}
      <EditPaymentLineModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditLine(null);
        }}
        line={editLine}
        mode={editMode}
        payees={listings}
        onSaved={handleModalSaved}
        eventId={event.id}
        proposalId={firstProposal.id}
        orgId={event.orgId}
      />
    </div>
  );
}

