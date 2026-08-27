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
      contract: contract(),
    } : null);
    prisma.contract.findUniqueOrThrow.mockResolvedValue(contract({
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
});
