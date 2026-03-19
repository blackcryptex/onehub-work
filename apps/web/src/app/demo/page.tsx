"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { CheckCircle2, XCircle, Loader2, Sparkles } from "lucide-react";

interface PreflightStatus {
  demoModeActive: boolean;
  seedOk: boolean;
  verifiedListingsCount: number;
  ai: {
    hasOpenAIKey: boolean;
    fallbackActive: boolean;
  };
  timestamp: string;
  error?: string;
}

export default function DemoPage() {
  const [status, setStatus] = useState<PreflightStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    async function fetchPreflight() {
      try {
        const response = await fetch("/api/demo/preflight");
        const data = await response.json();
        setStatus(data);
      } catch (err) {
        console.error("[Demo] Error fetching preflight:", err);
        setStatus({
          demoModeActive: false,
          seedOk: false,
          verifiedListingsCount: 0,
          ai: { hasOpenAIKey: false, fallbackActive: false },
          timestamp: new Date().toISOString(),
          error: "Failed to load preflight status",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchPreflight();
  }, []);

  const handleStart = (role: "pro" | "diy") => {
    router.push(`/demo/start?role=${role}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-slate-900">OneHub Demo Launcher</h1>
          <p className="text-slate-600">
            Preflight checks ensure the demo runs smoothly. Fix any issues below before starting.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="p-4 bg-rose-50 border-rose-200">
            <div className="flex items-center gap-2 text-rose-800">
              <XCircle className="w-5 h-5" />
              <div>
                <p className="font-medium">Demo cannot start</p>
                <p className="text-sm text-rose-600 mt-1">
                  {error === "seed"
                    ? "Demo event not found. Please run the seed script: npx tsx scripts/seed.ts"
                    : "An error occurred. Please check the preflight status below."}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Preflight Status */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-semibold">Preflight Status</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : status ? (
            <div className="space-y-4">
              {/* Demo Mode */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="font-medium">Demo Mode</div>
                  <div className="text-sm text-slate-600">
                    {status.demoModeActive
                      ? "Demo fallbacks are active"
                      : "Set ONEHUB_DEMO_MODE=true in your environment"}
                  </div>
                </div>
                {status.demoModeActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    OK
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-sm font-medium text-rose-700">
                    <XCircle className="w-4 h-4" />
                    Fix
                  </span>
                )}
              </div>

              {/* Seed Data */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="font-medium">Seed Data</div>
                  <div className="text-sm text-slate-600">
                    {status.seedOk
                      ? `Demo event found (${status.verifiedListingsCount} verified listings)`
                      : "Run seed script: npx tsx scripts/seed.ts"}
                  </div>
                </div>
                {status.seedOk ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    OK
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-sm font-medium text-rose-700">
                    <XCircle className="w-4 h-4" />
                    Fix
                  </span>
                )}
              </div>

              {/* AI Status */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="font-medium">AI / Fallback</div>
                  <div className="text-sm text-slate-600">
                    {status.ai.fallbackActive
                      ? status.ai.hasOpenAIKey
                        ? "OpenAI configured (fallback available)"
                        : "Using demo fallback (no OpenAI key needed)"
                      : "AI unavailable and fallback not active"}
                  </div>
                </div>
                {status.ai.fallbackActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    OK
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
                    <XCircle className="w-4 h-4" />
                    Warning
                  </span>
                )}
              </div>

              {/* Timestamp */}
              <div className="text-xs text-slate-500 pt-2 border-t">
                Last checked: {new Date(status.timestamp).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-600">
              Failed to load preflight status
            </div>
          )}
        </Card>

        {/* Start Buttons */}
        <div className="grid md:grid-cols-2 gap-4">
          <Button
            onClick={() => handleStart("pro")}
            disabled={!status?.seedOk}
            size="lg"
            className="h-20 text-lg"
            variant="default"
          >
            <div className="text-center">
              <div className="font-semibold">Start as Pro Planner</div>
              <div className="text-sm font-normal opacity-90">
                Professional event planning workflow
              </div>
            </div>
          </Button>

          <Button
            onClick={() => handleStart("diy")}
            disabled={!status?.seedOk}
            size="lg"
            className="h-20 text-lg"
            variant="secondary"
          >
            <div className="text-center">
              <div className="font-semibold">Start as DIY Planner</div>
              <div className="text-sm font-normal opacity-90">
                Self-service event planning
              </div>
            </div>
          </Button>
        </div>

        {/* Help Text */}
        {!status?.seedOk && (
          <Card className="p-4 bg-amber-50 border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Quick Fix:</strong> Run the seed script to create demo data:
            </p>
            <code className="block mt-2 p-2 bg-amber-100 rounded text-xs">
              npx tsx scripts/seed.ts
            </code>
          </Card>
        )}

        {/* Instructions */}
        <Card className="p-4 bg-slate-50">
          <h3 className="font-semibold mb-2">Demo Flow</h3>
          <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
            <li>Click "Start as Pro Planner" or "Start as DIY Planner"</li>
            <li>Navigate to Event Vault → Demo Wedding Event</li>
            <li>Click "AI Source Vendors & Venues"</li>
            <li>Add verified vendor to shortlist</li>
            <li>Generate AI proposal from shortlist</li>
            <li>Approve proposal → Generate contract</li>
            <li>View milestone payment status</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}

