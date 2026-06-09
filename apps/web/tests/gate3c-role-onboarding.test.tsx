import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { RoleOnboardingPanel } from "../src/components/onboarding/RoleOnboardingPanel";
import {
  GATE3C_MVP_ONBOARDING_ROLES,
  getRoleOnboarding,
  roleOnboardingItems,
} from "../src/lib/role-onboarding";
import {
  buildOnboardingCompletionEvent,
  ONBOARDING_COMPLETION_EVENT_NAME,
} from "../src/lib/onboarding-completion";
import { PUBLIC_SIGNUP_ROLES } from "../src/lib/signup-roles";

describe("Gate 3C role-specific onboarding content", () => {
  it("defines distinct onboarding for every Gate 3 MVP role", () => {
    expect(GATE3C_MVP_ONBOARDING_ROLES).toEqual([
      "DIY_PLANNER",
      "PRO_PLANNER",
      "VENDOR",
      "VENUE",
      "CLIENT",
      "ADMIN",
    ]);

    const items = roleOnboardingItems();
    expect(items).toHaveLength(6);
    expect(new Set(items.map((item) => item.role)).size).toBe(6);
    expect(new Set(items.map((item) => item.firstTrustAction)).size).toBe(6);

    for (const item of items) {
      expect(item.checklist.length).toBeGreaterThanOrEqual(3);
      expect(item.help).toContain(item.firstTrustAction);
      expect(item.completionKey).toBe(`gate3c:onboarding:${item.role}`);
    }
  });

  it("points each role to its first trust-engine action", () => {
    expect(getRoleOnboarding("DIY_PLANNER").firstTrustAction).toBe("Create your first event");
    expect(getRoleOnboarding("PRO_PLANNER").firstTrustAction).toBe("Create or manage a client event");
    expect(getRoleOnboarding("VENDOR").firstTrustAction).toBe("Complete and publish your vendor profile");
    expect(getRoleOnboarding("VENUE").firstTrustAction).toBe("Complete and publish your venue listing");
    expect(getRoleOnboarding("CLIENT").firstTrustAction).toBe("Review your shared event context");
    expect(getRoleOnboarding("ADMIN").firstTrustAction).toBe("Review trust oversight queues");
  });

  it("keeps Client and Admin out of public signup while still documenting onboarding", () => {
    expect(PUBLIC_SIGNUP_ROLES).toEqual(["DIY_PLANNER", "PRO_PLANNER", "VENDOR", "VENUE"]);
    expect(getRoleOnboarding("CLIENT").visibilityNote).toContain("invite/event-linked");
    expect(getRoleOnboarding("ADMIN").visibilityNote).toContain("manual/internal");
  });
});

describe("Gate 3C local onboarding completion instrumentation", () => {
  it("builds a local/server-safe completion event without external analytics or PII", () => {
    const event = buildOnboardingCompletionEvent("VENDOR", {
      userId: "user_secret_123",
      completedChecklistItems: ["profile", "listing"],
      source: "dashboard",
    });

    expect(event).toEqual({
      eventName: ONBOARDING_COMPLETION_EVENT_NAME,
      role: "VENDOR",
      completionKey: "gate3c:onboarding:VENDOR",
      completedChecklistItems: ["profile", "listing"],
      source: "dashboard",
      userHash: expect.stringMatching(/^local_[a-f0-9]{16}$/),
    });
    expect(JSON.stringify(event)).not.toContain("user_secret_123");
  });

  it("renders role help content and records local completion from the panel", () => {
    window.localStorage.clear();

    render(<RoleOnboardingPanel role="VENUE" />);

    expect(screen.getByText("Venue onboarding")).toBeTruthy();
    expect(screen.getByText("First trust-engine action: Complete and publish your venue listing")).toBeTruthy();
    expect(screen.getByTitle(getRoleOnboarding("VENUE").help)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Mark onboarding reviewed" }));

    expect(screen.getByRole("button", { name: "Onboarding noted locally" }).getAttribute("aria-pressed")).toBe("true");
    const stored = window.localStorage.getItem("gate3c:onboarding:VENUE");
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored ?? "{}")).toMatchObject({
      eventName: ONBOARDING_COMPLETION_EVENT_NAME,
      role: "VENUE",
      completionKey: "gate3c:onboarding:VENUE",
      source: "dashboard",
    });
  });
});
