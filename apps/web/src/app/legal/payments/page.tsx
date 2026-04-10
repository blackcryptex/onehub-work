export default function LegalPaymentsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 space-y-6">
      <h1 className="text-3xl font-bold">Payments and held funds</h1>
      <p className="text-slate-600">OneHub uses held-funds wording for the guarded MVP. Client payments are collected against approved proposal and contract terms, then held pending milestone release or admin review.</p>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Release controls</h2>
        <p className="text-slate-700">Release can be paused by an active refund request, dispute case, or payment holdback. Admin review is required before override-based release actions proceed.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Fees</h2>
        <p className="text-slate-700">Platform and processing fee treatment follows the booking classification and fee profile resolved for the transaction.</p>
      </section>
    </main>
  );
}
