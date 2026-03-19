"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Label, Card } from "@/components/ui";
import Link from "next/link";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Support both callbackUrl (NextAuth standard) and redirect (legacy)
  // Default to /app which will route based on user role
  const callbackUrl = searchParams.get("callbackUrl") || searchParams.get("redirect") || "/app";
  const createEvent = searchParams.get("createEvent") === "true";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: createEvent ? "/events/new?createEvent=true" : callbackUrl,
      });
      if (res && res.ok) {
        // Check for pending data and redirect appropriately
        const pendingEvent = sessionStorage.getItem("pendingEvent");
        const pendingProPlanner = sessionStorage.getItem("pendingProPlannerSetup");
        const pendingVendorVenue = sessionStorage.getItem("pendingVendorVenueSetup");
        const pendingProvider = sessionStorage.getItem("pendingProviderOnboarding");
        const pendingDream = sessionStorage.getItem("pendingDreamEvent");

        if (pendingEvent && createEvent) {
          sessionStorage.removeItem("pendingEvent");
          router.push(`/events/new?createEvent=true`);
        } else if (pendingProPlanner) {
          sessionStorage.removeItem("pendingProPlannerSetup");
          router.push(`/professional-planner/setup?createOrg=true&data=${encodeURIComponent(pendingProPlanner)}&redirectTo=/pro/planner`);
        } else if (pendingProvider) {
          sessionStorage.removeItem("pendingProviderOnboarding");
          const providerData = JSON.parse(pendingProvider);
          const dashboardUrl = providerData.providerType === "vendor" ? "/vendor/dashboard" : "/venue/dashboard";
          router.push(`/providers/onboarding?providerType=${providerData.providerType}&autoSubmit=true&data=${encodeURIComponent(JSON.stringify(providerData.formData))}&redirectTo=${encodeURIComponent(dashboardUrl)}`);
        } else if (pendingVendorVenue) {
          sessionStorage.removeItem("pendingVendorVenueSetup");
          router.push(`/vendor-venue/setup?createOrg=true&data=${encodeURIComponent(pendingVendorVenue)}`);
        } else if (pendingDream) {
          sessionStorage.removeItem("pendingDreamEvent");
          router.push(`/event-dreamer/create?createDream=true&data=${encodeURIComponent(pendingDream)}`);
        } else if (createEvent) {
          router.push("/events/new?createEvent=true");
        } else {
          // Use the URL from response if available, otherwise use callbackUrl
          const targetUrl = res.url ?? callbackUrl;
          // Ensure the URL is a relative path as required by router.push
          // If the URL is absolute, convert it to a relative path
          let relativeUrl: string;
          try {
            const urlObj = new URL(targetUrl, window.location.origin);
            relativeUrl = urlObj.pathname + urlObj.search + urlObj.hash;
          } catch {
            // If targetUrl is already relative or URL constructor fails, use as is
            relativeUrl = targetUrl;
          }
          router.push(relativeUrl as any);
        }
        router.refresh();
      } else {
        // Sign-in failed - show error
        setError(res?.error ?? "Invalid credentials");
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message) {
        setError(error.message);
      } else {
        setError("An error occurred. Please try again.");
      }
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
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
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
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
