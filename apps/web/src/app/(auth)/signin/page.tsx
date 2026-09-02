"use client";

import { useEffect, useState } from "react";
import { getCsrfToken, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button, Label, Card } from "@/components/ui";
import Link from "next/link";
import { sanitizeLocalRedirect } from "@/lib/safe-redirect";

type AuthProvidersResponse = Record<string, { id?: string; name?: string }> | null;

export default function SignInPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGoogleProviderEnabled, setIsGoogleProviderEnabled] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  // Support both callbackUrl (NextAuth standard) and redirect (legacy)
  // Default to /app which will route based on user role
  const callbackUrl = sanitizeLocalRedirect(searchParams.get("callbackUrl") || searchParams.get("redirect"));
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

    fetch("/api/auth/providers")
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as AuthProvidersResponse;
      })
      .then((providers) => {
        setIsGoogleProviderEnabled(Boolean(providers?.google));
      })
      .catch((err) => {
        console.error("[signin] failed to load auth providers", err);
        setIsGoogleProviderEnabled(false);
      });

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
    const targetUrl = origin ? `${origin}${targetPath}` : targetPath;

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
        nextUrl = sanitizeLocalRedirect(result.url, targetPath);
      }

      window.location.assign(nextUrl);
    } catch (err) {
      console.error("[signin] submit failed", err);
      setError("Unable to sign in right now. Please try again.");
      setIsLoading(false);
    }
  }

  async function onGoogleSignIn() {
    setError(null);
    setIsGoogleLoading(true);

    const targetPath = createEvent ? "/events/new?createEvent=true" : callbackUrl;
    const targetUrl = origin ? `${origin}${targetPath}` : targetPath;

    try {
      await signIn("google", { callbackUrl: targetUrl });
    } catch (err) {
      console.error("[signin] google submit failed", err);
      setError("Unable to sign in with Google right now. Please try again.");
      setIsGoogleLoading(false);
    }
  }

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
          {isGoogleProviderEnabled && (
            <>
              <div className="flex items-center gap-3 py-1" aria-hidden="true">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-500">or</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={isGoogleLoading}
                onClick={onGoogleSignIn}
              >
                {isGoogleLoading ? "Continuing with Google..." : "Continue with Google"}
              </Button>
            </>
          )}
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
