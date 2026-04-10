import { LandingHeader } from "@/components/layout/LandingHeader";
import { Card } from "@/components/ui";

export default function PrivacyPage() {
  return (
    <>
      <LandingHeader />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Privacy &amp; Terms</h1>
          <p className="text-lg text-slate-600">Your privacy is important to us. Learn how we protect your data.</p>
        </div>

        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Privacy Policy</h2>
          <div className="space-y-4 text-slate-600">
            <p>
              <strong className="text-slate-900">Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>
            <p>
              At OneHub, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our event planning platform.
            </p>
            <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-2">Information We Collect</h3>
            <p>
              We collect information you provide directly to us, including account information, event data, vendor details, and payment information. We also automatically collect certain information about your device and usage patterns.
            </p>
            <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-2">How We Use Your Information</h3>
            <p>
              We use the information we collect to provide, maintain, and improve our services, process transactions, send communications, and protect against fraud and abuse.
            </p>
            <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-2">Data Security</h3>
            <p>
              We implement industry-standard security measures to protect your data, including encryption, secure servers, and regular security audits. Your payment information is processed securely through our payment partners.
            </p>
            <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-2">Your Rights</h3>
            <p>
              You have the right to access, update, or delete your personal information at any time. You can also opt out of marketing communications. Contact us at privacy@onehub.events for assistance.
            </p>
          </div>
        </Card>

        <Card className="p-8">
          <h2 className="text-2xl font-semibold mb-4">Terms of Service</h2>
          <div className="space-y-4 text-slate-600">
            <p>
              <strong className="text-slate-900">Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>
            <p>
              By using OneHub, you agree to these Terms of Service. Please read them carefully.
            </p>
            <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-2">Account Responsibilities</h3>
            <p>
              You are responsible for maintaining the security of your account and for all activities that occur under your account. You must be at least 18 years old to use OneHub.
            </p>
            <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-2">Service Usage</h3>
            <p>
              You agree to use OneHub only for lawful purposes and in accordance with these Terms. You may not use the service to violate any laws or infringe on the rights of others.
            </p>
            <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-2">Payment Terms</h3>
            <p>
              Payments are processed securely through our payment partners. Held funds pending release are handled in accordance with our held-funds policy. All fees are non-refundable unless otherwise stated.
            </p>
            <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-2">Limitation of Liability</h3>
            <p>
              OneHub provides the platform “as is” and does not guarantee uninterrupted or error-free service. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.
            </p>
            <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-2">Contact Us</h3>
            <p>
              For questions about these Terms, please contact us at legal@onehub.events.
            </p>
          </div>
        </Card>
      </main>
    </>
  );
}

