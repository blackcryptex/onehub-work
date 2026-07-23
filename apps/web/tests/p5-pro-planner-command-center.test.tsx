import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/ui", () => ({
  Button: ({
    children,
    className,
    onClick,
    disabled,
  }: React.PropsWithChildren<{
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
  }>) => (
    <button className={className} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

import {
  chipClassForSpineState,
  computeEventProgress,
  eventDeleteSemantics,
  spineStepState,
} from "@/lib/event-command-center";
import { EventActions } from "@/components/events/EventActions";

describe("P5 Pro Planner command center truth-state", () => {
  describe("spineStepState", () => {
    it("labels completed steps Done instead of Happened", () => {
      expect(spineStepState({ happened: true, blocked: false })).toBe("Done");
    });

    it("labels blocked steps Blocked", () => {
      expect(spineStepState({ happened: false, blocked: true })).toBe("Blocked");
    });

    it("labels remaining steps Pending", () => {
      expect(spineStepState({ happened: false, blocked: false })).toBe("Pending");
    });

    it("keeps Done priority when a completed step is also flagged blocked", () => {
      expect(spineStepState({ happened: true, blocked: true })).toBe("Done");
    });
  });

  describe("chipClassForSpineState", () => {
    it("maps Done to emerald, Blocked to rose, Pending to amber", () => {
      expect(chipClassForSpineState("Done")).toContain("emerald");
      expect(chipClassForSpineState("Blocked")).toContain("rose");
      expect(chipClassForSpineState("Pending")).toContain("amber");
    });
  });

  describe("computeEventProgress", () => {
    it("returns 0 when no work exists anywhere", () => {
      expect(
        computeEventProgress({
          checklistDone: 0,
          checklistTotal: 0,
          commerceStepsDone: 0,
          commerceStepsTotal: 7,
        }),
      ).toBe(0);
    });

    it("does not report false 0% when commerce work exists but checklist is empty", () => {
      const progress = computeEventProgress({
        checklistDone: 0,
        checklistTotal: 0,
        commerceStepsDone: 3,
        commerceStepsTotal: 7,
      });
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBe(Math.round((3 / 7) * 100));
    });

    it("does not report false 0% when checklist work exists but commerce is empty", () => {
      const progress = computeEventProgress({
        checklistDone: 2,
        checklistTotal: 4,
        commerceStepsDone: 0,
        commerceStepsTotal: 7,
      });
      expect(progress).toBeGreaterThan(0);
    });

    it("blends checklist and commerce progress when both exist", () => {
      const progress = computeEventProgress({
        checklistDone: 4,
        checklistTotal: 4,
        commerceStepsDone: 7,
        commerceStepsTotal: 7,
      });
      expect(progress).toBe(100);
    });

    it("never exceeds 100 or drops below 0", () => {
      expect(
        computeEventProgress({
          checklistDone: 10,
          checklistTotal: 4,
          commerceStepsDone: 9,
          commerceStepsTotal: 7,
        }),
      ).toBeLessThanOrEqual(100);
    });
  });

  describe("eventDeleteSemantics", () => {
    it("keeps hard delete for non-commerce events", () => {
      const semantics = eventDeleteSemantics(false);
      expect(semantics.label).toBe("Delete");
      expect(semantics.busyLabel).toBe("Deleting...");
      expect(semantics.confirmMessage("Gala")).toContain("cannot be undone");
    });

    it("presents cancel-and-archive, not hard delete, for commerce-linked events", () => {
      const semantics = eventDeleteSemantics(true);
      expect(semantics.label).toBe("Cancel & archive");
      expect(semantics.busyLabel).toBe("Canceling...");
      expect(semantics.confirmMessage("Gala")).toContain("canceled and archived");
      expect(semantics.confirmMessage("Gala")).not.toContain("cannot be undone");
    });
  });

  describe("EventActions delete affordance", () => {
    it("shows Delete for events without commerce links", () => {
      render(
        <EventActions
          role="PRO_PLANNER"
          eventSlug="gala"
          eventId="evt_1"
          eventName="Gala"
          canEdit={false}
          canDelete
        />,
      );
      expect(screen.getByRole("button", { name: /Delete/ })).toBeTruthy();
      expect(screen.queryByRole("button", { name: /Cancel & archive/ })).toBeNull();
    });

    it("shows Cancel & archive instead of Delete for commerce-linked events", () => {
      render(
        <EventActions
          role="PRO_PLANNER"
          eventSlug="gala"
          eventId="evt_1"
          eventName="Gala"
          canEdit={false}
          canDelete
          commerceLinked
        />,
      );
      expect(screen.getByRole("button", { name: /Cancel & archive/ })).toBeTruthy();
      expect(screen.queryByRole("button", { name: /^Delete/ })).toBeNull();
    });
  });
});
