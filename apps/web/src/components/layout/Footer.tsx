import Link from "next/link";
import { Mail, Phone, MessageCircle } from "lucide-react";
import { VendorVenueFooterLink } from "@/components/vendor-venue/VendorVenueFooterLink";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const siteMapLinks: Record<string, Array<{ label: string; href: string; isVendorVenue?: boolean }>> = {
    "Getting Started": [
      { label: "Home", href: "/" },
      { label: "Features", href: "/features" },
      { label: "Event Wizard", href: "/events/new" },
      { label: "Event Vault", href: "/app/vault" },
    ],
    "For Users": [
      { label: "DIY Planner", href: "/diy-planner" },
      { label: "Professional Planner", href: "/professional-planner/setup" },
      { label: "Vendors & Venues", href: "/providers/start", isVendorVenue: true },
      { label: "Event Dreamer", href: "/event-dreamer/create" },
    ],
    "Marketplace": [
      { label: "Explore Vendors", href: "/explore/vendors" },
      { label: "AI Contracts", href: "/app/contracts" },
      { label: "Proposals", href: "/app/proposals" },
      { label: "Vendor & Venue Ads", href: "/vendor-venue-ads" },
    ],
    "Resources": [
      { label: "Help Center", href: "/help" },
      { label: "Support", href: "/support" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  };

  return (
    <footer className="border-t border-slate-200 bg-slate-50 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Site Map */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-center mb-8 text-slate-900">Site Map</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {Object.entries(siteMapLinks).map(([category, links]) => (
              <div key={category}>
                <h4 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wide">
                  {category}
                </h4>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.href}>
                      {link.isVendorVenue ? (
                        <VendorVenueFooterLink label={link.label} />
                      ) : (
                        <Link
                          href={link.href as any}
                          className="text-sm text-slate-600 hover:text-indigo-600 transition-colors"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Contact &amp; Legal */}
        <div className="border-t border-slate-200 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Contact Info */}
            <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-slate-600">
              <a
                href="mailto:support@onehub.events"
                className="flex items-center gap-2 hover:text-indigo-600 transition-colors"
              >
                <Mail className="w-4 h-4" />
                support@onehub.events
              </a>
              <a
                href="tel:+1-800-ONEHUB"
                className="flex items-center gap-2 hover:text-indigo-600 transition-colors"
              >
                <Phone className="w-4 h-4" />
                1-800-ONEHUB
              </a>
              <Link
                href="/support"
                className="flex items-center gap-2 hover:text-indigo-600 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                AI-Assisted Chat
              </Link>
            </div>

            {/* Copyright */}
            <div className="text-sm text-slate-500 text-center md:text-right">
              <p>&copy; {currentYear} OneHub Events — All rights reserved</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

