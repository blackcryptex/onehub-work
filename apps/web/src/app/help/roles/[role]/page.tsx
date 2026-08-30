import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { LandingHeader } from "@/components/layout/LandingHeader";
import { HELP_ROLE_LABELS, HELP_ROLES, getHelpArticlesByRole, helpArticleHref, helpRoleHref, isHelpRole } from "@/lib/help-content";

export function generateStaticParams() {
  return HELP_ROLES.map((role) => ({ role }));
}

export default async function HelpRolePage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;

  if (!isHelpRole(role)) {
    notFound();
  }

  const articles = getHelpArticlesByRole(role);
  const label = HELP_ROLE_LABELS[role];

  return (
    <>
      <LandingHeader />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <Link href="/help" className="text-sm font-medium text-indigo-700 hover:text-indigo-900">
          ← Back to Help Center
        </Link>
        <header className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">{label} guide collection</p>
          <h1 className="mt-2 text-4xl font-bold text-slate-950">Help for {label}s</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            Use these OneHub guides for the workflows this role is most likely to complete. This page is available at {helpRoleHref(role)}.
          </p>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {articles.map((article) => (
            <Link key={article.slug} href={helpArticleHref(article.slug) as Route} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-200 hover:bg-indigo-50">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{article.category}</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">{article.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{article.summary}</p>
            </Link>
          ))}
        </section>
      </main>
    </>
  );
}
