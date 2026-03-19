"use client";

import { useState } from "react";
import { Card, Button, Input, Label } from "@/components/ui";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { isDemoMode } from "@/lib/demo-mode";
import { useRouter } from "next/navigation";

interface BookingRequestModalProps {
  listingId: string;
  listingTitle: string;
  eventId?: string | null;
  onClose: () => void;
}

export function BookingRequestModal({
  listingId,
  listingTitle,
  eventId,
  onClose,
}: BookingRequestModalProps) {
  const router = useRouter();
  const demoMode = isDemoMode();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    contactName: demoMode ? "Jane Planner" : "",
    contactEmail: demoMode ? "pro@example.com" : "",
    contactPhone: demoMode ? "(555) 123-4567" : "",
    startAt: "",
    endAt: "",
    guests: "",
    message: demoMode ? "Interested in booking for our wedding event." : "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/bookings/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          eventId,
          ...formData,
          guests: formData.guests ? parseInt(formData.guests) : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create booking request");
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create booking request");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-md p-6">
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Booking Request Sent!</h2>
            <p className="text-sm text-slate-600 mb-4">
              Your request has been sent to {listingTitle}. They will respond soon.
            </p>
            {demoMode && (
              <p className="text-xs text-amber-600 mb-4">
                <strong>DEMO DATA</strong> — Request saved to database
              </p>
            )}
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <Card className="w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Request Booking</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {demoMode && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <strong>DEMO DATA</strong> — Form pre-filled with demo values
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="contactName">Contact Name *</Label>
            <Input
              id="contactName"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="contactEmail">Contact Email *</Label>
            <Input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input
              id="contactPhone"
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startAt">Start Date *</Label>
              <Input
                id="startAt"
                type="datetime-local"
                value={formData.startAt}
                onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="endAt">End Date *</Label>
              <Input
                id="endAt"
                type="datetime-local"
                value={formData.endAt}
                onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="guests">Number of Guests</Label>
            <Input
              id="guests"
              type="number"
              min="1"
              value={formData.guests}
              onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <textarea
              id="message"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={3}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Request"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

