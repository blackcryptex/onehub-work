import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { LandingHeader } from "@/components/layout/LandingHeader";
import { HELP_ROLE_LABELS, getAllHelpArticles, getHelpArticle, helpArticleHref } from "@/lib/help-content";

export function generateStaticParams() {
  return getAllHelpArticles().map((article) => ({ slug: article.slug }));
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getHelpArticle(slug);

  if (!article) {
    notFound();
  }

  return (
    <>
      <LandingHeader />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <Link href="/help" className="text-sm font-medium text-indigo-700 hover:text-indigo-900">
          ← Back to Help Center
        </Link>

        <article className="mt-6 space-y-8">
          <header>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">{article.category}</p>
            <h1 className="mt-2 text-4xl font-bold text-slate-950">{article.title}</h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">{article.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {article.roles.map((role) => (
                <span key={role} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  {role === "all" ? "All roles" : HELP_ROLE_LABELS[role]}
                </span>
              ))}
            </div>
          </header>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-slate-950">Who this is for</h2>
            <p className="mt-3 text-slate-600">
              {article.roles.includes("all")
                ? "Everyone using OneHub who needs this workflow context."
                : article.roles.map((role) => role === "all" ? "All roles" : HELP_ROLE_LABELS[role]).join(", ")}
            </p>
          </section>

          <GuideSection title="Before you start" items={article.beforeYouStart} />
          <GuideSection title="Exact steps" items={article.steps} ordered />
          <GuideSection title="What success looks like" items={article.successLooksLike} />
          <GuideSection title="Common mistakes" items={article.commonMistakes} />

          {article.safetyNotes && article.safetyNotes.length > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-xl font-semibold text-amber-950">Safety notes</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-amber-900">
                {article.safetyNotes.map((note) => <li key={note}>{note}</li>)}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-xl font-semibold text-slate-950">Related articles</h2>
            <ul className="mt-4 space-y-2">
              {article.relatedSlugs.map((relatedSlug) => {
                const related = getHelpArticle(relatedSlug);
                if (!related) return null;
                return (
                  <li key={relatedSlug}>
                    <Link href={helpArticleHref(relatedSlug) as Route} className="font-medium text-indigo-700 hover:underline">
                      {related.title} →
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </article>
      </main>
    </>
  );
}

function GuideSection({ title, items, ordered = false }: { title: string; items: string[]; ordered?: boolean }) {
  const List = ordered ? "ol" : "ul";
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <List className={`${ordered ? "list-decimal" : "list-disc"} mt-4 space-y-2 pl-5 text-sm leading-6 text-slate-700`}>
        {items.map((item) => <li key={item}>{item}</li>)}
      </List>
    </section>
  );
}
