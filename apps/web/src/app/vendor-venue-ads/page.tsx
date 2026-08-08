import { LandingHeader } from "@/components/layout/LandingHeader";
import { Card, Button } from "@/components/ui";
import Link from "next/link";
import { Building2, Sparkles, ShieldCheck, Store, MessageSquare } from "lucide-react";

export default function VendorVenueAdsPage() {
  return (
    <>
      <LandingHeader />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-indigo-100">
              <Building2 className="w-16 h-16 text-indigo-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Vendor & Venue Growth</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Promote your verified services through OneHub’s marketplace, respond to planner demand, and keep trust signals tied to real event work.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="p-6">
            <Store className="w-9 h-9 text-indigo-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Marketplace profile</h2>
            <p className="text-sm text-slate-600">
              Build or update the provider profile planners use to compare services, location, category, and contact path.
            </p>
          </Card>
          <Card className="p-6">
            <MessageSquare className="w-9 h-9 text-indigo-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Lead response path</h2>
            <p className="text-sm text-slate-600">
              Keep inquiries tied to OneHub booking requests, contact details, and internal messages instead of dead ad clicks.
            </p>
          </Card>
          <Card className="p-6">
            <ShieldCheck className="w-9 h-9 text-indigo-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Trust-first visibility</h2>
            <p className="text-sm text-slate-600">
              OneHub prioritizes verified listings, clear ownership, and safe planning workflows before paid promotion.
            </p>
          </Card>
        </div>

        <Card className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <Sparkles className="w-12 h-12 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-semibold mb-4">Start with the live provider workflow</h2>
          <p className="text-slate-600 mb-6">
            For MVP, the right next step is creating a verified vendor or venue profile. Promotion can layer on top once the profile, lead, and message paths are complete.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link href="/providers/start">Get Started as Vendor/Venue</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/marketplace">Browse Marketplace</Link>
            </Button>
          </div>
        </Card>
      </main>
    </>
  );
}
