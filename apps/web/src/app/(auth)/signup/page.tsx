"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Label, Card } from "@/components/ui";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const createEvent = searchParams.get("createEvent") === "true";
  const roleParam = searchParams.get("role");
  // Removed unused: setupParam, createDream
  // Support both callbackUrl (NextAuth standard) and redirect (legacy)
  // Default to /app which will route based on user role
  const callbackUrl = searchParams.get("callbackUrl") || searchParams.get("redirect") || "/app";
  const defaultRole = roleParam || "DIY_PLANNER";

  // Check for pending event data
  useEffect(() => {
    const pendingEvent = sessionStorage.getItem("pendingEvent");
    if (pendingEvent && createEvent) {
      // Show message that event will be created after signup
    }
  }, [createEvent]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, role: defaultRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to create account");
        setIsLoading(false);
        return;
      }

      // Sign in automatically after signup using NextAuth
      const { signIn } = await import("next-auth/react");
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: callbackUrl,
      });

      if (signInResult && signInResult.ok) {
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
          // Auto-submit the setup form, then redirect to Pro Planner Dashboard
          router.push(`/professional-planner/setup?createOrg=true&data=${encodeURIComponent(pendingProPlanner)}&redirectTo=/pro/planner`);
        } else if (pendingProvider) {
          sessionStorage.removeItem("pendingProviderOnboarding");
          const providerData = JSON.parse(pendingProvider);
          const dashboardUrl = providerData.providerType === "vendor" ? "/vendor/dashboard" : "/venue/dashboard";
          // Redirect to onboarding with auto-submit flag - the onboarding page will handle the publish and redirect
          router.push(`/providers/onboarding?providerType=${providerData.providerType}&autoSubmit=true&data=${encodeURIComponent(JSON.stringify(providerData.formData))}&redirectTo=${encodeURIComponent(dashboardUrl)}`);
        } else if (pendingVendorVenue) {
          sessionStorage.removeItem("pendingVendorVenueSetup");
          router.push(`/vendor-venue/setup?createOrg=true&data=${encodeURIComponent(pendingVendorVenue)}`);
        } else if (pendingDream) {
          sessionStorage.removeItem("pendingDreamEvent");
          router.push(`/event-dreamer/create?createDream=true&data=${encodeURIComponent(pendingDream)}`);
        } else {
          // Use the URL from response if available, otherwise use callbackUrl
          const targetUrl = signInResult.url ?? callbackUrl;
          // router.push expects a RouteImpl<string>, but we get a string URL from signInResult/callbackUrl.
          // The push method allows string anyway, but to avoid type error, cast as any.
          router.push(targetUrl as any);
        }
        router.refresh();
      } else {
        // Signup succeeded but signin failed, redirect to signin
        router.push(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }
    } catch (error) {
      console.error("Signup error:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-12">
      <Card className="w-full p-6">
        <h1 className="text-xl font-semibold">Create account</h1>
        {createEvent && (
          <p className="mt-2 text-sm text-indigo-600">
            {"After creating your account, we'll save your event and you can start planning!"}
          </p>
        )}
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            <p className="mt-1 text-xs text-slate-500">Must be at least 6 characters</p>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create Account"}
          </Button>
          <p className="text-xs text-center text-slate-600">
            Already have an account?{" "}
            <Link href="/signin" className="text-indigo-600 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </Card>
    </main>
  );
}
