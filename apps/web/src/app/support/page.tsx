import { LandingHeader } from "@/components/layout/LandingHeader";
import { Card } from "@/components/ui";
import { MessageCircle, Mail, Phone, HelpCircle } from "lucide-react";
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
            <MessageCircle className="w-10 h-10 text-indigo-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">AI-Assisted Chat</h2>
            <p className="text-slate-600 mb-4">Get instant answers with AI assistance. Available 24/7 to help with your event planning questions.</p>
            <Link href="/support" className="text-indigo-600 font-medium hover:underline">Start Chat →</Link>
          </Card>

          <Card className="p-6">
            <Mail className="w-10 h-10 text-indigo-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Email Support</h2>
            <p className="text-slate-600 mb-4">Send us an email and we’ll respond within 24 hours.</p>
            <a href="mailto:support@onehub.events" className="text-indigo-600 font-medium hover:underline">support@onehub.events</a>
          </Card>

          <Card className="p-6">
            <Phone className="w-10 h-10 text-indigo-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Phone Support</h2>
            <p className="text-slate-600 mb-4">Speak directly with our team. Available for Enterprise customers.</p>
            <a href="tel:+1-800-ONEHUB" className="text-indigo-600 font-medium hover:underline">1-800-ONEHUB</a>
          </Card>

          <Card className="p-6">
            <HelpCircle className="w-10 h-10 text-indigo-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Help Center</h2>
            <p className="text-slate-600 mb-4">Browse our knowledge base for answers to common questions.</p>
            <Link href="/help" className="text-indigo-600 font-medium hover:underline">Visit Help Center →</Link>
          </Card>
        </div>

        <Card className="p-8 bg-indigo-50">
          <h2 className="text-2xl font-semibold mb-4">Common Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1">How do I create my first event?</h3>
              <p className="text-sm text-slate-600">Sign up for an account, then click “Create Events” on your dashboard. Follow the wizard to set up your event details.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">How do held funds pending release work?</h3>
              <p className="text-sm text-slate-600">When you pay a vendor, funds are held pending release until you confirm the services are completed to your satisfaction.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Can I use OneHub for free?</h3>
              <p className="text-sm text-slate-600">Yes! DIY Planners can use OneHub for free with limited features. Upgrade to unlock advanced tools and priority support.</p>
            </div>
          </div>
        </Card>
      </main>
    </>
  );
}

