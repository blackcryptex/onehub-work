import { LandingHeader } from "@/components/layout/LandingHeader";
import { Card } from "@/components/ui";
import { Mail, HelpCircle } from "lucide-react";
import Link from "next/link";

export default function SupportPage() {
  return (
    <>
      <LandingHeader />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Support</h1>
          <p className="text-lg text-slate-600">
            We’re here to help you succeed. Get the assistance you need, when you need it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="p-6">
            <Mail className="w-10 h-10 text-indigo-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Email Support</h2>
            <p className="text-slate-600 mb-4">Send support context and a OneHub team member will review it during the private pilot.</p>
            <a href="mailto:support@onehub.events" className="text-indigo-600 font-medium hover:underline">support@onehub.events</a>
          </Card>

          <Card className="p-6">
            <HelpCircle className="w-10 h-10 text-indigo-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Help Center</h2>
            <p className="text-slate-600 mb-4">Browse step-by-step guides for event setup, messages, sourcing, proposals, contracts, payment readiness, tasks, and risk review.</p>
            <Link href="/help" className="text-indigo-600 font-medium hover:underline">Visit Help Center →</Link>
          </Card>
        </div>

        <Card className="p-8 bg-indigo-50">
          <h2 className="text-2xl font-semibold mb-4">Common Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1">How do I create my first event?</h3>
              <p className="text-sm text-slate-600">Open your dashboard, choose Create Event or the event wizard, and enter the event name, type, date, location, guest target, and budget.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">How do held funds pending release work?</h3>
              <p className="text-sm text-slate-600">Payment readiness is a guarded private-pilot status. Check proposal, contract, provider setup, dispute, refund, holdback, and admin review states before treating any item as ready.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Can I use OneHub for free?</h3>
              <p className="text-sm text-slate-600">Current access depends on the private-pilot account and role you are using. Check your dashboard for the workflows available to that account.</p>
            </div>
          </div>
        </Card>
      </main>
    </>
  );
}

