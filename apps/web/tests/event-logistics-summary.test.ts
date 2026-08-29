import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, canViewEvent, isOrgMember } = vi.hoisted(() => ({
  db: {
    event: { findUnique: vi.fn() },
    availabilitySlot: { findMany: vi.fn() },
  },
  canViewEvent: vi.fn(),
  isOrgMember: vi.fn(),
}));

vi.mock("@/server/db", () => ({ db }));
vi.mock("@/lib/rbac", () => ({ canViewEvent, isOrgMember }));

import { getEventLogisticsSummary } from "../src/server/lib/event-logistics-summary";
import type { AppUser } from "../src/lib/auth-helpers";

const now = new Date("2027-06-01T12:00:00.000Z");
const baseEvent = {
  id: "event-1",
  name: "Smith Wedding Weekend",
  slug: "smith-wedding-weekend",
  orgId: "org-1",
  createdById: "planner-1",
  startAt: new Date("2027-06-14T17:00:00.000Z"),
  endAt: new Date("2027-06-15T02:00:00.000Z"),
  status: "PLANNING",
  org: { id: "org-1", ownerId: "planner-owner-1", members: [{ userId: "planner-1", role: "ADMIN" }] },
  stakeholders: [{ userId: "client-1", role: "CLIENT" }],
  shares: [{ viewerUserId: "client-1", scope: "SUMMARY" }],
  milestones: [
    { id: "milestone-1", title: "Final walkthrough", dueAt: new Date("2027-05-31T17:00:00.000Z"), done: false },
  ],
  tasks: [
    { id: "task-1", title: "Confirm rentals", status: "BLOCKED", priority: "HIGH", dueAt: new Date("2027-06-02T17:00:00.000Z"), blockerReason: "Waiting on venue floorplan", createdAt: now },
  ],
  checklists: [
    { id: "checklist-1", title: "Event ops", items: [{ id: "check-1", title: "Confirm load-in", dueAt: new Date("2027-06-03T17:00:00.000Z"), done: false }] },
  ],
  calendarEvents: [
    { id: "cal-1", title: "Planner walkthrough", startAt: new Date("2027-06-04T17:00:00.000Z"), endAt: new Date("2027-06-04T18:00:00.000Z"), visibility: "private" },
  ],
  bookingRequests: [
    {
      id: "request-1",
      listingId: "listing-1",
      orgId: "org-1",
      eventId: "event-1",
      startAt: new Date("2027-06-14T17:00:00.000Z"),
      endAt: new Date("2027-06-15T02:00:00.000Z"),
      status: "PENDING",
      notes: null,
      listing: { id: "listing-1", title: "Avery Florals", type: "VENDOR", orgId: "provider-org-1", org: { members: [{ userId: "provider-1", role: "OWNER" }] } },
    },
  ],
  crisisIssues: [
    {
      id: "issue-1",
      title: "Florist canceled week of event",
      status: "IMPACT_REVIEW",
      severity: "CRITICAL",
      createdAt: new Date("2027-06-01T11:00:00.000Z"),
      replacementSearchStartedAt: null,
      impactSummary: "Vendor cancellation affects setup timeline.",
      recommendedNextAction: "Start replacement provider review before changing contracts or money.",
    },
  ],
};

describe("event logistics summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canViewEvent.mockReturnValue(true);
    isOrgMember.mockReturnValue(true);
    db.event.findUnique.mockResolvedValue(baseEvent);
    db.availabilitySlot.findMany.mockResolvedValue([
      {
        id: "slot-1",
        listingId: "listing-1",
        startAt: new Date("2027-06-14T16:00:00.000Z"),
        endAt: new Date("2027-06-15T03:00:00.000Z"),
        status: "HOLD",
        note: "bookingRequest:request-1 | event:event-1",
        listing: { id: "listing-1", title: "Avery Florals", type: "VENDOR" },
      },
    ]);
  });

  it("normalizes timeline, tasks, calendar, booking, availability, and crisis sources into one prioritized loop", async () => {
    const summary = await getEventLogisticsSummary({ eventId: "event-1", actor: { id: "planner-1", role: "PRO_PLANNER" } as AppUser, now });

    expect(summary.items.map((item) => item.sourceType)).toEqual(expect.arrayContaining([
      "event",
      "milestone",
      "task",
      "checklist_item",
      "calendar_event",
      "booking_request",
      "availability_slot",
      "crisis_issue",
    ]));
    expect(summary.nextAction).toEqual(expect.objectContaining({ sourceType: "crisis_issue", severity: "critical" }));
    expect(summary.lateItems).toEqual(expect.arrayContaining([expect.objectContaining({ sourceId: "milestone-1" })]));
    expect(summary.roleNextActions.provider).toEqual(expect.objectContaining({ sourceType: "crisis_issue" }));
    expect(db.availabilitySlot.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ listingId: { in: ["listing-1"] } }),
    }));
  });

  it("filters client output to client-safe event, milestone, calendar, and crisis actions", async () => {
    const summary = await getEventLogisticsSummary({ eventId: "event-1", actor: { id: "client-1", role: "CLIENT" } as AppUser, now });

    expect(summary.items.some((item) => item.sourceType === "task")).toBe(false);
    expect(summary.items.some((item) => item.sourceType === "booking_request")).toBe(false);
    expect(summary.items.map((item) => item.sourceType)).toEqual(expect.arrayContaining(["event", "milestone", "calendar_event", "crisis_issue"]));
    expect(summary.roleNextActions.client).toEqual(expect.objectContaining({ sourceType: "crisis_issue" }));
  });
});
