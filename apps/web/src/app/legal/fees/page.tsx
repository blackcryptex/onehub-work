export default function LegalFeesPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 space-y-6">
      <h1 className="text-3xl font-bold">Fee explanation</h1>
      <p className="text-slate-600">Guarded MVP fee treatment is resolved from the canonical fee profile for the booking classification.</p>
      <ul className="list-disc pl-6 text-slate-700 space-y-2">
        <li>Platform fee is currently seller-paid across supported classifications.</li>
        <li>Direct bookings charge processing cost to the buyer.</li>
        <li>Marketplace and planner-mediated bookings currently absorb processing cost at platform level unless an explicit override policy is recorded.</li>
      </ul>
    </main>
  );
}
