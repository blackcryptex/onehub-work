import { LandingHeader } from "@/components/layout/LandingHeader";
import { Card, Button } from "@/components/ui";
import Link from "next/link";
import { Building2, Sparkles } from "lucide-react";

export default function VendorVenueAdsPage() {
  return (
    <>
      <LandingHeader />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-indigo-100">
              <Building2 className="w-16 h-16 text-indigo-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Vendor & Venue Ads</h1>
          <p className="text-lg text-slate-600 mb-2">
            Ads are not live in this MVP.
          </p>
          <p className="text-base text-slate-600 max-w-2xl mx-auto">
            Start with a provider profile so planners and hosts can evaluate your services through OneHub&apos;s existing discovery and booking paths.
          </p>
        </div>

        <Card className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <Sparkles className="w-12 h-12 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-semibold mb-4">Provider growth path</h2>
          <p className="text-slate-600 mb-6">
            Create or update your vendor or venue profile, keep packages and policies accurate, and use active leads instead of ad claims. OneHub does not present campaign billing or advertising inventory here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link href="/providers/start">Get Started as Vendor/Venue</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </Card>
      </main>
    </>
  );
}

