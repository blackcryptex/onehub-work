"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { useRouter } from "next/navigation";
import { Star, Sparkles, Palette, Calendar, Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { Route } from "next";

export default function EventDreamerCreatePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    eventType: "", // Legacy - kept for backward compatibility
    event_type_raw: "", // New free-text field
    inspiration: "",
    style: "",
    budget: "", // Legacy
    budget_raw: "", // New free-text field
    timeline: "",
    mustHaves: "",
  });

  const handleCreateDream = useCallback(
    async (dataToUse = formData) => {
      setLoading(true);
      try {
        const response = await fetch("/api/dreams/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToUse),
        });

        if (response.ok) {
          const { slug } = await response.json();
          router.push(`/app/events/${slug}` as unknown as Route);
        } else {
          alert("Failed to save your dream event. Please try again.");
        }
      } catch (error) {
        console.error("Error creating dream:", error);
        alert("An error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [formData, router],
  );

  useEffect(() => {
    const searchParams =
      typeof window !== "undefined" && window.location.search
        ? new URLSearchParams(window.location.search)
        : null;
    const createDream = searchParams?.get("createDream");
    const dataParam = searchParams?.get("data");
    if (createDream === "true" && dataParam && session?.user) {
      try {
        const parsed = JSON.parse(decodeURIComponent(dataParam));
        setFormData(parsed);
        setStep(5);
        setTimeout(() => {
          handleCreateDream(parsed);
        }, 1000);
      } catch (err) {
        console.error("Error parsing dream data:", err);
      }
    } else {
      const pendingData = sessionStorage.getItem("pendingDreamEvent");
      if (pendingData && session?.user) {
        try {
          const parsed = JSON.parse(pendingData);
          setFormData(parsed);
          setStep(5);
        } catch (err) {
          console.error("Error parsing dream data:", err);
        }
      }
    }
  }, [handleCreateDream, session?.user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 5) {
      setStep(step + 1);
      return;
    }

    if (!session?.user) {
      sessionStorage.setItem("pendingDreamEvent", JSON.stringify(formData));
      router.push(`/signup?role=CLIENT&createDream=true`);
      return;
    }

    await handleCreateDream();
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <Star className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Create Your Dream Event</h1>
        <p className="text-slate-600">
          {session?.user 
            ? "Let AI inspire you and save your dream event ideas for later."
            : "Explore ideas and save your dream event. Create an account to save it."}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8 flex items-center justify-between">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= s ? "bg-yellow-500 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              {s}
            </div>
            {s < 5 && (
              <div
                className={`flex-1 h-1 mx-2 ${step > s ? "bg-yellow-500" : "bg-slate-200"}`}
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> Dream Inspiration
              </h2>
              <div>
                <Label htmlFor="title">What’s your dream event called? *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  required
                  placeholder="e.g., My Perfect Wedding, Dream Gala..."
                />
              </div>
              <div>
                <Label htmlFor="event_type_raw">Event Type *</Label>
                <Input
                  id="event_type_raw"
                  value={formData.event_type_raw || formData.eventType}
                  onChange={(e) => {
                    updateField("event_type_raw", e.target.value);
                    updateField("eventType", e.target.value); // Keep legacy field in sync
                  }}
                  placeholder="e.g., black-tie wedding, company retreat, charity gala"
                  required
                  className="text-slate-900"
                  aria-describedby="eventTypeHelp"
                />
                <p id="eventTypeHelp" className="mt-1 text-xs text-slate-500">
                  Type anything (e.g., “black-tie wedding”, “church wedding”, “company retreat”).
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Heart className="w-5 h-5" /> What Inspires You?
              </h2>
              <div>
                <Label htmlFor="inspiration">Describe your vision and inspiration *</Label>
                <textarea
                  id="inspiration"
                  value={formData.inspiration}
                  onChange={(e) => updateField("inspiration", e.target.value)}
                  required
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Tell us what makes this event special to you... What are your hopes and dreams for it?"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Palette className="w-5 h-5" /> Style &amp; Atmosphere
              </h2>
              <div>
                <Label htmlFor="style">Describe the style, theme, and atmosphere *</Label>
                <textarea
                  id="style"
                  value={formData.style}
                  onChange={(e) => updateField("style", e.target.value)}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., Elegant and romantic, Modern and minimal, Rustic and charming..."
                />
              </div>
              <div>
                <Label htmlFor="mustHaves">Must-Haves (What can’t you imagine this event without?)</Label>
                <textarea
                  id="mustHaves"
                  value={formData.mustHaves}
                  onChange={(e) => updateField("mustHaves", e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., Live band, outdoor ceremony, signature cocktail..."
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Timeline &amp; Budget
              </h2>
              <div>
                <Label htmlFor="timeline">When are you dreaming of having this event? *</Label>
                <select
                  id="timeline"
                  value={formData.timeline}
                  onChange={(e) => updateField("timeline", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select timeline</option>
                  <option value="ASAP">As soon as possible</option>
                  <option value="3_MONTHS">Within 3 months</option>
                  <option value="6_MONTHS">Within 6 months</option>
                  <option value="1_YEAR">Within 1 year</option>
                  <option value="FUTURE">Someday (just dreaming)</option>
                </select>
              </div>
              <div>
                <Label htmlFor="budget_raw">Estimated Budget *</Label>
                <Input
                  id="budget_raw"
                  value={formData.budget_raw || formData.budget}
                  onChange={(e) => {
                    updateField("budget_raw", e.target.value);
                    updateField("budget", e.target.value); // Keep legacy field in sync
                  }}
                  required
                  placeholder="e.g., $12,500, 10k-15k, under 5k, about 30k EUR"
                  className="text-slate-900"
                  aria-describedby="budgetHelp"
                />
                <p id="budgetHelp" className="mt-1 text-xs text-slate-500">
                  Type any format: “$12,500”, “10k–15k”, “under 5k”, “about 30k EUR”.
                </p>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Review Your Dream</h2>
              <div className="space-y-4 p-4 bg-gradient-to-br from-yellow-50 to-indigo-50 rounded-lg">
                <div><strong>Dream Event:</strong> {formData.title}</div>
                <div><strong>Type:</strong> {formData.eventType}</div>
                <div><strong>Inspiration:</strong> {formData.inspiration}</div>
                <div><strong>Style:</strong> {formData.style}</div>
                <div><strong>Timeline:</strong> {formData.timeline}</div>
                <div><strong>Budget:</strong> {formData.budget}</div>
                {formData.mustHaves && <div><strong>Must-Haves:</strong> {formData.mustHaves}</div>}
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-900">
                  <strong>✨ AI will now:</strong>
                </p>
                <ul className="mt-2 space-y-1 text-sm text-yellow-800 list-disc list-inside">
                  <li>Generate creative ideas and suggestions</li>
                  <li>Find inspiration images and examples</li>
                  <li>Recommend vendors and venues</li>
                  <li>Create a vision board for your dream</li>
                  <li>Save it for when you’re ready to plan</li>
                </ul>
              </div>
              {!session?.user && (
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <p className="text-sm text-indigo-900">
                    <strong>📝 Next Step:</strong> Create a free account to save your dream and get AI-powered inspiration.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex justify-between">
            {step > 1 && (
              <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
                Previous
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              {!session?.user && (
                <Button asChild variant="secondary" type="button">
                  <Link href="/signin">Sign In</Link>
                </Button>
              )}
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : step === 5 ? (session?.user ? "Save Dream" : "Create Account &amp; Save") : "Continue →"}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}

