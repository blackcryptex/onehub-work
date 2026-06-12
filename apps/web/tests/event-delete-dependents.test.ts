import { describe, expect, it, vi } from "vitest";

import { deleteEventWithDependents, EventDeleteBlockedError } from "../src/server/events/delete-event";

type MockTx = ReturnType<typeof makeTx>;

function makeTx(overrides: Partial<MockTx> = {}) {
  const calls: string[] = [];
  const tx = {
    calls,
    activity: { updateMany: vi.fn(async () => calls.push("activity.updateMany")) },
    media: { updateMany: vi.fn(async () => calls.push("media.updateMany")) },
    thread: { updateMany: vi.fn(async () => calls.push("thread.updateMany")) },
    dispute: { updateMany: vi.fn(async () => calls.push("dispute.updateMany")) },
    calendarEvent: { updateMany: vi.fn(async () => calls.push("calendarEvent.updateMany")) },
    bookingRequest: { deleteMany: vi.fn(async () => calls.push("bookingRequest.deleteMany")) },
    proposal: { count: vi.fn(async () => 0) },
    contract: { count: vi.fn(async () => 0) },
    escrowAccount: { count: vi.fn(async () => 0) },
    deposit: { count: vi.fn(async () => 0) },
    paymentIntent: { count: vi.fn(async () => 0) },
    event: {
      delete: vi.fn(async () => calls.push("event.delete")),
      update: vi.fn(async () => calls.push("event.update")),
    },
  };

  return Object.assign(tx, overrides);
}

function makePrisma(tx: MockTx) {
  return {
    $transaction: vi.fn(async (callback: (client: MockTx) => Promise<void>) => callback(tx)),
  };
}

describe("event deletion dependents", () => {
  it("hard deletes draft events without commerce links after detaching safe dependents", async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);

    await expect(deleteEventWithDependents(prisma, "event_123")).resolves.toEqual({
      action: "deleted",
    });

    expect(tx.bookingRequest.deleteMany).toHaveBeenCalledWith({ where: { eventId: "event_123" } });
    expect(tx.event.delete).toHaveBeenCalledWith({ where: { id: "event_123" } });
    expect(tx.event.update).not.toHaveBeenCalled();
    expect(tx.calls.indexOf("bookingRequest.deleteMany")).toBeLessThan(tx.calls.indexOf("event.delete"));
  });

  it("cleans booking requests before hard deleting otherwise safe events", async () => {
    const tx = makeTx();
    const prisma = makePrisma(tx);

    await deleteEventWithDependents(prisma, "event_with_booking");

    expect(tx.bookingRequest.deleteMany).toHaveBeenCalledWith({ where: { eventId: "event_with_booking" } });
    expect(tx.event.delete).toHaveBeenCalledWith({ where: { id: "event_with_booking" } });
    expect(tx.calls).toEqual(expect.arrayContaining(["bookingRequest.deleteMany", "event.delete"]));
    expect(tx.calls.indexOf("bookingRequest.deleteMany")).toBeLessThan(tx.calls.indexOf("event.delete"));
  });

  it("cancels and preserves proposal-linked events instead of hard deleting them", async () => {
    const tx = makeTx({
      proposal: { count: vi.fn(async () => 1) },
    } as Partial<MockTx>);
    const prisma = makePrisma(tx);

    await expect(deleteEventWithDependents(prisma, "event_with_proposal")).resolves.toEqual({
      action: "canceled",
      reason: expect.stringContaining("commerce-linked"),
    });

    expect(tx.event.update).toHaveBeenCalledWith({
      where: { id: "event_with_proposal" },
      data: { status: "CANCELED" },
    });
    expect(tx.event.delete).not.toHaveBeenCalled();
    expect(tx.bookingRequest.deleteMany).not.toHaveBeenCalled();
  });

  it("cancels and preserves contract, escrow, or payment-linked events instead of hard deleting them", async () => {
    const tx = makeTx({
      contract: { count: vi.fn(async () => 1) },
      escrowAccount: { count: vi.fn(async () => 1) },
      paymentIntent: { count: vi.fn(async () => 1) },
    } as Partial<MockTx>);
    const prisma = makePrisma(tx);

    await expect(deleteEventWithDependents(prisma, "event_with_money")).resolves.toEqual({
      action: "canceled",
      reason: "This commerce-linked event has proposal, contract, escrow, or payment history and was canceled instead of deleted to preserve commerce records.",
    });

    expect(tx.event.update).toHaveBeenCalledWith({
      where: { id: "event_with_money" },
      data: { status: "CANCELED" },
    });
    expect(tx.event.delete).not.toHaveBeenCalled();
  });
});

describe("EventDeleteBlockedError", () => {
  it("carries a safe user-facing message", () => {
    const error = new EventDeleteBlockedError("safe message");

    expect(error.message).toBe("safe message");
    expect(error.name).toBe("EventDeleteBlockedError");
  });
});
