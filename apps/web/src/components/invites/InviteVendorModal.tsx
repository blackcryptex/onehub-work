"use client";

import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { X, Mail, Copy, Loader2 } from "lucide-react";

interface InviteVendorModalProps {
  vendorName: string;
  vendorCategory: string;
  eventName: string;
  eventLocation?: string;
  suggestedEmail?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

function generateInviteEmailTemplate(
  vendorName: string,
  vendorCategory: string,
  eventName: string,
  eventLocation?: string
): { subject: string; body: string } {
  const subject = `Invitation to Join OneHub - ${vendorName}`;
  const body = `Dear ${vendorName} Team,

We are reaching out to invite you to join OneHub, a leading platform connecting event planners with top-tier vendors and venues.

We are currently planning "${eventName}"${eventLocation ? ` in ${eventLocation}` : ""} and believe that ${vendorName} would be an excellent fit for our ${vendorCategory.toLowerCase()} needs.

**Why OneHub?**
- Connect with verified event planners
- Streamline proposals, contracts, and payments
- Build your reputation with client reviews
- Access held funds protection for secure transactions

**Next Steps:**
1. Create your free OneHub account
2. Complete your vendor profile
3. Start receiving proposal requests from event planners

We would love to have you on the platform and would be excited to work with you on this event.

Best regards,
The OneHub Team

---
This is an automated invitation. For questions, please contact support@onehub.com`;

  return { subject, body };
}

export function InviteVendorModal({
  vendorName,
  vendorCategory,
  eventName,
  eventLocation,
  suggestedEmail,
  onClose,
  onSuccess,
}: InviteVendorModalProps) {
  const [email, setEmail] = useState(suggestedEmail || "");
  const [subject, setSubject] = useState(
    generateInviteEmailTemplate(vendorName, vendorCategory, eventName, eventLocation).subject
  );
  const [body, setBody] = useState(
    generateInviteEmailTemplate(vendorName, vendorCategory, eventName, eventLocation).body
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSend = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/invites/vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject,
          body,
          vendorName,
          eventName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send invite");
      }

      const data = await response.json();
      setSuccess(true);
      
      if (data.mode === "demo") {
        // In demo mode, show success message
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 2000);
      } else {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      console.error("Error sending invite:", err);
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const fullEmail = `To: ${email}\nSubject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(fullEmail).then(() => {
      alert("Email copied to clipboard!");
    }).catch(() => {
      alert("Failed to copy to clipboard");
    });
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Invite Queued (Demo)</h3>
            <p className="text-sm text-slate-600 mb-4">
              In demo mode, the invite has been queued. In production, this would send an email to {email}.
            </p>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Invite {vendorName} to OneHub</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="rounded-md bg-rose-50 border border-rose-200 p-3 mb-4">
            <p className="text-sm text-rose-800">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="email">To (Email)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vendor@example.com"
            />
          </div>

          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          <div>
            <Label htmlFor="body">Body</Label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body"
              className="w-full min-h-[220px] rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
              rows={12}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-6">
          <Button
            onClick={handleSend}
            disabled={loading || !email}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Invite
              </>
            )}
          </Button>
          <Button
            onClick={handleCopy}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Copy Email
          </Button>
        </div>
      </div>
    </div>
  );
}

