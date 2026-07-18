import { expect, request, test, type APIRequestContext } from "@playwright/test";

async function expectOkResponse(response: { ok: () => boolean; status: () => number; text: () => Promise<string> }, label: string) {
  if (!response.ok()) {
    throw new Error(`${label} failed with ${response.status()}: ${await response.text()}`);
  }
}

async function signIn(api: APIRequestContext, email: string, password: string) {
  const csrfResponse = await api.get("/api/auth/csrf");
  await expectOkResponse(csrfResponse, "csrf");
  const { csrfToken } = await csrfResponse.json();

  const response = await api.post("/api/auth/callback/credentials", {
    form: {
      csrfToken,
      email,
      password,
      callbackUrl: "/",
    },
    maxRedirects: 0,
  });

  expect([302, 303]).toContain(response.status());
}

test.describe("Slice 5 mocked-Stripe payment processing E2E", () => {
  test("signed contract funds escrow, blocks release, releases payout, exposes receipt and audit evidence", async ({ baseURL }) => {
    const setup = await request.newContext({ baseURL });
    const seedResponse = await setup.post("/api/e2e/payment", { data: { action: "seed" } });
    await expectOkResponse(seedResponse, "seed");
    const seed = await seedResponse.json();

    expect(seed.contractId).toBeTruthy();
    expect(seed.milestoneId).toBeTruthy();
    expect(seed.proposalId).toBeTruthy();
    expect(seed.amountCents).toBe(120000);

    const buyer = await request.newContext({ baseURL });
    await signIn(buyer, seed.users.buyer.email, seed.users.buyer.password);

    const createIntentResponse = await buyer.post("/api/payments/create-intent", {
      data: {
        contractId: seed.contractId,
        milestoneId: seed.milestoneId,
        acceptance: seed.paymentAcceptance,
      },
      headers: { "x-request-id": "slice5-e2e-create-intent" },
    });
    await expectOkResponse(createIntentResponse, "create intent");
    const created = await createIntentResponse.json();
    expect(created.paymentIntentId).toBeTruthy();
    expect(created.clientSecret).toContain("pi_e2e_mock_");
    expect(created.amountCents).toBe(seed.amountCents);
    expect(created.currency).toBe("USD");

    const confirmResponse = await buyer.post("/api/payments/confirm", {
      data: { paymentIntentId: created.paymentIntentId },
      headers: { "x-request-id": "slice5-e2e-confirm" },
    });
    await expectOkResponse(confirmResponse, "confirm payment");
    const confirmed = await confirmResponse.json();
    expect(confirmed.success).toBe(true);

    const duplicateConfirmResponse = await buyer.post("/api/payments/confirm", {
      data: { paymentIntentId: created.paymentIntentId },
      headers: { "x-request-id": "slice5-e2e-confirm-duplicate" },
    });
    await expectOkResponse(duplicateConfirmResponse, "duplicate confirm payment");
    await expect(duplicateConfirmResponse.json()).resolves.toMatchObject({ success: true });

    const postConfirmInspectResponse = await setup.post("/api/e2e/payment", {
      data: {
        action: "inspect",
        proposalId: seed.proposalId,
        milestoneId: seed.milestoneId,
        paymentIntentId: created.paymentIntentId,
      },
    });
    await expectOkResponse(postConfirmInspectResponse, "post-confirm inspect");
    const postConfirm = await postConfirmInspectResponse.json();
    expect(postConfirm.paymentIntent.status).toBe("SUCCEEDED");
    expect(postConfirm.paymentIntent.stripeIntentId).toContain("pi_e2e_mock_");
    expect(postConfirm.paymentIntent.transactions.totalAmountCents).toBe(seed.amountCents);
    expect(postConfirm.milestone.status).toBe("IN_ESCROW");
    expect(postConfirm.escrowAccount.balanceCents).toBe(seed.amountCents);

    const blockerResponse = await setup.post("/api/e2e/payment", {
      data: {
        action: "add-refund-blocker",
        proposalId: seed.proposalId,
        contractId: seed.contractId,
        milestoneId: seed.milestoneId,
        paymentIntentId: created.paymentIntentId,
        orgId: seed.buyerOrgId,
        actorId: seed.users.buyer.id,
        amountCents: seed.amountCents,
      },
    });
    await expectOkResponse(blockerResponse, "add refund blocker");
    const { blocker } = await blockerResponse.json();
    expect(blocker.status).toBe("OPEN");

    const admin = await request.newContext({ baseURL });
    await signIn(admin, seed.users.admin.email, seed.users.admin.password);

    const blockedReleaseResponse = await admin.post("/api/payments/release-milestone", {
      data: {
        milestoneId: seed.milestoneId,
        reason: "Slice 5 blocked release assertion",
        acceptance: seed.adminOverrideAcceptance,
      },
      headers: { "x-request-id": "slice5-e2e-release-blocked" },
    });
    expect(blockedReleaseResponse.status()).toBe(409);
    await expect(blockedReleaseResponse.json()).resolves.toMatchObject({
      error: "Release blocked while an open refund request is under admin review",
      refundRequestId: blocker.id,
    });

    const clearResponse = await setup.post("/api/e2e/payment", {
      data: { action: "clear-blockers", proposalId: seed.proposalId, milestoneId: seed.milestoneId },
    });
    await expectOkResponse(clearResponse, "clear blockers");

    const releaseResponse = await admin.post("/api/payments/release-milestone", {
      data: {
        milestoneId: seed.milestoneId,
        reason: "Slice 5 mocked-Stripe E2E release",
        acceptance: seed.adminOverrideAcceptance,
      },
      headers: { "x-request-id": "slice5-e2e-release" },
    });
    await expectOkResponse(releaseResponse, "release milestone");
    const released = await releaseResponse.json();
    expect(released.success).toBe(true);
    expect(released.payoutId).toBeTruthy();

    const duplicateReleaseResponse = await admin.post("/api/payments/release-milestone", {
      data: {
        milestoneId: seed.milestoneId,
        reason: "Slice 5 duplicate release assertion",
        acceptance: seed.adminOverrideAcceptance,
      },
      headers: { "x-request-id": "slice5-e2e-release-duplicate" },
    });
    await expectOkResponse(duplicateReleaseResponse, "duplicate release milestone");
    await expect(duplicateReleaseResponse.json()).resolves.toMatchObject({
      success: true,
      payoutId: released.payoutId,
    });

    const receiptResponse = await admin.get(`/api/payments/receipts/${released.payoutId}`);
    await expectOkResponse(receiptResponse, "receipt");
    const receiptHtml = await receiptResponse.text();
    expect(receiptHtml).toContain(released.payoutId);
    expect(receiptHtml).toContain("Slice 5 E2E Venue");
    expect(receiptHtml).toContain("Slice 5 Payment E2E Gala");

    const finalInspectResponse = await setup.post("/api/e2e/payment", {
      data: {
        action: "inspect",
        proposalId: seed.proposalId,
        milestoneId: seed.milestoneId,
        paymentIntentId: created.paymentIntentId,
        payoutId: released.payoutId,
      },
    });
    await expectOkResponse(finalInspectResponse, "final inspect");
    const finalState = await finalInspectResponse.json();
    expect(finalState.milestone.status).toBe("PAID");
    expect(finalState.escrowAccount.balanceCents).toBe(0);
    expect(finalState.payout.status).toBe("SENT");
    expect(finalState.payout.stripeTransfer).toContain("tr_e2e_mock_");
    expect(finalState.moneyTx).toEqual(expect.arrayContaining([expect.objectContaining({ type: "RELEASE_ESCROW", amountCents: seed.amountCents })]));
    expect(finalState.activities).toEqual(expect.arrayContaining([expect.objectContaining({ action: "MILESTONE_FUNDS_RELEASED" })]));
    expect(finalState.audits).toEqual(expect.arrayContaining([expect.objectContaining({ action: "payment.milestone.release" })]));
    expect(finalState.acceptances.length).toBeGreaterThanOrEqual(2);
    expect(finalState.blockers[0].status).toBe("CANCELED");
  });
});
