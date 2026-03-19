"use client";

import { useState } from "react";
import { Button } from "@onehub/ui";
import { Share2, X } from "lucide-react";

interface ShareEventButtonProps {
  eventSlug: string;
  stakeholders: Array<{
    userId: string;
    role: "CLIENT" | "STAKEHOLDER";
    user?: { id: string; name: string | null; email: string | null };
  }>;
  shares: Array<{
    viewerUserId: string;
    scope: "SUMMARY";
  }>;
  onShareChange?: () => void;
}

/**
 * Phase 2: Pro-side UI control to share/unshare SUMMARY with selected clients
 * 
 * Shows a button that opens a modal/dropdown to manage shares.
 * Only shows clients who are stakeholders.
 */
export function ShareEventButton({
  eventSlug,
  stakeholders,
  shares,
  onShareChange,
}: ShareEventButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Filter to only CLIENT stakeholders
  const clientStakeholders = stakeholders.filter((s) => s.role === "CLIENT");

  const handleShare = async (viewerUserId: string) => {
    setLoading((prev) => ({ ...prev, [viewerUserId]: true }));
    try {
      const response = await fetch(`/api/events/${eventSlug}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          viewerUserId,
          scope: "SUMMARY",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to share event");
      }

      if (onShareChange) {
        onShareChange();
      }
    } catch (error) {
      console.error("Error sharing event:", error);
      alert(error instanceof Error ? error.message : "Failed to share event");
    } finally {
      setLoading((prev) => ({ ...prev, [viewerUserId]: false }));
    }
  };

  const handleUnshare = async (viewerUserId: string) => {
    setLoading((prev) => ({ ...prev, [viewerUserId]: true }));
    try {
      const response = await fetch(`/api/events/${eventSlug}/share?viewerUserId=${viewerUserId}&scope=SUMMARY`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to unshare event");
      }

      if (onShareChange) {
        onShareChange();
      }
    } catch (error) {
      console.error("Error unsharing event:", error);
      alert(error instanceof Error ? error.message : "Failed to unshare event");
    } finally {
      setLoading((prev) => ({ ...prev, [viewerUserId]: false }));
    }
  };

  const isShared = (userId: string) => {
    return shares.some((s) => s.viewerUserId === userId && s.scope === "SUMMARY");
  };

  if (clientStakeholders.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share Summary
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-20">
            <div className="p-3 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Share Summary with Clients</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-2 max-h-64 overflow-y-auto">
              {clientStakeholders.length === 0 ? (
                <p className="text-sm text-slate-500 p-2">No client stakeholders</p>
              ) : (
                <div className="space-y-1">
                  {clientStakeholders.map((stakeholder) => {
                    const userId = stakeholder.userId;
                    const userName = stakeholder.user?.name || stakeholder.user?.email || "Unknown";
                    const shared = isShared(userId);
                    const isLoading = loading[userId];

                    return (
                      <div
                        key={userId}
                        className="flex items-center justify-between p-2 rounded hover:bg-slate-50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {userName}
                          </p>
                          {shared && (
                            <p className="text-xs text-green-600">Shared</p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (shared) {
                              handleUnshare(userId);
                            } else {
                              handleShare(userId);
                            }
                          }}
                          disabled={isLoading}
                          className={`ml-2 px-2 py-1 text-xs rounded ${
                            shared
                              ? "bg-red-50 text-red-700 hover:bg-red-100"
                              : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                          } disabled:opacity-50`}
                        >
                          {isLoading ? "..." : shared ? "Unshare" : "Share"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
