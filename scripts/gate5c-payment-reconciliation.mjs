#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_OUTPUT = "reports/production/gate5/phase5c/payment-monitoring-reconciliation/reconciliation-report.json";

function parseArgs(argv) {
  const args = { out: DEFAULT_OUTPUT };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--local-json" && next) {
      args.localJson = next;
      index += 1;
      continue;
    }
    if (arg === "--stripe-json" && next) {
      args.stripeJson = next;
      index += 1;
      continue;
    }
    if (arg === "--out" && next) {
      args.out = next;
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelpAndExit(0);
    }

    throw new Error(`Unknown or incomplete argument: ${arg}`);
  }

  return args;
}

function printHelpAndExit(exitCode) {
  console.log(`Gate 5C local/test-mode payment reconciliation

Safe boundaries:
- compares local payment records to mocked/test-mode Stripe evidence only
- does not call Stripe APIs
- does not mutate local database records
- does not initiate refunds, payouts, transfers, disputes, or billing actions

Usage:
  node scripts/gate5c-payment-reconciliation.mjs --local-json <local-payments.json> --stripe-json <mock-stripe.json> [--out <report.json>]

Inputs:
  --local-json   JSON array of { id, stripeIntentId, status, amountCents, currency }
  --stripe-json  JSON array of { id, status, amountReceivedCents, currency }
  --out          report path, default ${DEFAULT_OUTPUT}
`);
  process.exit(exitCode);
}

async function readJsonArray(filePath) {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`${filePath} must contain a JSON array`);
  }
  return parsed;
}

function normalizeCurrency(currency) {
  const normalized = String(currency).trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error(`Invalid currency code: ${currency}`);
  }
  return normalized;
}

function normalizeStripeStatus(status) {
  const normalized = String(status).trim().toLowerCase();
  if (["succeeded", "paid"].includes(normalized)) return "succeeded";
  if (["payment_failed", "failed", "requires_payment_method"].includes(normalized)) return "failed";
  if (["canceled", "cancelled"].includes(normalized)) return "canceled";
  return normalized;
}

function buildPaymentReconciliationReport({ generatedAt, localPayments, stripePayments }) {
  const stripeById = new Map(stripePayments.map((payment) => [payment.id, payment]));
  const anomalies = [];

  for (const localPayment of localPayments) {
    const stripePayment = localPayment.stripeIntentId ? stripeById.get(localPayment.stripeIntentId) : undefined;

    if (!stripePayment) {
      anomalies.push({
        kind: "missing_stripe_evidence",
        severity: localPayment.status === "SUCCEEDED" ? "critical" : "warning",
        localPaymentIntentId: localPayment.id,
        stripeIntentId: localPayment.stripeIntentId,
        message: "Local payment intent has no matching Stripe/test-mode evidence",
      });
      continue;
    }

    const stripeStatus = normalizeStripeStatus(stripePayment.status);
    if (stripeStatus === "succeeded" && localPayment.status !== "SUCCEEDED") {
      anomalies.push({
        kind: "stripe_succeeded_local_not_succeeded",
        severity: "critical",
        localPaymentIntentId: localPayment.id,
        stripeIntentId: stripePayment.id,
        message: "Stripe/test-mode evidence succeeded but local state was not updated",
      });
    }

    if (localPayment.status === "SUCCEEDED" && stripeStatus !== "succeeded") {
      anomalies.push({
        kind: "local_succeeded_stripe_not_succeeded",
        severity: "critical",
        localPaymentIntentId: localPayment.id,
        stripeIntentId: stripePayment.id,
        message: "Local state says success but Stripe/test-mode evidence is not succeeded",
      });
    }

    if (stripeStatus === "failed" && !["FAILED", "SUCCEEDED"].includes(localPayment.status)) {
      anomalies.push({
        kind: "stripe_failed_local_not_failed",
        severity: "warning",
        localPaymentIntentId: localPayment.id,
        stripeIntentId: stripePayment.id,
        message: "Stripe/test-mode evidence failed but local state is not FAILED",
      });
    }

    if (stripeStatus === "canceled" && !["CANCELLED", "SUCCEEDED"].includes(localPayment.status)) {
      anomalies.push({
        kind: "stripe_canceled_local_not_canceled",
        severity: "warning",
        localPaymentIntentId: localPayment.id,
        stripeIntentId: stripePayment.id,
        message: "Stripe/test-mode evidence canceled but local state is not CANCELLED",
      });
    }

    if (stripePayment.amountReceivedCents !== localPayment.amountCents) {
      anomalies.push({
        kind: "amount_mismatch",
        severity: "warning",
        localPaymentIntentId: localPayment.id,
        stripeIntentId: stripePayment.id,
        message: "Stripe/test-mode amount does not match local payment amount",
      });
    }

    if (normalizeCurrency(stripePayment.currency) !== normalizeCurrency(localPayment.currency)) {
      anomalies.push({
        kind: "currency_mismatch",
        severity: "warning",
        localPaymentIntentId: localPayment.id,
        stripeIntentId: stripePayment.id,
        message: "Stripe/test-mode currency does not match local payment currency",
      });
    }
  }

  const critical = anomalies.filter((anomaly) => anomaly.severity === "critical").length;
  const warning = anomalies.filter((anomaly) => anomaly.severity === "warning").length;

  return {
    generatedAt,
    summary: {
      localPayments: localPayments.length,
      stripePayments: stripePayments.length,
      totalAnomalies: anomalies.length,
      critical,
      warning,
      clean: anomalies.length === 0,
    },
    anomalies,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.localJson || !args.stripeJson) {
    printHelpAndExit(1);
  }

  const [localPayments, stripePayments] = await Promise.all([
    readJsonArray(args.localJson),
    readJsonArray(args.stripeJson),
  ]);

  const report = buildPaymentReconciliationReport({
    generatedAt: new Date().toISOString(),
    localPayments,
    stripePayments,
  });

  const outPath = path.resolve(args.out);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({ out: outPath, summary: report.summary }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
