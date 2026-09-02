import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, prisma, recordActivity, resolveContractTemplate } = vi.hoisted(() => {
  const prisma = {
    contract: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    signature: {
      createMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    changeOrder: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
  };

  return {
    getCurrentUser: vi.fn(),
    prisma,
    recordActivity: vi.fn(),
    resolveContractTemplate: vi.fn(),
  };
});

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser,
  isAdmin: (user?: { role?: string | null }) => user?.role === "ADMIN",
}));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/server/lib/contracts", () => ({ resolveContractTemplate }));
vi.mock("@/server/lib/activity", () => ({
  ACTIVITY_ACTIONS: {
    CONTRACT_SENT_FOR_SIGNATURE: "CONTRACT_SENT_FOR_SIGNATURE",
    CONTRACT_SIGNED: "CONTRACT_SIGNED",
    CHANGE_ORDER_ADDED: "CHANGE_ORDER_ADDED",
    CHANGE_ORDER_APPROVED: "CHANGE_ORDER_APPROVED",
  },
  recordActivity,
}));

import { contractRouter } from "../src/server/routers/contract";

function caller() {
  return contractRouter.createCaller({});
}

function user(id: string, role: string, email = `${id}@test.local`) {
  return { id, role, email };
}

function contract(overrides: Record<string, unknown> = {}) {
  return {
    id: "contract-1",
    orgId: "buyer-org-1",
    eventId: "event-1",
    buyerId: "buyer-org-1",
    sellerId: "seller-org-1",
    title: "Provider contract",
    status: "DRAFT",
    signatures: [{ id: "signature-1", signerId: null, signerEmail: "Signer@Test.Local", signedAt: null }],
    changeOrders: [],
    proposal: {
      id: "proposal-1",
      eventId: "event-1",
      orgId: "buyer-org-1",
      event: {
        id: "event-1",
        name: "Smith Wedding",
        orgId: "buyer-org-1",
        createdById: "planner-1",
        org: { ownerId: "buyer-owner-1", members: [{ userId: "buyer-member-1" }] },
        stakeholders: [{ userId: "client-1", role: "CLIENT" }],
        shares: [{ viewerUserId: "client-1", scope: "SUMMARY" }],
      },
      listing: {
        id: "listing-1",
        orgId: "seller-org-1",
        org: { ownerId: "seller-owner-1", members: [{ userId: "seller-member-1" }] },
      },
    },
    ...overrides,
  };
}

describe("contract router commercial access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue(user("buyer-member-1", "PRO_PLANNER"));
    prisma.contract.findUnique.mockResolvedValue(contract());
    prisma.contract.findUniqueOrThrow.mockResolvedValue(contract());
    prisma.contract.update.mockResolvedValue(contract({ status: "PARTIALLY_SIGNED" }));
    prisma.signature.update.mockResolvedValue({ id: "signature-1", signerEmail: "Signer@Test.Local" });
    prisma.changeOrder.findUniqueOrThrow.mockResolvedValue({
      id: "co-1",
      contractId: "contract-1",
      number: 1,
      title: "Extra install",
      deltaCents: 90000,
      status: "PENDING",
      contract: contract(),
    });
    prisma.changeOrder.update.mockResolvedValue({ id: "co-1", status: "APPROVED" });
    resolveContractTemplate.mockReturnValue("rendered contract");
    recordActivity.mockResolvedValue(undefined);
  });

  it("contract.get allows seller listing org owners and members", async () => {
    getCurrentUser.mockResolvedValue(user("seller-owner-1", "VENDOR"));
    await expect(caller().get({ contractId: "contract-1" })).resolves.toEqual(expect.objectContaining({ id: "contract-1" }));

    getCurrentUser.mockResolvedValue(user("seller-member-1", "VENDOR"));
    await expect(caller().get({ contractId: "contract-1" })).resolves.toEqual(expect.objectContaining({ id: "contract-1" }));
  });

  it("contract.get allows intended signers case-insensitively", async () => {
    getCurrentUser.mockResolvedValue(user("case-signer", "CLIENT", "signer@test.local"));

    await expect(caller().get({ contractId: "contract-1" })).resolves.toEqual(expect.objectContaining({ id: "contract-1" }));
  });

  it("contract.get denies unrelated authenticated users", async () => {
    getCurrentUser.mockResolvedValue(user("stranger-1", "VENUE"));

    await expect(caller().get({ contractId: "contract-1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "You do not have permission to access this contract",
    });
  });

  it("contract.render follows the same access matrix as get", async () => {
    getCurrentUser.mockResolvedValue(user("seller-member-1", "VENDOR"));

    await expect(caller().render({ contractId: "contract-1" })).resolves.toBe("rendered contract");

    getCurrentUser.mockResolvedValue(user("stranger-1", "VENUE"));
    await expect(caller().render({ contractId: "contract-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("contract.sign allows intended signer email case-insensitively", async () => {
    getCurrentUser.mockResolvedValue(user("case-signer", "CLIENT", "signer@test.local"));
    prisma.signature.findUniqueOrThrow.mockResolvedValue(contract().signatures[0] ? {
      ...contract().signatures[0],
      contract: contract({ status: "OUT_FOR_SIGNATURE" }),
    } : null);
    prisma.contract.findUniqueOrThrow.mockResolvedValue(contract({
      status: "OUT_FOR_SIGNATURE",
      signatures: [{ id: "signature-1", signerId: "case-signer", signerEmail: "Signer@Test.Local", signedAt: new Date() }],
    }));

    await expect(caller().sign({ signatureId: "signature-1", typedName: "Case Signer" })).resolves.toEqual(
      expect.objectContaining({ id: "signature-1" })
    );
    expect(prisma.signature.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "signature-1" },
      data: expect.objectContaining({ signerId: "case-signer" }),
    }));
  });

  it("contract.sign marks fully signed when buyer member and seller owner have signed", async () => {
    getCurrentUser.mockResolvedValue(user("seller-owner-1", "VENDOR", "seller-owner@test.local"));
    prisma.signature.findUniqueOrThrow.mockResolvedValue({
      id: "signature-seller-owner",
      signerId: null,
      signerEmail: "seller-owner@test.local",
      signedAt: null,
      contract: contract({
        status: "OUT_FOR_SIGNATURE",
        signatures: [
          { id: "signature-buyer", signerId: "buyer-member-1", signerEmail: "buyer@test.local", signedAt: new Date() },
          { id: "signature-seller-owner", signerId: null, signerEmail: "seller-owner@test.local", signedAt: null },
        ],
      }),
    });
    prisma.contract.findUniqueOrThrow.mockResolvedValue(contract({
      status: "OUT_FOR_SIGNATURE",
      signatures: [
        { id: "signature-buyer", signerId: "buyer-member-1", signerEmail: "buyer@test.local", signedAt: new Date() },
        { id: "signature-seller-owner", signerId: "seller-owner-1", signerEmail: "seller-owner@test.local", signedAt: new Date() },
      ],
    }));

    await expect(caller().sign({ signatureId: "signature-seller-owner", typedName: "Seller Owner" })).resolves.toEqual(
      expect.objectContaining({ id: "signature-1" })
    );
    expect(prisma.contract.update).toHaveBeenCalledWith({
      where: { id: "contract-1" },
      data: { status: "FULLY_SIGNED" },
    });
  });

  it("contract.sign marks fully signed when buyer owner and seller member have signed", async () => {
    getCurrentUser.mockResolvedValue(user("seller-member-1", "VENDOR", "seller-member@test.local"));
    prisma.signature.findUniqueOrThrow.mockResolvedValue({
      id: "signature-seller-member",
      signerId: null,
      signerEmail: "seller-member@test.local",
      signedAt: null,
      contract: contract({
        status: "PARTIALLY_SIGNED",
        signatures: [
          { id: "signature-buyer", signerId: "buyer-owner-1", signerEmail: "buyer@test.local", signedAt: new Date() },
          { id: "signature-seller-member", signerId: null, signerEmail: "seller-member@test.local", signedAt: null },
        ],
      }),
    });
    prisma.contract.findUniqueOrThrow.mockResolvedValue(contract({
      status: "PARTIALLY_SIGNED",
      signatures: [
        { id: "signature-buyer", signerId: "buyer-owner-1", signerEmail: "buyer@test.local", signedAt: new Date() },
        { id: "signature-seller-member", signerId: "seller-member-1", signerEmail: "seller-member@test.local", signedAt: new Date() },
      ],
    }));

    await expect(caller().sign({ signatureId: "signature-seller-member", typedName: "Seller Member" })).resolves.toEqual(
      expect.objectContaining({ id: "signature-1" })
    );
    expect(prisma.contract.update).toHaveBeenCalledWith({
      where: { id: "contract-1" },
      data: { status: "FULLY_SIGNED" },
    });
  });

  it("contract.sign blocks draft contracts before any signature mutation", async () => {
    getCurrentUser.mockResolvedValue(user("case-signer", "CLIENT", "signer@test.local"));
    prisma.signature.findUniqueOrThrow.mockResolvedValue({
      ...contract().signatures[0],
      contract: contract({ status: "DRAFT" }),
    });

    await expect(caller().sign({ signatureId: "signature-1", typedName: "Case Signer" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "This contract is still a draft. Send it for signature before signing.",
    });
    expect(prisma.signature.update).not.toHaveBeenCalled();
  });

  it("contract.sign blocks buyer-side managers from signing another party signature row", async () => {
    getCurrentUser.mockResolvedValue(user("buyer-member-1", "PRO_PLANNER", "buyer-member@test.local"));
    prisma.signature.findUniqueOrThrow.mockResolvedValue({
      id: "signature-seller-owner",
      signerId: null,
      signerEmail: "seller-owner@test.local",
      signedAt: null,
      contract: contract({ status: "OUT_FOR_SIGNATURE" }),
    });

    await expect(caller().sign({ signatureId: "signature-seller-owner", typedName: "Buyer Member" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Only the intended signer can sign this contract signature",
    });
    expect(prisma.signature.update).not.toHaveBeenCalled();
  });

  it("approveChangeOrder allows seller org members and blocks unrelated users", async () => {
    getCurrentUser.mockResolvedValue(user("seller-member-1", "VENDOR"));

    await expect(caller().approveChangeOrder({ id: "co-1" })).resolves.toEqual(expect.objectContaining({ status: "APPROVED" }));
    expect(prisma.changeOrder.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "co-1" },
      data: expect.objectContaining({ status: "APPROVED" }),
    }));

    getCurrentUser.mockResolvedValue(user("stranger-1", "VENUE"));
    await expect(caller().approveChangeOrder({ id: "co-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
