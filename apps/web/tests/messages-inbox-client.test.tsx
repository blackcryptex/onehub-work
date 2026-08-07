import * as React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

import { MessagesInboxClient } from "../src/components/messages/MessagesInboxClient";

const threads = [
  {
    id: "thread-1",
    subject: "Venue hold — Grand Hall",
    href: "/messages/thread-1",
    contextLabel: "Community Gala · Grand Hall",
    lastMessagePreview: "Can you confirm the hold?",
    lastMessageAt: "2027-01-01T01:00:00.000Z",
    participants: [
      { email: "planner@test.local", roleHint: "PRO_PLANNER" },
      { email: "venue@test.local", roleHint: "VENUE" },
    ],
  },
  {
    id: "thread-2",
    subject: "Catering quote follow-up",
    href: "/messages/thread-2",
    contextLabel: "Community Gala · Scout Catering",
    lastMessagePreview: "Updated service scope attached.",
    lastMessageAt: "2027-01-02T01:00:00.000Z",
    participants: [{ email: "vendor@test.local", roleHint: "VENDOR" }],
  },
];

describe("MessagesInboxClient", () => {
  it("shows event-community conversations with context, participants, and open links", () => {
    render(<MessagesInboxClient threads={threads} />);

    expect(screen.getByRole("heading", { name: "OneHub messages" })).toBeInTheDocument();
    expect(screen.getByText("Keep client, planner, vendor, and venue handoffs in one accountable place.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Venue hold — Grand Hall" })).toHaveAttribute("href", "/messages/thread-1");
    expect(screen.getByText("Community Gala · Grand Hall")).toBeInTheDocument();
    expect(screen.getByText("planner@test.local · venue@test.local")).toBeInTheDocument();
    expect(screen.getByText("Updated service scope attached.")).toBeInTheDocument();
  });

  it("shows a useful empty state instead of a blank inbox", () => {
    render(<MessagesInboxClient threads={[]} />);

    expect(screen.getByText("No active OneHub conversations yet.")).toBeInTheDocument();
    expect(screen.getByText(/Threads will appear after booking requests/)).toBeInTheDocument();
  });
});
