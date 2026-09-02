import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getCurrentUser, dbMock, recordAudit, sendOutboundEmail } = vi.hoisted(() => {
  const tx = {
    membership: { create: vi.fn() },
    invite: { updateMany: vi.fn() },
  };

  return {
    auth: vi.fn(),
    getCurrentUser: vi.fn(),
    recordAudit: vi.fn(),
    sendOutboundEmail: vi.fn(),
    dbMock: {
      organization: { findUnique: vi.fn() },
      invite: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), delete: vi.fn(), updateMany: tx.invite.updateMany },
      membership: { findUnique: vi.fn(), create: tx.membership.create },
      $transaction: vi.fn(async (fn) => fn(tx)),
      __tx: tx,
    },
  };
});

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser,
  isAdmin: (user?: { role?: string | null }) => user?.role === "ADMIN",
}));
vi.mock("@/server/db", () => ({ db: dbMock }));
vi.mock("@/server/lib/audit", () => ({ recordAudit }));
vi.mock("@/lib/outbound", () => ({ sendOutboundEmail }));

import { inviteRouter } from "../src/server/routers/invite";

const owner = { id: "owner-1", email: "owner@example.com", name: "Owner", role: "PRO_PLANNER" };
const member = { id: "member-1", email: "member@example.com", name: "Member", role: "PRO_PLANNER" };
const validInvite = {
  id: "invite-1",
  orgId: "org-1",
  email: "member@example.com",
  role: "MEMBER",
  token: "token-1",
  accepted: false,
  expiresAt: new Date("2099-01-01T00:00:00.000Z"),
  createdAt: new Date("2027-01-01T00:00:00.000Z"),
};

describe("invite router protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue(owner);
    auth.mockResolvedValue({ user: { id: member.id, email: " Member@Example.com " } });
    dbMock.organization.findUnique.mockResolvedValue({
      id: "org-1",
      ownerId: owner.id,
      members: [{ userId: owner.id, role: "OWNER" }],
    });
    dbMock.invite.findUnique.mockResolvedValue(validInvite);
    dbMock.invite.findMany.mockResolvedValue([validInvite]);
    dbMock.membership.findUnique.mockResolvedValue(null);
    dbMock.__tx.invite.updateMany.mockResolvedValue({ count: 1 });
    recordAudit.mockResolvedValue(undefined);
    sendOutboundEmail.mockResolvedValue({ channel: "email", status: "NOT_CONFIGURED" });
  });

  it("guards pending invite reads to org owners/admins and excludes expired tokens", async () => {
    const caller = inviteRouter.createCaller({});

    await expect(caller.getInvites({ orgId: "org-1" })).resolves.toEqual([validInvite]);
    expect(dbMock.invite.findMany).toHaveBeenCalledWith({
      where: { orgId: "org-1", accepted: false, expiresAt: { gt: expect.any(Date) } },
      select: { id: true, orgId: true, email: true, role: true, expiresAt: true, accepted: true, createdAt: true },
    });
  });

  it("blocks non-admin org members from reading org invites", async () => {
    getCurrentUser.mockResolvedValueOnce({ ...owner, id: "viewer-1" });
    dbMock.organization.findUnique.mockResolvedValueOnce({
      id: "org-1",
      ownerId: owner.id,
      members: [{ userId: "viewer-1", role: "VIEWER" }],
    });
    const caller = inviteRouter.createCaller({});

    await expect(caller.getInvites({ orgId: "org-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects unknown, expired, reused, and wrong-email invite acceptance", async () => {
    const caller = inviteRouter.createCaller({});

    dbMock.invite.findUnique.mockResolvedValueOnce(null);
    await expect(caller.addMemberByInvite({ token: "missing" })).rejects.toMatchObject({ code: "NOT_FOUND" });

    dbMock.invite.findUnique.mockResolvedValueOnce({ ...validInvite, expiresAt: new Date("2020-01-01T00:00:00.000Z") });
    await expect(caller.addMemberByInvite({ token: "expired" })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    dbMock.invite.findUnique.mockResolvedValueOnce({ ...validInvite, accepted: true });
    await expect(caller.addMemberByInvite({ token: "used" })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    dbMock.invite.findUnique.mockResolvedValueOnce({ ...validInvite, email: "other@example.com" });
    await expect(caller.addMemberByInvite({ token: "wrong-email" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it("creates the invited org membership without allowing role upgrades on existing memberships", async () => {
    const caller = inviteRouter.createCaller({});

    await expect(caller.addMemberByInvite({ token: "token-1" })).resolves.toBe(true);
    expect(dbMock.__tx.membership.create).toHaveBeenCalledWith({
      data: { userId: "member-1", orgId: "org-1", role: "MEMBER" },
    });
    expect(dbMock.__tx.invite.updateMany).toHaveBeenCalledWith({
      where: { id: "invite-1", accepted: false },
      data: { accepted: true },
    });

    dbMock.membership.findUnique.mockResolvedValueOnce({ userId: "member-1", orgId: "org-1", role: "VIEWER" });
    await expect(caller.addMemberByInvite({ token: "token-1" })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
