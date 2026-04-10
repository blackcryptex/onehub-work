export default function LegalBookingClassificationPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 space-y-6">
      <h1 className="text-3xl font-bold">Booking classification</h1>
      <ul className="list-disc pl-6 text-slate-700 space-y-2">
        <li><strong>Direct:</strong> the transaction is handled directly between buyer-side event operations and seller-side service delivery.</li>
        <li><strong>Planner-mediated:</strong> a planner-led operating flow governs coordination and admin override policy can apply where guarded MVP rules allow it.</li>
        <li><strong>Marketplace:</strong> sourced marketplace flow rules apply and admin override is more restricted.</li>
      </ul>
    </main>
  );
}
