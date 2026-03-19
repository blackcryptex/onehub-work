"use client";

import { useState, useEffect } from "react";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { useRouter } from "next/navigation";
import { Briefcase, Building2, Target, DollarSign } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type FormState = {
  orgName: string;
  orgType: "PLANNER" | "CLIENT_AGENCY";
  location: string;
  teamSize: string;
  specialties: string;
  pricingModel: string;
};

export default function ProfessionalPlannerSetupPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormState>({
    orgName: "",
    orgType: "PLANNER",
    location: "",
    teamSize: "",
    specialties: "",
    pricingModel: "",
  });

  async function handleCreateOrg(dataToUse: FormState = formData) {
    setLoading(true);
    try {
      const response = await fetch("/api/orgs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToUse),
      });

      if (response.ok) {
        await response.json();
        // Redirect to Pro Planner Dashboard
        router.push("/pro/planner");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to create organization. Please try again.");
      }
    } catch (error) {
      console.error("Error creating organization:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Check for pending data from signup
  // eslint-disable-next-line react-hooks/exhaustive-deps -- restore pending setup only when session changes
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const createOrg = searchParams.get("createOrg");
    const dataParam = searchParams.get("data");
    const redirectTo = searchParams.get("redirectTo") || "/pro/planner";

    if (createOrg === "true" && dataParam && session?.user) {
      try {
        const parsed = JSON.parse(decodeURIComponent(dataParam));
        setFormData(parsed);
        setStep(5); // Go to review step
        // Auto-submit after a moment, then redirect to Pro Planner Dashboard
        setTimeout(async () => {
          await handleCreateOrg(parsed);
          // handleCreateOrg will redirect, but ensure it goes to /pro/planner
          router.push(redirectTo as any);
        }, 1000);
      } catch (err) {
        console.error("Error parsing setup data:", err);
      }
    } else {
      const pendingData = sessionStorage.getItem("pendingProPlannerSetup");
      if (pendingData && session?.user) {
        try {
          const parsed = JSON.parse(pendingData);
          setFormData(parsed);
          setStep(5);
        } catch (err) {
          console.error("Error parsing setup data:", err);
        }
      }
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 5) {
      setStep(step + 1);
      return;
    }

    // If not authenticated, redirect to signup with data and callbackUrl
    if (!session?.user) {
      sessionStorage.setItem("pendingProPlannerSetup", JSON.stringify(formData));
      router.push(`/signup?role=PRO_PLANNER&setup=true&callbackUrl=${encodeURIComponent("/pro/planner")}`);
      return;
    }

    await handleCreateOrg();
  };

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Set Up Your Planning Business</h1>
        <p className="text-slate-600">
          {session?.user 
            ? "Create your planning agency to start managing client events."
            : "Get started by setting up your planning business. You\u2019ll create an account to save it."}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8 flex items-center justify-between">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= s ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              {s}
            </div>
            {s < 5 && (
              <div
                className={`flex-1 h-1 mx-2 ${step > s ? "bg-indigo-600" : "bg-slate-200"}`}
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
                <Briefcase className="w-5 h-5" /> Business Basics
              </h2>
              <div>
                <Label htmlFor="orgName">Business Name *</Label>
                <Input
                  id="orgName"
                  value={formData.orgName}
                  onChange={(e) => updateField("orgName", e.target.value)}
                  required
                  placeholder="e.g., Elite Event Planning"
                />
              </div>
              <div>
                <Label htmlFor="orgType">Business Type *</Label>
                <Select
                  id="orgType"
                  value={formData.orgType}
                  onChange={(event) => updateField("orgType", event.target.value as FormState["orgType"])}
                  required
                >
                  <option value="PLANNER">Event Planning Agency</option>
                  <option value="CLIENT_AGENCY">Client Agency</option>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Building2 className="w-5 h-5" /> Location &amp; Team
              </h2>
              <div>
                <Label htmlFor="location">Primary Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  required
                  placeholder="e.g., New York, NY"
                />
              </div>
              <div>
                <Label htmlFor="teamSize">Team Size *</Label>
                <Select
                  id="teamSize"
                  value={formData.teamSize}
                  onChange={(e) => updateField("teamSize", e.target.value)}
                  required
                >
                  <option value="">Select size</option>
                  <option value="1">Just me</option>
                  <option value="2-5">2-5 team members</option>
                  <option value="6-10">6-10 team members</option>
                  <option value="11+">11+ team members</option>
                </Select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Target className="w-5 h-5" /> Specialties
              </h2>
              <div>
                <Label htmlFor="specialties">Event Types You Specialize In *</Label>
                <textarea
                  id="specialties"
                  value={formData.specialties}
                  onChange={(e) => updateField("specialties", e.target.value)}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., Corporate events, weddings, galas, conferences..."
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5" /> Pricing Model
              </h2>
              <div>
                <Label htmlFor="pricingModel">How do you charge clients? *</Label>
                <Select
                  id="pricingModel"
                  value={formData.pricingModel}
                  onChange={(e) => updateField("pricingModel", e.target.value)}
                  required
                >
                  <option value="">Select model</option>
                  <option value="FIXED">Fixed fee per event</option>
                  <option value="PERCENTAGE">Percentage of event budget</option>
                  <option value="HOURLY">Hourly rate</option>
                  <option value="HYBRID">Hybrid model</option>
                </Select>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Review &amp; Create</h2>
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                <div><strong>Business Name:</strong> {formData.orgName}</div>
                <div><strong>Type:</strong> {formData.orgType}</div>
                <div><strong>Location:</strong> {formData.location}</div>
                <div><strong>Team Size:</strong> {formData.teamSize}</div>
                <div><strong>Specialties:</strong> {formData.specialties}</div>
                <div><strong>Pricing Model:</strong> {formData.pricingModel}</div>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm text-indigo-900">
                  <strong>✨ AI will now:</strong>
                </p>
                <ul className="mt-2 space-y-1 text-sm text-indigo-800 list-disc list-inside">
                  <li>Set up your planning organization</li>
                  <li>Create your first client workspace</li>
                  <li>Configure team collaboration tools</li>
                  <li>Set up vendor relationship management</li>
                </ul>
              </div>
              {!session?.user && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-900">
                    <strong>📝 Next Step:</strong> You’ll need to create an account to save your business setup.
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
                {loading ? "Creating..." : step === 5 ? (session?.user ? "Create Organization" : "Create Account &amp; Setup") : "Continue →"}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}

