import { LandingHeader } from "@/components/layout/LandingHeader";
import { Card } from "@/components/ui";
import Link from "next/link";
import { Briefcase, Star, Calendar, Building2 } from "lucide-react";
import { VendorVenueLink } from "@/components/vendor-venue/VendorVenueLink";

export default function Page() {
  return (
    <>
      <LandingHeader />
      <main id="content" className="mx-auto max-w-7xl px-4 py-12">
        {/* Centered: OneHub Events */}
        <section className="text-center mt-8">
          <h1 className="text-5xl font-bold text-indigo-600">OneHub Events</h1>
        </section>

        {/* Left aligned content */}
        <section className="mt-12 text-left">
          <h2 className="text-4xl font-bold text-slate-900">Plan Any Event</h2>
          <p className="mt-4 text-2xl text-slate-700">All In One Place</p>
          <p className="mt-6 text-lg text-slate-600">
            Save Money. Stay Organized. Save Time. Reduce Stress - from something as small as a Birthday party to nationwide events.
          </p>
        </section>

        {/* Choose Your Path */}
        <section className="mt-20">
          <h2 className="text-3xl font-bold text-center mb-12">Choose Your Path</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* DIY Planner */}
            <Card className="p-6 flex flex-col items-center text-center hover:shadow-lg transition-shadow">
              <Calendar className="w-12 h-12 text-indigo-600 mb-3" />
              <h3 className="text-xl font-semibold mb-4">DIY Planner</h3>
              <p className="text-sm text-slate-600 mb-6 flex-grow">
                Plan your own event with AI-powered tools, guest list management, and budget tracking.
              </p>
                  <Link href="/events/new" className="flex items-center gap-1 text-indigo-600 font-medium hover:underline">
                Get Started <span>→</span>
              </Link>
            </Card>

            {/* Professional Planner */}
            <Card className="p-6 flex flex-col items-center text-center hover:shadow-lg transition-shadow">
              <Briefcase className="w-12 h-12 text-indigo-600 mb-3" />
              <h3 className="text-xl font-semibold mb-4">Professional Planner</h3>
              <p className="text-sm text-slate-600 mb-6 flex-grow">
                Manage multiple client events, collaborate with vendors, and streamline workflows.
              </p>
              <Link href="/professional-planner/setup" className="flex items-center gap-1 text-indigo-600 font-medium hover:underline">
                Learn More <span>→</span>
              </Link>
            </Card>

            {/* Vendor/Venue */}
            <Card className="p-6 flex flex-col items-center text-center hover:shadow-lg transition-shadow">
              <Building2 className="w-12 h-12 text-indigo-600 mb-3" />
              <h3 className="text-xl font-semibold mb-4">Vendor/Venue</h3>
              <p className="text-sm text-slate-600 mb-6 flex-grow">
                Showcase your services, attract event planners and grow your business.
              </p>
              <VendorVenueLink />
            </Card>

            {/* Event Dreamer */}
            <Card className="p-6 flex flex-col items-center text-center hover:shadow-lg transition-shadow relative">
              <Star className="w-4 h-4 text-yellow-400 absolute top-2 right-2" />
              <Star className="w-3 h-3 text-yellow-400 absolute bottom-2 left-2" />
              <Star className="w-12 h-12 text-indigo-600 mb-3" />
              <h3 className="text-xl font-semibold mb-4">Event Dreamer</h3>
              <p className="text-sm text-slate-600 mb-6 flex-grow">
                Explore ideas, get AI-powered inspiration and save your dream event for later.
              </p>
              <Link href="/event-dreamer/create" className="flex items-center gap-1 text-indigo-600 font-medium hover:underline">
                Start Dreaming <span>→</span>
              </Link>
            </Card>

            {/* Coming Soon */}
            <Card className="p-6 flex flex-col items-center text-center hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-4">Coming Soon</h3>
              <p className="text-sm text-slate-600 mb-6 flex-grow">
                Exciting new features on the way!
              </p>
            </Card>
          </div>
        </section>

        {/* Why OneHub */}
        <section className="mt-24">
          <h2 className="text-3xl font-bold text-center mb-12">Why OneHub</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-3">Save Money</h3>
              <p className="text-sm text-slate-600">Compare quotes and keeps your budget on track</p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-3">Stay Organized</h3>
              <p className="text-sm text-slate-600">Guest list, vendors proposals and contracts – together</p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-3">Save Time</h3>
              <p className="text-sm text-slate-600">Task checklist and instant vendor matching</p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-3">Reduce Stress</h3>
              <p className="text-sm text-slate-600">Held funds pending release and easy sign-in for peace of mind</p>
            </Card>
          </div>
        </section>
      </main>

    </>
  );
}
