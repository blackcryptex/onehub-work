import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { getCsrfToken, searchParams, signIn } = vi.hoisted(() => ({
  getCsrfToken: vi.fn(),
  searchParams: { current: new URLSearchParams() },
  signIn: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  getCsrfToken,
  signIn,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams.current,
}));

vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({ children, href, ...props }: { children?: React.ReactNode; href: string }) =>
      React.createElement("a", { href, ...props }, children),
  };
});

vi.mock("@/components/ui", async () => {
  const React = await import("react");
  return {
    Button: ({ children, variant: _variant, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) =>
      React.createElement("button", props, children),
    Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
      React.createElement("div", props, children),
    Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) =>
      React.createElement("label", props, children),
  };
});

import SignInPage from "../src/app/(auth)/signin/page";

function mockProviders(providers: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(providers),
    }),
  );
}

describe("sign in Google provider UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams.current = new URLSearchParams();
    getCsrfToken.mockResolvedValue("csrf-token");
    signIn.mockResolvedValue(undefined);
    mockProviders({ credentials: { id: "credentials", name: "Credentials" } });
  });

  it("hides Google sign-in when the Google provider is not active", async () => {
    render(<SignInPage />);

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/auth/providers"));

    expect(screen.queryByRole("button", { name: /continue with google/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows Google sign-in when the Google provider is active", async () => {
    mockProviders({
      credentials: { id: "credentials", name: "Credentials" },
      google: { id: "google", name: "Google" },
    });

    render(<SignInPage />);

    expect(await screen.findByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("preserves planner callbackUrl when starting Google sign-in", async () => {
    searchParams.current = new URLSearchParams("callbackUrl=%2Fpro%2Fplanner");
    mockProviders({
      credentials: { id: "credentials", name: "Credentials" },
      google: { id: "google", name: "Google" },
    });

    render(<SignInPage />);

    fireEvent.click(await screen.findByRole("button", { name: /continue with google/i }));

    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith("google", {
        callbackUrl: expect.stringContaining("/pro/planner"),
      }),
    );
  });
});
