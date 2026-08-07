import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import GuestsPane from "../src/components/panes/GuestsPane";
import type { EventItem } from "../src/lib/types.event";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock("@/lib/ai.service", () => ({
  aiGuestSeed: vi.fn(async () => []),
}));

const event: EventItem = {
  id: "event-1",
  name: "Scout Gala",
  date: "2027-05-01T18:00:00.000Z",
  progress: 20,
  guests: [],
};

describe("GuestsPane", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          guests: [
            {
              id: "guest-1",
              name: "Jane Smith",
              email: "jane@example.com",
              phone: "555-123-4567",
              rsvp: "yes",
            },
          ],
        }),
      })),
    );
  });

  it("saves a manually added guest instead of only mutating local state", async () => {
    const onUpdate = vi.fn();
    render(<GuestsPane event={event} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Guest" }));
    fireEvent.change(screen.getByLabelText("Guest name"), { target: { value: "Jane Smith" } });
    fireEvent.change(screen.getByLabelText("Guest email"), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText("Guest phone"), { target: { value: "555-123-4567" } });
    fireEvent.change(screen.getByLabelText("Guest RSVP"), { target: { value: "yes" } });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      "/api/diy/events/event-1/guests",
      expect.objectContaining({ method: "POST" }),
    ));
    expect(await screen.findByText("1 guest saved.")).toBeInTheDocument();
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
      guests: expect.arrayContaining([expect.objectContaining({ id: "guest-1", name: "Jane Smith" })]),
    }));
  });

  it("imports pasted guests through the guest API", async () => {
    const onUpdate = vi.fn();
    render(<GuestsPane event={event} onUpdate={onUpdate} />);

    fireEvent.change(screen.getByPlaceholderText("Jane Smith, jane@example.com, 555-123-4567, yes"), {
      target: { value: "Jane Smith, jane@example.com, 555-123-4567, yes" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import pasted guests" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      "/api/diy/events/event-1/guests",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Jane Smith"),
      }),
    ));
    expect(await screen.findByText("1 guest saved.")).toBeInTheDocument();
  });
});
