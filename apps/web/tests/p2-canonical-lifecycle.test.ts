import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  assertCanonicalContractSignableStatus,
  assertCanonicalProposalApprovalStatus,
  canonicalLifecycleHttpStatusForError,
  computeCanonicalSignatureStatus,
  resolveCanonicalContractGeneration,
  verifyCanonicalContractOrgIds,
  assertFullContractAmountMatchesMilestones,
} from "../src/server/lib/lifecycle/proposal-contract-payment";

describe("P2 canonical proposal-contract-payment lifecycle guards", () => {
  it("allows proposal approval only from SENT and rejects converted/draft legacy shortcuts", () => {
    expect(assertCanonicalProposalApprovalStatus("SENT")).toEqual({ kind: "approve" });

    expect(() => assertCanonicalProposalApprovalStatus("DRAFT")).toThrow("Proposal must be SENT before approval");
    expect(() => assertCanonicalProposalApprovalStatus("CONVERTED")).toThrow("Proposal has already been converted to a contract");
    expect(() => assertCanonicalProposalApprovalStatus("REJECTED")).toThrow("Proposal cannot be approved from status REJECTED");
  });

  it("returns an existing converted contract idempotently and otherwise requires ACCEPTED", () => {
    expect(
      resolveCanonicalContractGeneration({ proposalStatus: "CONVERTED", existingContractId: "contract_1" })
    ).toEqual({ kind: "existing", contractId: "contract_1" });

    expect(
      resolveCanonicalContractGeneration({ proposalStatus: "ACCEPTED", existingContractId: null })
    ).toEqual({ kind: "create" });

    expect(() =>
      resolveCanonicalContractGeneration({ proposalStatus: "CONVERTED", existingContractId: null })
    ).toThrow("Converted proposal is missing its contract");

    expect(() =>
      resolveCanonicalContractGeneration({ proposalStatus: "SENT", existingContractId: null })
    ).toThrow("Proposal must be accepted before generating a contract");
  });

  it("documents and enforces contract buyerId/sellerId as buyer/seller org ids", () => {
    expect(
      verifyCanonicalContractOrgIds({
        buyerOrgId: "buyer_org",
        sellerOrgId: "seller_org",
        actorUserId: "buyer_user",
      })
    ).toEqual({ buyerId: "buyer_org", sellerId: "seller_org" });

    expect(() =>
      verifyCanonicalContractOrgIds({ buyerOrgId: "buyer_user", sellerOrgId: "seller_org", actorUserId: "buyer_user" })
    ).toThrow("Contract.buyerId must store the buyer organization id, not the acting user id");

    expect(() =>
      verifyCanonicalContractOrgIds({ buyerOrgId: "same_org", sellerOrgId: "same_org", actorUserId: "buyer_user" })
    ).toThrow("Self-contracting is not supported in the canonical lifecycle");
  });

  it("blocks signatures before OUT_FOR_SIGNATURE and derives status from buyer/seller org membership", () => {
    expect(() => assertCanonicalContractSignableStatus("DRAFT")).toThrow(
      "Contract must be OUT_FOR_SIGNATURE or PARTIALLY_SIGNED before signing"
    );
    expect(assertCanonicalContractSignableStatus("OUT_FOR_SIGNATURE")).toEqual({ kind: "signable" });

    expect(
      computeCanonicalSignatureStatus({
        contractStatus: "OUT_FOR_SIGNATURE",
        signatures: [{ signerId: "buyer_owner", signerEmail: "BUYER@EXAMPLE.COM", signedAt: new Date("2026-01-01") }],
        buyerUserIds: ["buyer_owner", "buyer_member"],
        sellerUserIds: ["seller_owner"],
      })
    ).toEqual({ buyerSigned: true, sellerSigned: false, nextStatus: "PARTIALLY_SIGNED" });

    expect(
      computeCanonicalSignatureStatus({
        contractStatus: "PARTIALLY_SIGNED",
        signatures: [
          { signerId: "buyer_owner", signerEmail: "buyer@example.com", signedAt: new Date("2026-01-01") },
          { signerId: "seller_owner", signerEmail: "seller@example.com", signedAt: new Date("2026-01-02") },
        ],
        buyerUserIds: ["buyer_owner"],
        sellerUserIds: ["seller_owner"],
      })
    ).toEqual({ buyerSigned: true, sellerSigned: true, nextStatus: "FULLY_SIGNED" });
  });

  it("requires full-contract payment amount to equal the server-derived milestone sum", () => {
    expect(assertFullContractAmountMatchesMilestones({ requestedAmountCents: 3000, milestoneAmountsCents: [1000, 2000] })).toBe(3000);
    expect(() =>
      assertFullContractAmountMatchesMilestones({ requestedAmountCents: 2999, milestoneAmountsCents: [1000, 2000] })
    ).toThrow("Amount must match the server-derived contract total");
  });

  it("maps malformed legal acceptance payloads to client errors instead of 500", () => {
    const invalidAcceptance = z.object({ legalVersion: z.string() }).safeParse(undefined);
    expect(invalidAcceptance.success).toBe(false);
    if (!invalidAcceptance.success) {
      expect(canonicalLifecycleHttpStatusForError(invalidAcceptance.error)).toBe(400);
    }
  });
});
