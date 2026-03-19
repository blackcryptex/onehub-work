import { LandingHeader } from "@/components/layout/LandingHeader";
import { Card } from "@/components/ui";
import Link from "next/link";
import { BookOpen, Video, FileText, Search, MessageCircle } from "lucide-react";

export default function HelpPage() {
  const categories = [
    {
      title: "Getting Started",
      articles: [
        "Creating your first event",
        "Setting up your organization",
        "Inviting team members",
        "Understanding your dashboard",
      ],
    },
    {
      title: "Event Planning",
      articles: [
        "Budget management",
        "Guest list & invitations",
        "Vendor selection",
        "Task & milestone tracking",
      ],
    },
    {
      title: "Contracts & Payments",
      articles: [
        "Creating AI contracts",
        "Understanding escrow",
        "Processing payments",
        "Managing proposals",
      ],
    },
    {
      title: "Vendor Marketplace",
      articles: [
        "Listing your services",
        "Responding to requests",
        "Managing bookings",
        "Building your profile",
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
            Find answers, guides, and tutorials to help you get the most out of OneHub.
          </p>
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="search"
                placeholder="Search for help..."
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <BookOpen className="w-10 h-10 text-indigo-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Documentation</h2>
            <p className="text-slate-600 mb-4">Comprehensive guides covering all features and workflows.</p>
            {/* TODO: Create /help/docs page for documentation */}
            <Link href="/help" className="text-indigo-600 font-medium hover:underline">Browse Docs →</Link>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <Video className="w-10 h-10 text-indigo-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Video Tutorials</h2>
            <p className="text-slate-600 mb-4">Step-by-step video guides for visual learners.</p>
            {/* TODO: Create /help/videos page for video tutorials */}
            <Link href="/help" className="text-indigo-600 font-medium hover:underline">Watch Videos →</Link>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <FileText className="w-10 h-10 text-indigo-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">API Documentation</h2>
            <p className="text-slate-600 mb-4">Technical documentation for developers and integrators.</p>
            {/* TODO: Create /help/api page for API documentation */}
            <Link href="/help" className="text-indigo-600 font-medium hover:underline">View API Docs →</Link>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <MessageCircle className="w-10 h-10 text-indigo-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Contact Support</h2>
            <p className="text-slate-600 mb-4">Can’t find what you’re looking for? Our team is here to help.</p>
            <Link href="/support" className="text-indigo-600 font-medium hover:underline">Get Support →</Link>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {categories.map((category, idx) => (
            <Card key={idx} className="p-6">
              <h2 className="text-xl font-semibold mb-4">{category.title}</h2>
              <ul className="space-y-2">
                {category.articles.map((article, articleIdx) => (
                  <li key={articleIdx}>
                    {/* TODO: Create individual help article pages at /help/[article-slug] */}
                    <Link href="/help" className="text-slate-600 hover:text-indigo-600 hover:underline">
                      {article}
                    </Link>
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

