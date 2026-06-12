import { describe, expect, it, vi } from "vitest";

import { buildEventDeleteActivityRecord, buildEventDeleteApiResponse } from "../src/server/events/delete-event";
import {
  applyEventDeleteResult,
  eventDeleteResultMessage,
  parseEventDeleteResult,
  type EventDeleteUiEvent,
} from "../src/lib/event-delete-lifecycle";

const commerceMessage =
  "This commerce-linked event has proposal, contract, escrow, or payment history and was canceled instead of deleted to preserve commerce records.";

describe("event delete/archive API response lifecycle", () => {
  it("surfaces preserved commerce-linked deletes as archived cancellation responses", () => {
    expect(buildEventDeleteApiResponse({ action: "canceled", reason: commerceMessage })).toEqual({
      success: true,
      action: "canceled",
      archived: true,
      message: commerceMessage,
    });
  });

  it("keeps non-commerce deletes as hard-delete responses", () => {
    expect(buildEventDeleteApiResponse({ action: "deleted" })).toEqual({
      success: true,
      action: "deleted",
      archived: false,
      message: "Event deleted successfully.",
    });
  });

  it("records commerce-linked preserves as canceled activity instead of deleted activity", () => {
    expect(buildEventDeleteActivityRecord("event_money", { action: "canceled", reason: commerceMessage })).toEqual({
      eventId: "event_money",
      action: "EVENT_CANCELED",
      target: "event_money",
      meta: {
        lifecycleAction: "canceled",
        archived: true,
        message: commerceMessage,
        preservedCommerceLinkedRecords: true,
      },
    });
  });

  it("preserves hard deletes as deleted activity without linking to a deleted event row", () => {
    expect(buildEventDeleteActivityRecord("event_safe", { action: "deleted" })).toEqual({
      eventId: null,
      action: "EVENT_DELETED",
      target: "event_safe",
      meta: {
        lifecycleAction: "deleted",
        archived: false,
      },
    });
  });
});

describe("event delete/archive route activity semantics", () => {
  it("records canceled activity only after the commerce-linked delete lifecycle resolves", async () => {
    vi.resetModules();
    const calls: string[] = [];
    const event = {
      id: "event_money",
      slug: "event-money",
      orgId: "org_123",
      org: { members: [] },
      createdBy: { id: "user_123" },
    };
    const user = { id: "user_123", role: "PLANNER" };
    const prisma = {
      event: {
        findFirst: vi.fn(async () => event),
      },
    };
    const recordActivity = vi.fn(async () => {
      calls.push("activity");
    });
    const deleteEventWithDependents = vi.fn(async () => {
      calls.push("deleteEventWithDependents");
      return { action: "canceled" as const, reason: commerceMessage };
    });

    vi.doMock("@/lib/auth-helpers", () => ({ getCurrentUser: vi.fn(async () => user) }));
    vi.doMock("@/lib/rbac", () => ({ canViewEvent: vi.fn(), canDeleteEvent: vi.fn(() => true) }));
    vi.doMock("@/lib/prisma", () => ({ prisma }));
    vi.doMock("@/server/lib/activity", () => ({ recordActivity }));
    vi.doMock("@/server/events/delete-event", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../src/server/events/delete-event")>();
      return { ...actual, deleteEventWithDependents };
    });

    const { DELETE } = await import("../src/app/api/events/[eventSlug]/route");
    const response = await DELETE(new Request("https://onehub.test/api/events/event-money", { method: "DELETE" }) as never, {
      params: { eventSlug: "event-money" },
    });

    await expect(response.json()).resolves.toEqual({
      success: true,
      action: "canceled",
      archived: true,
      message: commerceMessage,
    });
    expect(calls).toEqual(["deleteEventWithDependents", "activity"]);
    expect(recordActivity).toHaveBeenCalledWith({
      orgId: "org_123",
      eventId: "event_money",
      actorId: "user_123",
      action: "EVENT_CANCELED",
      target: "event_money",
      meta: {
        lifecycleAction: "canceled",
        archived: true,
        message: commerceMessage,
        preservedCommerceLinkedRecords: true,
      },
    });
  });
});

describe("event delete/archive UI lifecycle", () => {
  it("uses cancellation/archive copy instead of deleted copy for commerce-linked preserves", () => {
    const result = parseEventDeleteResult({
      success: true,
      action: "canceled",
      archived: true,
      message: commerceMessage,
    });

    expect(eventDeleteResultMessage(result)).toBe(commerceMessage);
  });

  it("removes hard-deleted events from Pro Planner local state", () => {
    const events: EventDeleteUiEvent[] = [
      { id: "event_safe", status: "PLANNING" },
      { id: "event_other", status: "ACTIVE" },
    ];

    expect(applyEventDeleteResult(events, "event_safe", { action: "deleted", archived: false })).toEqual([
      { id: "event_other", status: "ACTIVE" },
    ]);
  });

  it("preserves commerce-linked Pro Planner events locally as canceled instead of removing them", () => {
    const events: EventDeleteUiEvent[] = [
      { id: "event_money", status: "ACTIVE" },
      { id: "event_other", status: "PLANNING" },
    ];

    expect(applyEventDeleteResult(events, "event_money", { action: "canceled", archived: true })).toEqual([
      { id: "event_money", status: "CANCELED" },
      { id: "event_other", status: "PLANNING" },
    ]);
  });
});
