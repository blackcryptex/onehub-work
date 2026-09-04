import { LandingHeader } from "@/components/layout/LandingHeader";
import { Card } from "@/components/ui";
import { Calendar, Users, FileText, DollarSign, MessageSquare, Shield, Zap, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function FeaturesPage() {
  const features = [
    {
      icon: Calendar,
      title: "Event Management",
      description: "Plan, organize, and track all your events in one place. From small birthday parties to nationwide conferences.",
    },
    {
      icon: Users,
      title: "Guest Management",
      description: "Manage guest lists, send invitations, track RSVPs, and create seating plans with ease.",
    },
    {
      icon: FileText,
      title: "AI-Powered Contracts",
      description: "Prepare structured agreement drafts for review. OneHub keeps contract readiness clear, but legal review remains a private-pilot guardrail.",
    },
    {
      icon: DollarSign,
      title: "Budget Tracking",
      description: "Track expenses, compare vendor quotes, and stay within budget with real-time financial insights.",
    },
    {
      icon: MessageSquare,
      title: "Vendor Marketplace",
      description: "Connect with trusted vendors, send proposals, negotiate contracts, and manage relationships all in one platform.",
    },
    {
      icon: Shield,
      title: "Held Funds Protection",
      description: "Track guarded payment readiness and admin-reviewed release/refund states. Live money stays behind explicit approval and provider/legal checks.",
    },
    {
      icon: Zap,
      title: "Task Management",
      description: "Never miss a deadline. Create checklists, assign tasks, set milestones, and track progress automatically.",
    },
    {
      icon: TrendingUp,
      title: "Analytics & Insights",
      description: "View detailed analytics, track KPIs, and make data-driven decisions for better event outcomes.",
    },
  ];

  return (
    <>
      <LandingHeader />
      <main className="mx-auto max-w-7xl px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">OneHub Features</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Everything you need to plan, execute, and manage events from start to finish. All in one powerful platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card key={idx} className="p-6 hover:shadow-lg transition-shadow">
                <Icon className="w-10 h-10 text-indigo-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-slate-600 mb-6">Join thousands of event planners, vendors, and venues using OneHub.</p>
          <Link href="/signup" className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">
            Create Your Account
          </Link>
        </div>
      </main>
    </>
  );
}

