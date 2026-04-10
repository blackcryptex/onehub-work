"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { useRouter } from "next/navigation";
import { Calendar, Users, Target, Palette, MessageSquare, UserPlus, ChevronRight, ChevronLeft } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ClientIntakeStep } from "@/components/events/ClientIntakeStep";
import { vaultDetail } from "@/lib/routes";

type WizardStep = "details" | "clients";

export default function EventWizardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<WizardStep>("details");
  const [formData, setFormData] = useState({
    name: "",
    event_type_raw: "", // Updated to free-text
    date: "",
    city: "",
    state: "",
    zipCode: "",
    headcount: "",
    budget_raw: "", // Updated to free-text
    venue: "",
    objective: "",
    style: "",
  });
  // Phase 3: Client intake state
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [autoShareSummary, setAutoShareSummary] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>("");

  // Validation function
  const validateForm = (data: typeof formData): { isValid: boolean; errors: Record<string, string> } => {
    const newErrors: Record<string, string> = {};

    // Event name: required, not just spaces
    if (!data.name || data.name.trim().length === 0) {
      newErrors.name = "Event name is required";
    }

    // Event type: required, not just spaces
    if (!data.event_type_raw || data.event_type_raw.trim().length === 0) {
      newErrors.event_type_raw = "Event type is required";
    }

    // Date: required and must be a valid date
    if (!data.date || data.date.trim().length === 0) {
      newErrors.date = "Event date is required";
    } else {
      const dateObj = new Date(data.date);
      if (isNaN(dateObj.getTime())) {
        newErrors.date = "Please enter a valid date";
      }
    }

    // City: required
    if (!data.city || data.city.trim().length === 0) {
      newErrors.city = "City is required";
    }

    // State: required, must be 2 characters
    if (!data.state || data.state.trim().length === 0) {
      newErrors.state = "State is required";
    } else if (data.state.trim().length !== 2) {
      newErrors.state = "State must be 2 characters (e.g., NY, CA)";
    }

    // Zip code: required, must be 5 digits
    if (!data.zipCode || data.zipCode.trim().length === 0) {
      newErrors.zipCode = "Zip code is required";
    } else if (!/^\d{5}$/.test(data.zipCode)) {
      newErrors.zipCode = "Zip code must be 5 digits";
    }

    // Headcount: required, must be a positive number
    if (!data.headcount || data.headcount.trim().length === 0) {
      newErrors.headcount = "Expected headcount is required";
    } else {
      const headcountNum = parseInt(data.headcount, 10);
      if (isNaN(headcountNum) || headcountNum < 1) {
        newErrors.headcount = "Headcount must be a number greater than 0";
      }
    }

    // Budget: required, not just spaces
    if (!data.budget_raw || data.budget_raw.trim().length === 0) {
      newErrors.budget_raw = "Budget is required";
    }

    // Style: required, not just spaces
    if (!data.style || data.style.trim().length === 0) {
      newErrors.style = "Event style & theme is required";
    }

    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors,
    };
  };

  const handleCreateEvent = useCallback(async () => {
    const validation = validateForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setFormError("Please fix the highlighted fields before submitting.");
      return;
    }

    setErrors({});
    setFormError("");

    if (!session?.user) {
      sessionStorage.setItem("pendingEvent", JSON.stringify(formData));
      router.push("/signin?redirect=/events/new&createEvent=true");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          clientIds: selectedClientIds,
          autoShareSummary,
        }),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("Event creation error:", responseData);

        if (response.status === 400 && responseData?.fieldErrors) {
          const mappedErrors: Record<string, string> = {};
          Object.entries(responseData.fieldErrors).forEach(([field, messages]) => {
            if (Array.isArray(messages) && messages[0]) {
              mappedErrors[field] = String(messages[0]);
            }
          });
          setErrors(mappedErrors);
          setFormError(responseData.error || "Please fix the highlighted fields before submitting.");
        } else if (response.status === 401) {
          setFormError("Please sign in to create an event.");
        } else if (response.status === 403) {
          setFormError(responseData?.error || "You do not have permission to create an event.");
        } else {
          setFormError(responseData?.error || "Failed to create event. Please try again.");
        }

        setLoading(false);
        return;
      }

      const { slug } = responseData;
      const eventPath = vaultDetail(session.user.role as any, slug);
      const openInNewTab = process.env.NEXT_PUBLIC_OPEN_EVENT_IN_NEW_TAB === "true";
      if (openInNewTab) {
        window.open(eventPath, "_blank");
      }

      router.push(eventPath as any);
    } catch (error) {
      console.error("Error creating event:", error);
      setFormError("An error occurred while creating the event. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [autoShareSummary, formData, router, selectedClientIds, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If on details step, validate and move to clients step (only for Pro Planners)
    if (step === "details") {
      const validation = validateForm(formData);
      if (!validation.isValid) {
        setErrors(validation.errors);
        setFormError("Please fix the highlighted fields before continuing.");
        return;
      }
      setErrors({});
      setFormError("");
      if (session?.user?.role === "PRO_PLANNER") {
        setStep("clients");
      } else {
        await handleCreateEvent();
      }
      return;
    }
    
    // If on clients step, create event
    if (step === "clients") {
      await handleCreateEvent();
      return;
    }
  };

  const handleBack = () => {
    if (step === "clients") {
      setStep("details");
    }
  };

  // Check for pending event data after sign in
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const createEvent = searchParams.get("createEvent");
    const pendingEvent = sessionStorage.getItem("pendingEvent");
    
    if (createEvent === "true" && pendingEvent && session?.user) {
      try {
        const parsed = JSON.parse(pendingEvent);
        setFormData(parsed);
        sessionStorage.removeItem("pendingEvent");
        // Auto-submit after restoring data
        setTimeout(() => {
          handleCreateEvent();
        }, 500);
      } catch (err) {
        console.error("Error parsing pending event:", err);
      }
    }
}, [session, status, handleCreateEvent]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    if (formError) {
      setFormError("");
    }
  };

  // Show loading state while checking session
  if (status === "loading") {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <div className="text-slate-600">Loading...</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Event Wizard</h1>
            <p className="text-slate-600">
              {step === "details" 
                ? "Fill out all fields below to create your event. AI will automatically generate your event brief, find vendors, create a budget, and set up checklists."
                : "Select or invite clients to link to this event. This step is optional - you can add clients later."}
            </p>
          </div>
          {!session?.user && (
            <div className="flex gap-2">
              <Button asChild variant="ghost">
                <Link href="/signin?redirect=/app/vault">Sign In</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/signup?redirect=/app/vault">Create Account</Link>
              </Button>
            </div>
          )}
        </div>
        
        {/* Step indicator (only show for Pro Planners) */}
        {session?.user?.role === "PRO_PLANNER" && (
          <div className="mt-6 flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step === "details" ? "text-indigo-600 font-semibold" : "text-slate-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === "details" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
              }`}>
                1
              </div>
              <span>Event Details</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
            <div className={`flex items-center gap-2 ${step === "clients" ? "text-indigo-600 font-semibold" : "text-slate-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === "clients" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
              }`}>
                2
              </div>
              <span>Client Intake</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-6">
          {/* Form-level error summary */}
          {(formError || Object.keys(errors).length > 0) && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-sm font-medium text-rose-800 mb-1">
                {formError || "Please fix the errors below before submitting:"}
              </p>
              {Object.keys(errors).length > 0 && (
                <ul className="text-sm text-rose-700 list-disc list-inside space-y-1">
                  {Object.values(errors).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Step 1: Event Details */}
          {step === "details" && (
            <>
            <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Event Basics */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" /> Event Basics
                </h2>
                <div>
                  <Label htmlFor="name">Event Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    required
                    placeholder="e.g., Summer Wedding Reception"
                    className={`text-slate-900 ${errors.name ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500" : ""}`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-rose-600">{errors.name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="event_type_raw">Event Type *</Label>
                  <Input
                    id="event_type_raw"
                    value={formData.event_type_raw}
                    onChange={(e) => updateField("event_type_raw", e.target.value)}
                    required
                    placeholder="e.g., black-tie wedding, company retreat, charity gala"
                    className={`text-slate-900 ${errors.event_type_raw ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500" : ""}`}
                    aria-describedby="eventTypeHelp"
                  />
                  {errors.event_type_raw ? (
                    <p className="mt-1 text-sm text-rose-600">{errors.event_type_raw}</p>
                  ) : (
                    <p id="eventTypeHelp" className="mt-1 text-xs text-slate-500">
                      Type anything (e.g., "black-tie wedding", "church wedding", "company retreat").
                    </p>
                  )}
                </div>
              </div>

              {/* Date &amp; Location */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5" /> Date &amp; Location
                </h2>
                <div>
                  <Label htmlFor="date">Event Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => updateField("date", e.target.value)}
                    required
                    className={`text-slate-900 ${errors.date ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500" : ""}`}
                  />
                  {errors.date && (
                    <p className="mt-1 text-sm text-rose-600">{errors.date}</p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      required
                      placeholder="New York"
                      className={`text-slate-900 ${errors.city ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500" : ""}`}
                    />
                    {errors.city && (
                      <p className="mt-1 text-sm text-rose-600">{errors.city}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => updateField("state", e.target.value.toUpperCase())}
                      required
                      placeholder="NY"
                      maxLength={2}
                      className={`text-slate-900 uppercase ${errors.state ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500" : ""}`}
                      style={{ textTransform: "uppercase" }}
                    />
                    {errors.state && (
                      <p className="mt-1 text-sm text-rose-600">{errors.state}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="zipCode">Zip Code *</Label>
                    <Input
                      id="zipCode"
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => updateField("zipCode", e.target.value.replace(/\D/g, ""))}
                      required
                      placeholder="10001"
                      maxLength={5}
                      className={`text-slate-900 ${errors.zipCode ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500" : ""}`}
                    />
                    {errors.zipCode && (
                      <p className="mt-1 text-sm text-rose-600">{errors.zipCode}</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="venue">Venue (Optional)</Label>
                  <Input
                    id="venue"
                    value={formData.venue}
                    onChange={(e) => updateField("venue", e.target.value)}
                    placeholder="e.g., Grand Ballroom, Central Park, etc."
                    className="text-slate-900"
                  />
                </div>
              </div>

              {/* Scale &amp; Budget */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5" /> Scale &amp; Budget
                </h2>
                <div>
                  <Label htmlFor="headcount">Expected Headcount *</Label>
                  <Input
                    id="headcount"
                    type="number"
                    value={formData.headcount}
                    onChange={(e) => updateField("headcount", e.target.value)}
                    required
                    placeholder="e.g., 150"
                    min="1"
                    className={`text-slate-900 ${errors.headcount ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500" : ""}`}
                  />
                  {errors.headcount && (
                    <p className="mt-1 text-sm text-rose-600">{errors.headcount}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="budget_raw">Budget *</Label>
                  <Input
                    id="budget_raw"
                    value={formData.budget_raw}
                    onChange={(e) => updateField("budget_raw", e.target.value)}
                    required
                    placeholder="e.g., $12,500, 10k-15k, under 5k, about 30k EUR"
                    className={`text-slate-900 ${errors.budget_raw ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500" : ""}`}
                    aria-describedby="budgetHelp"
                  />
                  {errors.budget_raw ? (
                    <p className="mt-1 text-sm text-rose-600">{errors.budget_raw}</p>
                  ) : (
                    <p id="budgetHelp" className="mt-1 text-xs text-slate-500">
                      Type any format: "$12,500", "10k–15k", "under 5k", "about 30k EUR".
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Objective */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5" /> Objective
                </h2>
                <div>
                  <Label htmlFor="objective">What’s the main goal of this event? (Optional)</Label>
                  <textarea
                    id="objective"
                    value={formData.objective}
                    onChange={(e) => updateField("objective", e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-white"
                    placeholder="Describe what you want to achieve with this event..."
                  />
                </div>
              </div>

              {/* Style */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Palette className="w-5 h-5" /> Style &amp; Theme
                </h2>
                <div>
                  <Label htmlFor="style">Event Style &amp; Theme *</Label>
                  <textarea
                    id="style"
                    value={formData.style}
                    onChange={(e) => updateField("style", e.target.value)}
                    required
                    rows={6}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 text-slate-900 bg-white ${
                      errors.style
                        ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
                        : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                    }`}
                    placeholder="Describe the style, theme, atmosphere you want (e.g., elegant, casual, modern, rustic)..."
                  />
                  {errors.style && (
                    <p className="mt-1 text-sm text-rose-600">{errors.style}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* AI Preview Box */}
          <div className="mt-8 p-4 bg-indigo-50 rounded-lg">
            <p className="text-sm text-indigo-900 mb-2">
              <strong>✨ AI will automatically:</strong>
            </p>
            <ul className="text-sm text-indigo-800 list-disc list-inside space-y-1">
              <li>Draft an event brief</li>
              <li>Search for matching vendors and venues</li>
              <li>Establish a budget with contingency</li>
              <li>Auto-allocate line items with targets and buffers</li>
              <li>Create initial checklist and milestones</li>
            </ul>
          </div>

          {/* Step 1: Submit Button */}
          <div className="mt-8 flex justify-end">
            <Button type="submit" disabled={loading} className="px-8 py-2">
              {session?.user?.role === "PRO_PLANNER" ? (
                <>Next: Client Intake <ChevronRight className="w-4 h-4 ml-2" /></>
              ) : (
                loading ? "Creating Event..." : "Create Event"
              )}
            </Button>
          </div>
            </>
          )}

          {/* Step 2: Client Intake */}
          {step === "clients" && (
            <div>
              <ClientIntakeStep
                selectedClientIds={selectedClientIds}
                onClientIdsChange={setSelectedClientIds}
                autoShareSummary={autoShareSummary}
                onAutoShareChange={setAutoShareSummary}
              />
              
              {/* Step 2: Navigation Buttons */}
              <div className="mt-8 flex justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  disabled={loading}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button type="submit" disabled={loading} className="px-8 py-2">
                  {loading ? "Creating Event..." : "Create Event"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </form>
    </div>
  );
}
