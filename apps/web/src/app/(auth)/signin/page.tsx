"use client";

import { useEffect, useState } from "react";
import { getCsrfToken, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button, Label, Card } from "@/components/ui";
import Link from "next/link";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  // Support both callbackUrl (NextAuth standard) and redirect (legacy)
  // Default to /app which will route based on user role
  const callbackUrl = searchParams.get("callbackUrl") || searchParams.get("redirect") || "/app";
  const createEvent = searchParams.get("createEvent") === "true";
  const authError = searchParams.get("error");
  const [origin, setOrigin] = useState("");

  const authErrorMessage =
    authError === "CredentialsSignin"
      ? "Invalid email or password. Please try again."
      : authError === "AccessDenied"
        ? "Access denied. Please sign in with an authorized account."
        : authError
          ? "Unable to sign in right now. Please try again."
          : null;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }

    getCsrfToken()
      .then((token) => {
        if (token) setCsrfToken(token);
      })
      .catch((err) => {
        console.error("[signin] failed to load csrf token", err);
        setError("Unable to start sign-in. Please refresh and try again.");
      });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!csrfToken) {
      setError("Unable to start sign-in. Please refresh and try again.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const targetPath = createEvent ? "/events/new?createEvent=true" : callbackUrl;
    const targetUrl = origin && targetPath.startsWith("/") ? `${origin}${targetPath}` : targetPath;

    try {
      const result = await signIn("credentials", {
        email,
        password,
        csrfToken,
        callbackUrl: targetUrl,
        redirect: false,
      });

      if (!result || result.error) {
        setError("Invalid email or password. Please try again.");
        setIsLoading(false);
        return;
      }

      let nextUrl = targetPath;

      if (result.url) {
        try {
          const resolved = new URL(result.url, origin || window.location.origin);
          if (resolved.origin === (origin || window.location.origin)) {
            nextUrl = `${resolved.pathname}${resolved.search}${resolved.hash}`;
          }
        } catch {
          nextUrl = targetPath;
        }
      }

      window.location.assign(nextUrl);
    } catch (err) {
      console.error("[signin] submit failed", err);
      setError("Unable to sign in right now. Please try again.");
      setIsLoading(false);
    }
  }

  const targetPath = createEvent ? "/events/new?createEvent=true" : callbackUrl;

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-12">
      <Card className="w-full p-6">
        <h1 className="text-xl font-semibold">Sign in</h1>
        {createEvent && (
          <p className="mt-2 text-sm text-indigo-600">
            Sign in to save your event. Your information has been saved.
          </p>
        )}
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="email">Email</Label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-soft focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-soft focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
            />
          </div>
          {(error || authErrorMessage) && (
            <p className="text-sm text-rose-600">{error || authErrorMessage}</p>
          )}
          <Button type="submit" className="w-full" disabled={isLoading || !csrfToken}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
          <p className="text-xs text-center text-slate-600 mt-3">
            {"Don't have an account?"}{" "}
            <Link
              href={createEvent ? `/signup?callbackUrl=${encodeURIComponent("/events/new?createEvent=true")}&createEvent=true` : `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="text-indigo-600 hover:underline"
            >
              Create account
            </Link>
          </p>
        </form>
      </Card>
    </main>
  );
}
