import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, canManageEvent, isOrgMember, prisma, recordAcceptance } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  canManageEvent: vi.fn(),
  isOrgMember: vi.fn(),
  prisma: {
    contract: { findUnique: vi.fn(), update: vi.fn() },
    signature: { create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  },
  recordAcceptance: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser }));
vi.mock("@/lib/rbac", () => ({ canManageEvent, isOrgMember }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/acceptance", async () => {
  const { z } = await import("zod");
  return {
    acceptanceInputSchema: z.object({ accepted: z.literal(true), legalVersion: z.string() }),
    CURRENT_ACCEPTANCE_VERSIONS: { contract: "contract-v1" },
    recordAcceptance,
  };
});
vi.mock("@/lib/booking-classification", () => ({ resolveBookingClassification: () => "standard" }));
vi.mock("@/lib/legal-surface", () => ({ getLegalSurface: () => "contract.standard" }));

import { POST } from "../src/app/api/contracts/[id]/sign/route";

const user = { id: "buyer-user-1", email: "buyer@example.com", role: "DIY_PLANNER" };
const contract = {
  id: "contract-1",
  status: "DRAFT",
  proposal: {
    id: "proposal-1",
    totalCents: 10000,
    bookingClassification: "STANDARD",
    listingId: "listing-1",
    event: {
      orgId: "buyer-org-1",
      org: {
        type: "CLIENT",
        ownerId: "buyer-user-1",
        members: [],
      },
    },
    listing: {
      org: {
        ownerId: "seller-user-1",
        members: [],
      },
    },
  },
  signatures: [],
};

const request = () => new Request("http://onehub.test/api/contracts/contract-1/sign", {
  method: "POST",
  headers: { "content-type": "application/json", "x-request-id": "test-request" },
  body: JSON.stringify({
    signerName: "Buyer User",
    signerEmail: "buyer@example.com",
    acceptance: { accepted: true, legalVersion: "contract-v1" },
  }),
}) as never;

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue(user);
  canManageEvent.mockReturnValue(true);
  isOrgMember.mockReturnValue(false);
  prisma.contract.findUnique.mockResolvedValue(contract);
  prisma.signature.create.mockResolvedValue({ id: "sig-1" });
  prisma.signature.findMany.mockResolvedValue([{ signerId: "buyer-user-1", signedAt: new Date() }]);
  prisma.contract.update.mockResolvedValue({});
  recordAcceptance.mockResolvedValue({ id: "acceptance-1" });
});

describe("contract signing guardrails", () => {
  it("does not allow users to sign draft contracts before they are sent for signature", async () => {
    const response = await POST(request(), { params: Promise.resolve({ id: "contract-1" }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Contract is not ready for signature" });
    expect(prisma.signature.create).not.toHaveBeenCalled();
    expect(prisma.signature.update).not.toHaveBeenCalled();
    expect(prisma.contract.update).not.toHaveBeenCalled();
    expect(recordAcceptance).not.toHaveBeenCalled();
  });
});
