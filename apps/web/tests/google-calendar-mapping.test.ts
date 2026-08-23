import { describe, expect, it } from "vitest";
import { oneHubCalendarEventToGoogleEvent } from "../src/lib/google.calendar";

describe("Google calendar mapping for OneHub calendar records", () => {
  it("adds stable private mapping properties for duplicate-safe push sync", () => {
    const payload = oneHubCalendarEventToGoogleEvent({
      id: "cal-123",
      title: "Venue walkthrough",
      description: "Confirm loading dock access",
      location: "Hotel ballroom",
      startAt: new Date("2027-05-01T15:00:00.000Z"),
      endAt: new Date("2027-05-01T16:00:00.000Z"),
      allDay: false,
    });

    expect(payload).toMatchObject({
      summary: "Venue walkthrough",
      description: "Confirm loading dock access",
      location: "Hotel ballroom",
      start: { dateTime: "2027-05-01T15:00:00.000Z" },
      end: { dateTime: "2027-05-01T16:00:00.000Z" },
      extendedProperties: {
        private: {
          onehubEntityType: "calendarEvent",
          onehubEntityId: "cal-123",
        },
      },
    });
  });

  it("maps all-day OneHub calendar records to Google date events", () => {
    const payload = oneHubCalendarEventToGoogleEvent({
      id: "cal-all-day",
      title: "Wedding day",
      startAt: new Date("2027-06-10T00:00:00.000Z"),
      endAt: new Date("2027-06-11T00:00:00.000Z"),
      allDay: true,
    });

    expect(payload.start).toEqual({ date: "2027-06-10" });
    expect(payload.end).toEqual({ date: "2027-06-11" });
  });
});
