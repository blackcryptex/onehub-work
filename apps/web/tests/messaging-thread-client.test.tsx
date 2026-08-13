import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

import { MessagingThreadClient } from "../src/components/messages/MessagingThreadClient";

const initialThread = {
  id: "thread-1",
  subject: "Booking request: Catering",
  participants: [
    { id: "p1", email: "client@test.local", roleHint: "CLIENT" },
    { id: "p2", email: "vendor@test.local", roleHint: "VENDOR" },
  ],
  messages: [{ id: "m1", bodyMd: "Hello", senderId: "client-1", createdAt: "2027-01-01T00:00:00.000Z" }],
};

describe("MessagingThreadClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the internal thread and persists a new reply", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { id: "m2", bodyMd: "We can help.", senderId: "vendor-1", createdAt: "2027-01-01T01:00:00.000Z" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MessagingThreadClient thread={initialThread} />);

    expect(screen.getByRole("heading", { name: "Booking request: Catering" })).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Type a message inside OneHub..."), { target: { value: "We can help." } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/messages/threads/thread-1",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ bodyMd: "We can help." }) }),
    ));
    expect(await screen.findByText("We can help.")).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
