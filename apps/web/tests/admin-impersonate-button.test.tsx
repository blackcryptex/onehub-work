import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { push, refresh, update, sessionState } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  update: vi.fn(),
  sessionState: {
    current: {
      user: {
        id: "admin-user",
      },
    },
  },
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: sessionState.current, update }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@onehub/ui", async () => {
  const React = await import("react");
  return {
    Button: ({ children, variant: _variant, size: _size, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) =>
      React.createElement("button", props, children),
  };
}, { virtual: true });

import { ImpersonateButton } from "../src/components/admin/ImpersonateButton";

describe("ImpersonateButton break-glass flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionState.current = {
      user: {
        id: "admin-user",
      },
    };
    update.mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          sessionUpdate: { impersonationTransition: "signed-token" },
        }),
      }),
    );
  });

  it("requires break-glass reason and incident ticket before starting impersonation", () => {
    render(<ImpersonateButton userId="target-user" userEmail="client@example.com" />);

    expect(screen.getByLabelText(/break-glass reason/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/incident ticket/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view as/i })).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends break-glass fields when starting impersonation", async () => {
    render(<ImpersonateButton userId="target-user" userEmail="client@example.com" />);

    fireEvent.change(screen.getByLabelText(/break-glass reason/i), {
      target: { value: "Investigate client-reported planner issue" },
    });
    fireEvent.change(screen.getByLabelText(/incident ticket/i), {
      target: { value: "INC-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /view as/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      "/api/admin/impersonate",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: "target-user",
          reason: "Investigate client-reported planner issue",
          incidentTicketId: "INC-1234",
        }),
      }),
    ));
    expect(update).toHaveBeenCalledWith({ impersonationTransition: "signed-token" });
    expect(push).toHaveBeenCalledWith("/app");
    expect(refresh).toHaveBeenCalled();
  });

  it("preserves stop impersonation behavior without break-glass inputs", async () => {
    sessionState.current = {
      user: {
        id: "target-user",
        realUserId: "admin-user",
        actingUserId: "target-user",
      },
    };

    render(<ImpersonateButton userId="target-user" userEmail="client@example.com" />);

    expect(screen.queryByLabelText(/break-glass reason/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /stop impersonating/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/admin/stop-impersonate", { method: "POST" }));
    expect(push).toHaveBeenCalledWith("/admin/overview");
  });
});
