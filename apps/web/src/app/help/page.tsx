import Link from "next/link";
import type { Route } from "next";
import { BookOpen, MessageCircle, Users } from "lucide-react";
import { LandingHeader } from "@/components/layout/LandingHeader";
import { Card } from "@/components/ui";
import { getHelpCategories, HELP_ROLE_LABELS, HELP_ROLES, helpArticleHref, helpRoleHref } from "@/lib/help-content";

export default function HelpPage() {
  const categories = getHelpCategories();

  return (
    <>
      <LandingHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Help Center</h1>
          <p className="text-lg text-slate-600 mb-6">
            Step-by-step OneHub guides for planners, clients, vendors, venues, and admins.
          </p>
        </div>

        <section className="mb-12">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            <h2 className="text-2xl font-semibold text-slate-900">Choose your role</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {HELP_ROLES.map((role) => (
              <Card key={role} className="p-5 transition-shadow hover:shadow-md">
                <h3 className="text-lg font-semibold text-slate-900">I am {role === "admin" ? "an" : "a"} {HELP_ROLE_LABELS[role]}</h3>
                <p className="mt-2 text-sm text-slate-600">Open the guide collection for this OneHub role.</p>
                <Link href={helpRoleHref(role) as Route} className="mt-4 inline-flex text-sm font-semibold text-indigo-700 hover:underline">
                  View {HELP_ROLE_LABELS[role]} guides →
                </Link>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="p-6">
            <BookOpen className="mb-4 h-10 w-10 text-indigo-600" />
            <h2 className="text-xl font-semibold text-slate-900">Workflow guides</h2>
            <p className="mt-2 text-slate-600">Browse real articles covering event setup, messaging, sourcing, proposals, contracts, payment readiness, tasks, crisis recovery, and admin oversight.</p>
            <Link href={helpArticleHref("diy-create-event") as Route} className="mt-4 inline-flex font-medium text-indigo-700 hover:underline">
              Start with event creation →
            </Link>
          </Card>
          <Card className="p-6">
            <MessageCircle className="mb-4 h-10 w-10 text-indigo-600" />
            <h2 className="text-xl font-semibold text-slate-900">Need support?</h2>
            <p className="mt-2 text-slate-600">Use the support page for contact options, or keep reading guides here for self-service workflow help.</p>
            <Link href="/support" className="mt-4 inline-flex font-medium text-indigo-700 hover:underline">
              Visit Support →
            </Link>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {categories.map(({ category, articles }) => (
            <Card key={category} className="p-6">
              <h2 className="text-xl font-semibold text-slate-900">{category}</h2>
              <ul className="mt-4 space-y-3">
                {articles.map((article) => (
                  <li key={article.slug}>
                    <Link href={helpArticleHref(article.slug) as Route} className="block rounded-lg border border-slate-200 p-3 hover:border-indigo-200 hover:bg-indigo-50">
                      <span className="font-medium text-slate-900">{article.title}</span>
                      <span className="mt-1 block text-sm text-slate-600">{article.summary}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </section>
      </main>
    </>
  );
}
