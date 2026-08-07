import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const eventCommandCenterSource = readFileSync(
  "apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx",
  "utf8",
);
const proDashboardSource = readFileSync(
  "apps/web/src/components/pro-planner/Dashboard.tsx",
  "utf8",
);

describe("Pro Planner event command center visual alignment", () => {
  it("exposes the richer app navigation shown in the approved event-specific reference", () => {
    for (const label of [
      "Home",
      "Events",
      "Bookings",
      "Calendar",
      "Contacts",
      "Vendors",
      "Finances",
      "Tasks",
      "Files",
      "Reports",
      "Marketplace",
      "Settings",
      "Help",
    ]) {
      expect(eventCommandCenterSource).toContain(`label: "${label}"`);
    }

    expect(eventCommandCenterSource).toContain("href: \"#workspace-requests-detail\"");
    expect(eventCommandCenterSource).toContain("href: \"#context-contacts\"");
    expect(eventCommandCenterSource).toContain("href: \"#workspace-budget\"");
    expect(eventCommandCenterSource).toContain("href: \"#workspace-timeline-detail\"");
  });

  it("keeps the main Pro Planner dashboard as a launcher into event command centers", () => {
    expect(proDashboardSource).toContain("Open Event Command Center");
    expect(proDashboardSource).toContain("Agency command deck");
    expect(proDashboardSource).not.toContain("Manage your events and client projects from here.");
  });

  it("preserves the event commerce spine and right rail instead of reducing the page to a generic dashboard", () => {
    for (const label of ["Discovery", "Shortlist", "Request", "Proposal", "Contract", "Payment", "Execution"]) {
      expect(eventCommandCenterSource).toContain(`label: "${label}"`);
    }

    for (const section of ["Next actions", "Recent activity", "Key contacts", "Risks and blocks"]) {
      expect(eventCommandCenterSource).toContain(section);
    }
  });
});
