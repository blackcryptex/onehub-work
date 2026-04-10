const BANNED_PAYMENT_KEYS = {
  calculateEscrowAmount: "calculateHeldFundsAmount",
  escrowBalance: "heldFundsBalance",
  escrowBalanceCents: "heldFundsBalanceCents",
  escrowBalanceBefore: "heldFundsBalanceBefore",
  escrowBalanceAfter: "heldFundsBalanceAfter",
  escrowStatusBefore: "heldFundsStatusBefore",
  escrowStatusAfter: "heldFundsStatusAfter",
  escrowFunded: "paymentReceived",
  escrowRelease: "payoutRelease",
} as const;

export function maskPaymentTerminology<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => maskPaymentTerminology(item)) as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => {
      const maskedKey = BANNED_PAYMENT_KEYS[key as keyof typeof BANNED_PAYMENT_KEYS] ?? key;
      return [maskedKey, maskPaymentTerminology(nestedValue)];
    });

    return Object.fromEntries(entries) as T;
  }

  return value;
}
