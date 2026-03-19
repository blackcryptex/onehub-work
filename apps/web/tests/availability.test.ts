import { describe, it, expect } from "vitest";

describe("Availability overlap detection", () => {
  it("detects overlapping slots", () => {
    const slot1 = { startAt: new Date("2024-01-01T10:00"), endAt: new Date("2024-01-01T12:00") };
    const slot2 = { startAt: new Date("2024-01-01T11:00"), endAt: new Date("2024-01-01T13:00") };
    const overlaps = slot1.endAt > slot2.startAt && slot1.startAt < slot2.endAt;
    expect(overlaps).toBe(true);
  });

  it("does not detect non-overlapping slots", () => {
    const slot1 = { startAt: new Date("2024-01-01T10:00"), endAt: new Date("2024-01-01T12:00") };
    const slot2 = { startAt: new Date("2024-01-01T14:00"), endAt: new Date("2024-01-01T16:00") };
    const overlaps = slot1.endAt > slot2.startAt && slot1.startAt < slot2.endAt;
    expect(overlaps).toBe(false);
  });
});

