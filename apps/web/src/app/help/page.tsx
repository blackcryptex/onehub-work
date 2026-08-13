import { LandingHeader } from "@/components/layout/LandingHeader";
import { Card } from "@/components/ui";
import Link from "next/link";
import { BookOpen, Video, FileText, Search, MessageCircle } from "lucide-react";

export default function HelpPage() {
  const categories = [
    {
      title: "Getting Started",
      articles: [
        ["Creating your first event", "Use Create Event to save date, location, guest target, budget, and planning context."],
        ["Setting up your organization", "Provider and planner setup starts from the correct role onboarding path."],
        ["Inviting team members", "Use event stakeholders, messages, and support if access needs to be adjusted."],
        ["Understanding your dashboard", "Each role dashboard points to its own planning, lead, payment, or admin workflow."],
      ],
    },
    {
      title: "Event Planning",
      articles: [
        ["Budget management", "Open the event budget workspace to compare planned and actual costs."],
        ["Guest list & invitations", "Use the guests workspace for manual guests, import, RSVP status, and safe updates."],
        ["Vendor selection", "Use marketplace and event vendor tabs to shortlist providers and prepare proposals."],
        ["Task & milestone tracking", "Use checklists, tasks, and milestones to keep handoffs accountable."],
      ],
    },
    {
      title: "Contracts & Payments",
      articles: [
        ["Creating AI contracts", "Generate contracts from accepted proposal context, then review terms before signature."],
        ["Understanding held funds pending release", "OneHub keeps manual-status-first payment copy unless live payments are explicitly enabled."],
        ["Processing payments", "Payment screens show the current payment readiness and review state for the event."],
        ["Managing proposals", "Proposal tabs support generation, preview, send, approve, and reject states."],
      ],
    },
    {
      title: "Vendor Marketplace",
      articles: [
        ["Listing your services", "Providers start from onboarding and maintain their marketplace profile from the dashboard."],
        ["Responding to requests", "Leads show contact paths, request details, and OneHub message threads where available."],
        ["Managing bookings", "Booking requests stay tied to the event, provider, and planner context."],
        ["Building your profile", "Use verified business details, categories, city/state, and service descriptions."],
      ],
    },
  ];

  return (
    <>
      <LandingHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Help Center</h1>
          <p className="text-lg text-slate-600 mb-6">
            Find practical OneHub guidance for event planning, provider setup, payments, and support.
          </p>
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="search"
                placeholder="Search the topics below..."
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card id="docs" className="p-6 hover:shadow-lg transition-shadow scroll-mt-24">
            <BookOpen className="w-10 h-10 text-indigo-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Documentation</h2>
            <p className="text-slate-600 mb-4">Role-by-role guidance is organized in the topic cards below.</p>
            <Link href="#topics" className="text-indigo-600 font-medium hover:underline">Browse topics →</Link>
          </Card>

          <Card id="videos" className="p-6 hover:shadow-lg transition-shadow scroll-mt-24">
            <Video className="w-10 h-10 text-indigo-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Guided walkthroughs</h2>
            <p className="text-slate-600 mb-4">Use the active dashboard CTAs first; support can provide a guided walkthrough when a workflow blocks you.</p>
            <Link href="/support" className="text-indigo-600 font-medium hover:underline">Request walkthrough →</Link>
          </Card>

          <Card id="api" className="p-6 hover:shadow-lg transition-shadow scroll-mt-24">
            <FileText className="w-10 h-10 text-indigo-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Integration support</h2>
            <p className="text-slate-600 mb-4">For MVP, API and integration questions should go through support so access stays controlled.</p>
            <Link href="/support" className="text-indigo-600 font-medium hover:underline">Contact integration support →</Link>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <MessageCircle className="w-10 h-10 text-indigo-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Contact Support</h2>
            <p className="text-slate-600 mb-4">Can’t find what you’re looking for? Our team is here to help.</p>
            <Link href="/support" className="text-indigo-600 font-medium hover:underline">Get Support →</Link>
          </Card>
        </div>

        <div id="topics" className="grid grid-cols-1 md:grid-cols-2 gap-8 scroll-mt-24">
          {categories.map((category) => (
            <Card key={category.title} className="p-6">
              <h2 className="text-xl font-semibold mb-4">{category.title}</h2>
              <ul className="space-y-3">
                {category.articles.map(([article, description]) => (
                  <li key={article} className="rounded-lg border border-slate-200 p-3">
                    <h3 className="font-medium text-slate-900">{article}</h3>
                    <p className="mt-1 text-sm text-slate-600">{description}</p>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
