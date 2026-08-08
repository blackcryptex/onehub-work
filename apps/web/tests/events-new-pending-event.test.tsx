import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { push, sessionState, searchParams } = vi.hoisted(() => ({
  push: vi.fn(),
  sessionState: {
    current: {
      data: { user: { id: "planner-1", role: "DIY_PLANNER" } },
      status: "authenticated",
    },
  },
  searchParams: { current: new URLSearchParams("createEvent=true") },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams.current,
}));

vi.mock("next-auth/react", () => ({
  useSession: () => sessionState.current,
}));

vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({ children, href, ...props }: { children?: React.ReactNode; href: string }) =>
      React.createElement("a", { href, ...props }, children),
  };
});

vi.mock("@/components/events/ClientIntakeStep", () => ({
  ClientIntakeStep: () => <div>Client intake</div>,
}));

import EventWizardPage from "../src/app/events/new/page";

const pendingEvent = {
  name: "Pending Restore Gala",
  event_type_raw: "wedding",
  date: "2026-10-12",
  city: "Atlanta",
  state: "GA",
  zipCode: "30301",
  headcount: "120",
  budget_raw: "$25,000",
  venue: "",
  objective: "Test the sign-in continuation path",
  style: "Modern trust-centered celebration",
};

describe("events/new pending event continuation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, "", "/events/new?createEvent=true");
    window.sessionStorage.clear();
    window.sessionStorage.setItem("pendingEvent", JSON.stringify(pendingEvent));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          slug: "pending-restore-gala-abcd",
          eventId: "event-1",
          event: { id: "event-1", name: pendingEvent.name },
        }),
      }),
    );
  });

  it("creates the restored pending event after sign-in and routes to the DIY vault", async () => {
    render(<EventWizardPage />);

    await waitFor(
      () => expect(fetch).toHaveBeenCalledWith(
        "/api/events/create",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Pending Restore Gala"),
        }),
      ),
      { timeout: 1500 },
    );

    expect(push).toHaveBeenCalledWith("/diy-planner/vault/pending-restore-gala-abcd");
    expect(window.sessionStorage.getItem("pendingEvent")).toBeNull();
  });
});
