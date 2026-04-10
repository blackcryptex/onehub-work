import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | OneHub',
  description: 'Terms of Service for OneHub Events',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12" data-testid="terms-page">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <div className="prose prose-slate max-w-none">
        <p className="text-slate-600 mb-4">
          <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="text-slate-700 mb-4">
            By accessing and using OneHub Events (“the Service”), you accept and agree to be bound by the terms and provision of this agreement.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Use License</h2>
          <p className="text-slate-700 mb-4">
            Permission is granted to temporarily use OneHub Events for personal, non-commercial event planning purposes. This is the grant of a license, not a transfer of title, and under this license you may not:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-700">
            <li>Modify or copy the materials</li>
            <li>Use the materials for any commercial purpose or for any public display</li>
            <li>Attempt to reverse engineer any software contained in OneHub Events</li>
            <li>Remove any copyright or other proprietary notations from the materials</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
          <p className="text-slate-700 mb-4">
            You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Limitation of Liability</h2>
          <p className="text-slate-700 mb-4">
            In no event shall OneHub Events or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on OneHub Events.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Revisions and Errata</h2>
          <p className="text-slate-700 mb-4">
            The materials appearing on OneHub Events could include technical, typographical, or photographic errors. OneHub Events does not warrant that any of the materials on its website are accurate, complete, or current.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Guarded MVP legal pages</h2>
          <ul className="list-disc pl-6 mb-4 text-slate-700">
            <li><a href="/legal/payments" className="text-indigo-600 hover:underline">Payments and held funds</a></li>
            <li><a href="/legal/refunds" className="text-indigo-600 hover:underline">Refund policy</a></li>
            <li><a href="/legal/disputes" className="text-indigo-600 hover:underline">Dispute policy</a></li>
            <li><a href="/legal/booking-classification" className="text-indigo-600 hover:underline">Booking classification</a></li>
            <li><a href="/legal/fees" className="text-indigo-600 hover:underline">Fee explanation</a></li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Contact Information</h2>
          <p className="text-slate-700 mb-4">
            If you have any questions about these Terms of Service, please contact us at{' '}
            <a href="mailto:support@onehub.events" className="text-indigo-600 hover:underline">
              support@onehub.events
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}

