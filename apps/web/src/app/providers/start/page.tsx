"use client";

import { useRouter } from "next/navigation";
import { Card, Button } from "@/components/ui";
import { Store, Building2, ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function ProviderStartPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isChecking, setIsChecking] = useState(true);

  // Check auth and redirect appropriately
  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      // Not signed in - redirect to sign-in with callback
      router.push(`/signin?callbackUrl=${encodeURIComponent("/providers/start")}`);
      return;
    }

    // Signed in - check if they have a vendor/venue org and redirect accordingly
    const checkAndRedirect = async () => {
      try {
        const response = await fetch("/api/vendor-venue/check-profile");
        if (response.ok) {
          const data = await response.json();
          if (data.hasVendorOrg) {
            router.push("/vendor/dashboard");
          } else if (data.hasVenueOrg) {
            router.push("/venue/dashboard");
          } else {
            // No org yet, stay on this page to let them choose
            setIsChecking(false);
          }
        } else {
          setIsChecking(false);
        }
      } catch (error) {
        console.error("Error checking profile:", error);
        setIsChecking(false);
      }
    };

    checkAndRedirect();
  }, [session, status, router]);

  const handleSelect = (providerType: "vendor" | "venue") => {
    if (!session?.user) {
      // Not signed in - redirect to sign-in with callback
      router.push(`/signin?callbackUrl=${encodeURIComponent(`/providers/onboarding?providerType=${providerType}`)}`);
      return;
    }
    router.push(`/providers/onboarding?providerType=${providerType}`);
  };

  // Show loading state while checking
  if (isChecking || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[color:var(--oh-bg)]">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[color:var(--oh-bg)] p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">How do you want to use OneHub?</h1>
          <p className="text-slate-600 text-lg">
            Choose the option that best describes your business
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-8 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleSelect("vendor")}>
            <div className="flex flex-col items-center text-center">
              <div className="p-4 rounded-full bg-indigo-100 mb-4">
                <Store className="w-12 h-12 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">I'm a Vendor</h2>
              <p className="text-slate-600 mb-6">
                DJ, caterer, photographer, florist, decorator, or other service provider
              </p>
              <Button className="w-full" onClick={() => handleSelect("vendor")}>
                Get Started <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </Card>

          <Card className="p-8 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleSelect("venue")}>
            <div className="flex flex-col items-center text-center">
              <div className="p-4 rounded-full bg-purple-100 mb-4">
                <Building2 className="w-12 h-12 text-purple-600" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">I'm a Venue</h2>
              <p className="text-slate-600 mb-6">
                Banquet hall, hotel, event center, church, or other event space
              </p>
              <Button className="w-full" onClick={() => handleSelect("venue")}>
                Get Started <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

