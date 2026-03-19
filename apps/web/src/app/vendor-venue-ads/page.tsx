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
            Vendor & Venue Ads coming soon.
          </p>
          <p className="text-base text-slate-600 max-w-2xl mx-auto">
            We're building tools to help vendors and venues promote their services directly to planners and hosts on OneHub.
          </p>
        </div>

        <Card className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <Sparkles className="w-12 h-12 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-semibold mb-4">What's Coming</h2>
          <p className="text-slate-600 mb-6">
            Soon you'll be able to create targeted ad campaigns, reach event planners actively searching for your services, and grow your business with OneHub's advertising platform.
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

