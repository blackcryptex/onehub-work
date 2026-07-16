"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { Sparkles, CheckCircle2, Copy, Mail, Loader2 } from "lucide-react";
import { InviteVendorModal } from "@/components/invites/InviteVendorModal";

interface VerifiedResult {
  kind: "VERIFIED";
  listingId: string;
  title: string;
  listingType: "VENDOR" | "VENUE";
  category: string;
  city: string | null;
  state: string | null;
  website: string | null;
  orgName: string;
  badgeText: "Verified";
}

interface UnverifiedResult {
  kind: "UNVERIFIED";
  title: string;
  listingType: "VENDOR" | "VENUE";
  category: string;
  city: string | null;
  state: string | null;
  website: null;
  badgeText: "Unverified";
}

type Result = VerifiedResult | UnverifiedResult;

interface AiSourceVendorsVenuesPanelProps {
  eventId: string;
  eventName?: string;
  eventLocation?: string;
}

export function AiSourceVendorsVenuesPanel({ eventId, eventName, eventLocation }: AiSourceVendorsVenuesPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);
  const [inviteModalData, setInviteModalData] = useState<UnverifiedResult | null>(null);
  const [addingToList, setAddingToList] = useState<string | null>(null);
  const router = useRouter();

  // Fallback results (deterministic)
  const getFallbackResults = (): Result[] => {
    return [
      {
        kind: "VERIFIED",
        listingId: "fallback-1",
        title: "Sample Verified Vendor",
        listingType: "VENDOR",
        category: "CATERING",
        city: "Local",
        state: null,
        website: null,
        orgName: "Sample Org",
        badgeText: "Verified",
      },
      {
        kind: "UNVERIFIED",
        title: "Local Premier Catering",
        listingType: "VENDOR",
        category: "CATERING",
        city: "Local",
        state: null,
        website: null,
        badgeText: "Unverified",
      },
    ];
  };

  const handleSource = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/source-vendors-venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to source vendors/venues: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      console.error("[AiSourceVendorsVenuesPanel] Error sourcing vendors:", err);
      // Use fallback results instead of showing a hard failure
      setResults(getFallbackResults());
      setError("Using fallback results. API unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToShortlist = async (listingId: string) => {
    setAddingToList(listingId);

    try {
      const response = await fetch("/api/shortlist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, listingId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || "Failed to add to shortlist");
      }

      // Refresh the page to show updated shortlist
      router.refresh();
    } catch (err) {
      console.error("[AiSourceVendorsVenuesPanel] Error adding to shortlist:", err);
      alert(err instanceof Error ? err.message : "Failed to add to shortlist");
    } finally {
      setAddingToList(null);
    }
  };

  const handleCopyLead = (result: UnverifiedResult) => {
    const text = `${result.title}\n${result.listingType} • ${result.category}\n${result.city || ""}${result.state ? `, ${result.state}` : ""}`;
    navigator.clipboard.writeText(text).then(() => {
      alert("Lead details copied to clipboard!");
    }).catch(() => {
      alert("Failed to copy to clipboard");
    });
  };

  const handleInviteToOneHub = (result: UnverifiedResult) => {
    setInviteModalData(result);
  };

  const verifiedCount = results?.filter((r) => r.kind === "VERIFIED").length || 0;
  const unverifiedCount = results?.filter((r) => r.kind === "UNVERIFIED").length || 0;

  return (
    <Card className="p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> AI Source Vendors & Venues
          </h3>
          {!results && (
            <Button
              onClick={handleSource}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sourcing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  AI Source Vendors & Venues
                </>
              )}
            </Button>
          )}
        </div>

        {/* Investor confidence info */}
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 mb-4">
          <p className="text-xs text-indigo-900 font-medium mb-1">Investor Confidence:</p>
          <p className="text-xs text-indigo-700">
            <strong>Verified</strong> = On-platform account (trust + held funds).{" "}
            <strong>Unverified</strong> = Lead (growth pipeline).
          </p>
        </div>

        {/* Counts */}
        {results && (
          <div className="flex items-center gap-4 mb-4 text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="font-medium">Verified results: {verifiedCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-600">Unverified leads: {unverifiedCount}</span>
            </div>
          </div>
        )}

        {/* Error message (non-blocking) */}
        {error && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-2 mb-4">
            <p className="text-xs text-amber-800">{error}</p>
          </div>
        )}
      </div>

      {/* Results */}
      {results && results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, index) => (
            <div
              key={result.kind === "VERIFIED" ? result.listingId : `unverified-${index}`}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{result.title}</h4>
                    {result.kind === "VERIFIED" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        Unverified
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 mb-2">
                    {result.listingType} • {result.category}
                    {result.city && ` • ${result.city}${result.state ? `, ${result.state}` : ""}`}
                  </div>
                  {result.kind === "VERIFIED" ? (
                    <p className="text-xs text-slate-500 mb-2">
                      Verified vendors are on OneHub and can accept proposals, contracts, and payments with held funds pending release.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 mb-2">
                      Suggested lead (not yet on OneHub).
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-3">
                {result.kind === "VERIFIED" ? (
                  <Button
                    onClick={() => handleAddToShortlist(result.listingId)}
                    disabled={addingToList === result.listingId}
                    size="sm"
                    variant="default"
                    className="flex items-center gap-1"
                  >
                    {addingToList === result.listingId ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add to Shortlist"
                    )}
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => handleInviteToOneHub(result)}
                      size="sm"
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <Mail className="w-3 h-3" />
                      Invite to OneHub
                    </Button>
                    <Button
                      onClick={() => handleCopyLead(result)}
                      size="sm"
                      variant="ghost"
                      className="flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite modal */}
      {inviteModalData && (
        <InviteVendorModal
          vendorName={inviteModalData.title}
          vendorCategory={inviteModalData.category}
          eventName={eventName || "Event"}
          eventLocation={eventLocation || inviteModalData.city && inviteModalData.state 
            ? `${inviteModalData.city}, ${inviteModalData.state}` 
            : inviteModalData.city || undefined}
          suggestedEmail={undefined}
          onClose={() => setInviteModalData(null)}
          onSuccess={() => {
            setInviteModalData(null);
            router.refresh();
          }}
        />
      )}

      {/* Empty state */}
      {!results && !loading && (
        <div className="text-center py-8 text-sm text-slate-500">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p>Click above to source AI-recommended vendors and venues for this event.</p>
        </div>
      )}
    </Card>
  );
}

