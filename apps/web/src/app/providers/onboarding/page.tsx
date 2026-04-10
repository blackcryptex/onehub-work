"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Tag,
  DollarSign,
  Calendar,
  Image as ImageIcon,
  Bell,
  FileText,
  CheckCircle2,
  Plus,
  X,
} from "lucide-react";

type ProviderType = "vendor" | "venue";

type Service = {
  category: string;
  name: string;
  startingPrice: number | null;
  description: string;
  addOns: string[];
};

type Space = {
  name: string;
  capacityMin: number | null;
  capacityMax: number | null;
  indoorOutdoor: "indoor" | "outdoor" | "both" | null;
  notes: string;
};

type Availability = {
  minNoticeDays: number | null;
  maxEventsPerDay: number | null;
  serviceAreaRadiusMiles: number | null;
  blackoutDates: string[];
  daysOfWeek: string[];
};

type Payments = {
  depositType: "percent" | "flat" | null;
  depositValue: number | null;
  finalDueDaysBeforeEvent: number | null;
  cancellationPolicy: string;
  reschedulePolicy: string;
};

type Media = {
  logoUrl: string | null;
  heroImageUrl: string | null;
  galleryUrls: string[];
};

type Notifications = {
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  responseTimeLabel: string;
};

type ProviderProfileDraft = {
  // Step 1: Business Profile
  businessName: string;
  providerCategory: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  instagram: string;
  facebook: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  about: string;
  
  // Step 2: Services/Space Details
  servicesJson: Service[] | null;
  spacesJson: Space[] | null;
  
  // Step 3: Availability & Booking Rules
  availabilityJson: Availability | null;
  
  // Step 4: Payments & Contracts
  paymentsJson: Payments | null;
  
  // Step 5: Media & Branding
  mediaJson: Media | null;
  
  // Step 6: Notifications & Preferences
  notificationsJson: Notifications | null;
};

export default function ProviderOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update: updateSession } = useSession();
  const providerType = (searchParams.get("providerType") || "vendor") as ProviderType;
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [formData, setFormData] = useState<ProviderProfileDraft>({
    businessName: "",
    providerCategory: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    instagram: "",
    facebook: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
    about: "",
    servicesJson: providerType === "vendor" ? [] : null,
    spacesJson: providerType === "venue" ? [] : null,
    availabilityJson: {
      minNoticeDays: null,
      maxEventsPerDay: null,
      serviceAreaRadiusMiles: null,
      blackoutDates: [],
      daysOfWeek: [],
    },
    paymentsJson: {
      depositType: null,
      depositValue: null,
      finalDueDaysBeforeEvent: null,
      cancellationPolicy: "",
      reschedulePolicy: "",
    },
    mediaJson: {
      logoUrl: null,
      heroImageUrl: null,
      galleryUrls: [],
    },
    notificationsJson: {
      emailEnabled: true,
      smsEnabled: false,
      inAppEnabled: true,
      responseTimeLabel: "",
    },
  });

  const handlePublish = async () => {
    setLoading(true);
    try {
      // Check auth status first
      if (!session?.user) {
        // Save to sessionStorage and redirect to auth
        sessionStorage.setItem("pendingProviderOnboarding", JSON.stringify({
          formData,
          step: 7,
          providerType,
        }));
        const role = providerType === "vendor" ? "VENDOR" : "VENUE";
        const callbackUrl = providerType === "vendor" ? "/vendor/dashboard" : "/venue/dashboard";
        router.push(`/signup?role=${role}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
        setLoading(false);
        return;
      }

      // User is authenticated, save profile
      const response = await fetch("/api/providers/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerType,
          ...formData,
          draft: false,
        }),
      });

      if (response.ok) {
        const nextRole = providerType === "vendor" ? "VENDOR" : "VENUE";
        await updateSession?.({ role: nextRole });
        sessionStorage.removeItem("pendingProviderOnboarding");
        const dashboardUrl = providerType === "vendor" ? "/vendor/dashboard" : "/venue/dashboard";
        router.push(dashboardUrl);
        router.refresh();
      } else {
        const errorData = await response.json().catch(() => null);
        setFormError(errorData?.error || "Failed to publish profile. Please try again.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error publishing profile:", error);
      setFormError("An error occurred while publishing your profile. Please try again.");
      setLoading(false);
    }
  };

  // Check for pending data from signup or auto-submit
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const autoSubmit = searchParams.get("autoSubmit");
    const dataParam = searchParams.get("data");
    const redirectTo = searchParams.get("redirectTo");

    if (autoSubmit === "true" && dataParam && session?.user) {
      try {
        const parsed = JSON.parse(decodeURIComponent(dataParam));
        setFormData(parsed);
        setStep(7); // Go to review step
        // Auto-publish after a moment, then redirect
        setTimeout(async () => {
          setLoading(true);
          try {
            const response = await fetch("/api/providers/profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                providerType,
                ...parsed,
                draft: false,
              }),
            });

            if (response.ok) {
              const nextRole = providerType === "vendor" ? "VENDOR" : "VENUE";
              await updateSession?.({ role: nextRole });
              sessionStorage.removeItem("pendingProviderOnboarding");
              const targetUrl = redirectTo || (providerType === "vendor" ? "/vendor/dashboard" : "/venue/dashboard");
              router.push(targetUrl as Route);
              router.refresh();
            } else {
              const errorData = await response.json().catch(() => null);
              setFormError(errorData?.error || "Failed to publish profile. Please try again.");
              setLoading(false);
            }
          } catch (error) {
            console.error("Error auto-publishing profile:", error);
            setFormError("An error occurred while publishing your profile. Please try again.");
            setLoading(false);
          }
        }, 1000);
      } catch (err) {
        console.error("Error parsing auto-submit data:", err);
      }
    } else {
      const pendingData = sessionStorage.getItem("pendingProviderOnboarding");
      if (pendingData && session?.user) {
        try {
          const parsed = JSON.parse(pendingData);
          setFormData(parsed.formData || formData);
          setStep(parsed.step || 7); // Go to review step
        } catch (err) {
          console.error("Error parsing pending data:", err);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const updateField = <K extends keyof ProviderProfileDraft>(field: K, value: ProviderProfileDraft[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formError) setFormError("");
    if (draftMessage) setDraftMessage("");
  };

  // Helper functions for managing arrays
  const addService = () => {
    const newService: Service = {
      category: "",
      name: "",
      startingPrice: null,
      description: "",
      addOns: [],
    };
    setFormData((prev) => ({
      ...prev,
      servicesJson: [...(prev.servicesJson || []), newService],
    }));
  };

  const updateService = (index: number, field: keyof Service, value: any) => {
    setFormData((prev) => {
      const services = [...(prev.servicesJson || [])];
      const currentService = services[index] || {
        category: "",
        name: "",
        startingPrice: null,
        description: "",
        addOns: [],
      };
      services[index] = { ...currentService, [field]: value } as Service;
      return { ...prev, servicesJson: services };
    });
  };

  const removeService = (index: number) => {
    setFormData((prev) => {
      const services = [...(prev.servicesJson || [])];
      services.splice(index, 1);
      return { ...prev, servicesJson: services };
    });
  };

  const addSpace = () => {
    const newSpace: Space = {
      name: "",
      capacityMin: null,
      capacityMax: null,
      indoorOutdoor: null,
      notes: "",
    };
    setFormData((prev) => ({
      ...prev,
      spacesJson: [...(prev.spacesJson || []), newSpace],
    }));
  };

  const updateSpace = (index: number, field: keyof Space, value: any) => {
    setFormData((prev) => {
      const spaces = [...(prev.spacesJson || [])];
      const currentSpace = spaces[index] || {
        name: "",
        capacityMin: null,
        capacityMax: null,
        indoorOutdoor: null,
        notes: "",
      };
      spaces[index] = { ...currentSpace, [field]: value } as Space;
      return { ...prev, spacesJson: spaces };
    });
  };

  const removeSpace = (index: number) => {
    setFormData((prev) => {
      const spaces = [...(prev.spacesJson || [])];
      spaces.splice(index, 1);
      return { ...prev, spacesJson: spaces };
    });
  };

  const addGalleryUrl = () => {
    setFormData((prev) => ({
      ...prev,
      mediaJson: {
        ...prev.mediaJson!,
        galleryUrls: [...(prev.mediaJson?.galleryUrls || []), ""],
      },
    }));
  };

  const updateGalleryUrl = (index: number, value: string) => {
    setFormData((prev) => {
      const urls = [...(prev.mediaJson?.galleryUrls || [])];
      urls[index] = value;
      return {
        ...prev,
        mediaJson: { ...prev.mediaJson!, galleryUrls: urls },
      };
    });
  };

  const removeGalleryUrl = (index: number) => {
    setFormData((prev) => {
      const urls = [...(prev.mediaJson?.galleryUrls || [])];
      urls.splice(index, 1);
      return {
        ...prev,
        mediaJson: { ...prev.mediaJson!, galleryUrls: urls },
      };
    });
  };

  const addBlackoutDate = () => {
    setFormData((prev) => ({
      ...prev,
      availabilityJson: {
        ...prev.availabilityJson!,
        blackoutDates: [...(prev.availabilityJson?.blackoutDates || []), ""],
      },
    }));
  };

  const updateBlackoutDate = (index: number, value: string) => {
    setFormData((prev) => {
      const dates = [...(prev.availabilityJson?.blackoutDates || [])];
      dates[index] = value;
      return {
        ...prev,
        availabilityJson: { ...prev.availabilityJson!, blackoutDates: dates },
      };
    });
  };

  const removeBlackoutDate = (index: number) => {
    setFormData((prev) => {
      const dates = [...(prev.availabilityJson?.blackoutDates || [])];
      dates.splice(index, 1);
      return {
        ...prev,
        availabilityJson: { ...prev.availabilityJson!, blackoutDates: dates },
      };
    });
  };

  const handleSaveDraft = async () => {
    setFormError("");
    setDraftMessage("");
    try {
      const response = await fetch("/api/providers/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerType,
          ...formData,
          draft: true,
        }),
      });
      const responseData = await response.json().catch(() => null);
      if (response.ok) {
        if (session?.user) {
          setDraftMessage("Draft saved successfully.");
        } else {
          setDraftMessage("Draft saved locally for this session. Create an account or sign in before publishing.");
        }
      } else {
        setFormError(responseData?.error || "Failed to save draft. Please try again.");
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      setFormError("An error occurred while saving your draft. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 7) {
      setStep(step + 1);
      return;
    }
    await handlePublish();
  };

  const stepLabels = [
    "Business Profile",
    providerType === "vendor" ? "Services" : "Space Details",
    "Availability",
    "Payments",
    "Media",
    "Notifications",
    "Review",
  ];

  return (
    <div className="min-h-screen bg-[color:var(--oh-bg)] p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Set Up Your {providerType === "venue" ? "Venue" : "Vendor"} Profile
          </h1>
          <p className="text-slate-600">
            {session?.user
              ? `Complete your ${providerType} profile to start receiving bookings.`
              : `Get started by setting up your ${providerType} profile. You'll create an account to save it.`}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-between overflow-x-auto">
          {stepLabels.map((label, idx) => {
            const stepNum = idx + 1;
            return (
              <div key={stepNum} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      step >= stepNum
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {step > stepNum ? <CheckCircle2 className="w-5 h-5" /> : stepNum}
                  </div>
                  <span className="text-xs mt-1 text-center hidden md:block truncate w-full">
                    {label}
                  </span>
                </div>
                {stepNum < 7 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${step > stepNum ? "bg-indigo-600" : "bg-slate-200"}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="p-6">
            {formError && (
              <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {formError}
              </div>
            )}
            {draftMessage && (
              <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                {draftMessage}
              </div>
            )}
            {/* Step 1: Business Profile */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Building2 className="w-5 h-5" /> Business Profile
                </h2>
                <div>
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => updateField("businessName", e.target.value)}
                    required
                    placeholder={providerType === "venue" ? "e.g., Grand Ballroom" : "e.g., Premier Catering Co."}
                  />
                </div>
                <div>
                  <Label htmlFor="providerCategory">
                    {providerType === "venue" ? "Venue Type" : "Category"} *
                  </Label>
                  <Select
                    id="providerCategory"
                    value={formData.providerCategory}
                    onChange={(e) => updateField("providerCategory", e.target.value)}
                    required
                  >
                    <option value="">Select {providerType === "venue" ? "venue type" : "category"}</option>
                    {providerType === "venue" ? (
                      <>
                        <option value="HOTEL">Hotel</option>
                        <option value="BALLROOM">Ballroom</option>
                        <option value="OUTDOOR">Outdoor Venue</option>
                        <option value="WEDDING_VENUE">Wedding Venue</option>
                        <option value="CONFERENCE_CENTER">Conference Center</option>
                        <option value="CHURCH">Church</option>
                        <option value="BARN">Barn</option>
                      </>
                    ) : (
                      <>
                        <option value="CATERING">Catering</option>
                        <option value="PHOTOGRAPHY">Photography</option>
                        <option value="FLORAL">Floral & Decor</option>
                        <option value="ENTERTAINMENT">Entertainment</option>
                        <option value="DJ">DJ</option>
                        <option value="BAKER">Baker</option>
                        <option value="DECORATOR">Decorator</option>
                      </>
                    )}
                  </Select>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactEmail">Contact Email *</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => updateField("contactEmail", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input
                      id="contactPhone"
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => updateField("contactPhone", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => updateField("website", e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      value={formData.instagram}
                      onChange={(e) => updateField("instagram", e.target.value)}
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="facebook">Facebook</Label>
                    <Input
                      id="facebook"
                      type="url"
                      value={formData.facebook}
                      onChange={(e) => updateField("facebook", e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="addressLine1">Address Line 1</Label>
                  <Input
                    id="addressLine1"
                    value={formData.addressLine1}
                    onChange={(e) => updateField("addressLine1", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    value={formData.addressLine2}
                    onChange={(e) => updateField("addressLine2", e.target.value)}
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => updateField("state", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => updateField("postalCode", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="about">About Us</Label>
                  <textarea
                    id="about"
                    value={formData.about}
                    onChange={(e) => updateField("about", e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Tell us about your business..."
                  />
                </div>
              </div>
            )}

            {/* Step 2: Services / Space Details */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Tag className="w-5 h-5" />{" "}
                  {providerType === "vendor" ? "Services & Packages" : "Space Details"}
                </h2>
                {providerType === "vendor" ? (
                  <div className="space-y-4">
                    <p className="text-slate-600">
                      Add your service packages and pricing. You can add more later.
                    </p>
                    {(formData.servicesJson || []).map((service, idx) => (
                      <Card key={idx} className="p-4 border">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-semibold">Service Package {idx + 1}</h3>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeService(idx)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <Label>Category</Label>
                            <Input
                              value={service.category}
                              onChange={(e) => updateService(idx, "category", e.target.value)}
                              placeholder="e.g., Weddings, Corporate"
                            />
                          </div>
                          <div>
                            <Label>Package Name *</Label>
                            <Input
                              value={service.name}
                              onChange={(e) => updateService(idx, "name", e.target.value)}
                              placeholder="e.g., Full Planning, Day-of Coordination"
                              required
                            />
                          </div>
                          <div>
                            <Label>Starting Price ($)</Label>
                            <Input
                              type="number"
                              value={service.startingPrice || ""}
                              onChange={(e) =>
                                updateService(idx, "startingPrice", e.target.value ? parseFloat(e.target.value) : null)
                              }
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label>Description</Label>
                            <textarea
                              value={service.description}
                              onChange={(e) => updateService(idx, "description", e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              placeholder="Describe what's included in this package..."
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                    <Button type="button" variant="secondary" onClick={addService}>
                      <Plus className="w-4 h-4 mr-2" /> Add Service Package
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-slate-600">
                      Describe your venue spaces, capacity, and amenities.
                    </p>
                    {(formData.spacesJson || []).map((space, idx) => (
                      <Card key={idx} className="p-4 border">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-semibold">Space {idx + 1}</h3>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSpace(idx)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <Label>Space Name *</Label>
                            <Input
                              value={space.name}
                              onChange={(e) => updateSpace(idx, "name", e.target.value)}
                              placeholder="e.g., Grand Ballroom, Garden Terrace"
                              required
                            />
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <Label>Min Capacity</Label>
                              <Input
                                type="number"
                                value={space.capacityMin || ""}
                                onChange={(e) =>
                                  updateSpace(idx, "capacityMin", e.target.value ? parseInt(e.target.value) : null)
                                }
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <Label>Max Capacity</Label>
                              <Input
                                type="number"
                                value={space.capacityMax || ""}
                                onChange={(e) =>
                                  updateSpace(idx, "capacityMax", e.target.value ? parseInt(e.target.value) : null)
                                }
                                placeholder="0"
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Indoor/Outdoor</Label>
                            <Select
                              value={space.indoorOutdoor || ""}
                              onChange={(e) =>
                                updateSpace(idx, "indoorOutdoor", e.target.value || null)
                              }
                            >
                              <option value="">Select...</option>
                              <option value="indoor">Indoor</option>
                              <option value="outdoor">Outdoor</option>
                              <option value="both">Both</option>
                            </Select>
                          </div>
                          <div>
                            <Label>Notes</Label>
                            <textarea
                              value={space.notes}
                              onChange={(e) => updateSpace(idx, "notes", e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              placeholder="Additional details about this space..."
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                    <Button type="button" variant="secondary" onClick={addSpace}>
                      <Plus className="w-4 h-4 mr-2" /> Add Space
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Availability & Booking Rules */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5" /> Availability & Booking Rules
                </h2>
                <div className="space-y-4">
                  <p className="text-slate-600">
                    {providerType === "vendor"
                      ? "Set your service area and travel policies."
                      : "Set your service area and blackout dates."}
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Minimum Notice (days)</Label>
                      <Input
                        type="number"
                        value={formData.availabilityJson?.minNoticeDays || ""}
                        onChange={(e) =>
                          updateField("availabilityJson", {
                            ...formData.availabilityJson!,
                            minNoticeDays: e.target.value ? parseInt(e.target.value) : null,
                          })
                        }
                        placeholder="e.g., 30"
                      />
                    </div>
                    <div>
                      <Label>Max Events Per Day</Label>
                      <Input
                        type="number"
                        value={formData.availabilityJson?.maxEventsPerDay || ""}
                        onChange={(e) =>
                          updateField("availabilityJson", {
                            ...formData.availabilityJson!,
                            maxEventsPerDay: e.target.value ? parseInt(e.target.value) : null,
                          })
                        }
                        placeholder="e.g., 2"
                      />
                    </div>
                  </div>
                  {providerType === "vendor" && (
                    <div>
                      <Label>Service Area Radius (miles)</Label>
                      <Input
                        type="number"
                        value={formData.availabilityJson?.serviceAreaRadiusMiles || ""}
                        onChange={(e) =>
                          updateField("availabilityJson", {
                            ...formData.availabilityJson!,
                            serviceAreaRadiusMiles: e.target.value ? parseInt(e.target.value) : null,
                          })
                        }
                        placeholder="e.g., 50"
                      />
                    </div>
                  )}
                  <div>
                    <Label>Blackout Dates</Label>
                    <div className="space-y-2">
                      {(formData.availabilityJson?.blackoutDates || []).map((date, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            type="date"
                            value={date}
                            onChange={(e) => updateBlackoutDate(idx, e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBlackoutDate(idx)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="secondary" onClick={addBlackoutDate}>
                        <Plus className="w-4 h-4 mr-2" /> Add Blackout Date
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Payments & Contracts */}
            {step === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <DollarSign className="w-5 h-5" /> Payments & Contracts
                </h2>
                <div className="space-y-4">
                  <p className="text-slate-600">
                    Configure your deposit rules, payment schedule, and policies.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Deposit Type</Label>
                      <Select
                        value={formData.paymentsJson?.depositType || ""}
                        onChange={(e) =>
                          updateField("paymentsJson", {
                            ...formData.paymentsJson!,
                            depositType: (e.target.value || null) as "percent" | "flat" | null,
                          })
                        }
                      >
                        <option value="">Select...</option>
                        <option value="percent">Percentage</option>
                        <option value="flat">Flat Amount</option>
                      </Select>
                    </div>
                    <div>
                      <Label>
                        Deposit Value{" "}
                        {formData.paymentsJson?.depositType === "percent" ? "(%)" : "($)"}
                      </Label>
                      <Input
                        type="number"
                        value={formData.paymentsJson?.depositValue || ""}
                        onChange={(e) =>
                          updateField("paymentsJson", {
                            ...formData.paymentsJson!,
                            depositValue: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Final Payment Due (days before event)</Label>
                    <Input
                      type="number"
                      value={formData.paymentsJson?.finalDueDaysBeforeEvent || ""}
                      onChange={(e) =>
                        updateField("paymentsJson", {
                          ...formData.paymentsJson!,
                          finalDueDaysBeforeEvent: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      placeholder="e.g., 14"
                    />
                  </div>
                  <div>
                    <Label>Cancellation Policy</Label>
                    <textarea
                      value={formData.paymentsJson?.cancellationPolicy || ""}
                      onChange={(e) =>
                        updateField("paymentsJson", {
                          ...formData.paymentsJson!,
                          cancellationPolicy: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Describe your cancellation policy..."
                    />
                  </div>
                  <div>
                    <Label>Reschedule Policy</Label>
                    <textarea
                      value={formData.paymentsJson?.reschedulePolicy || ""}
                      onChange={(e) =>
                        updateField("paymentsJson", {
                          ...formData.paymentsJson!,
                          reschedulePolicy: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Describe your reschedule policy..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Media & Branding */}
            {step === 5 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" /> Media & Branding
                </h2>
                <div className="space-y-4">
                  <p className="text-slate-600">
                    Add URLs for your logo, hero image, and gallery photos. (File uploads coming soon)
                  </p>
                  <div>
                    <Label>Logo URL</Label>
                    <Input
                      type="url"
                      value={formData.mediaJson?.logoUrl || ""}
                      onChange={(e) =>
                        updateField("mediaJson", {
                          ...formData.mediaJson!,
                          logoUrl: e.target.value || null,
                        })
                      }
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label>Hero Image URL</Label>
                    <Input
                      type="url"
                      value={formData.mediaJson?.heroImageUrl || ""}
                      onChange={(e) =>
                        updateField("mediaJson", {
                          ...formData.mediaJson!,
                          heroImageUrl: e.target.value || null,
                        })
                      }
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label>Gallery URLs</Label>
                    <div className="space-y-2">
                      {(formData.mediaJson?.galleryUrls || []).map((url, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            type="url"
                            value={url}
                            onChange={(e) => updateGalleryUrl(idx, e.target.value)}
                            placeholder="https://..."
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeGalleryUrl(idx)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="secondary" onClick={addGalleryUrl}>
                        <Plus className="w-4 h-4 mr-2" /> Add Gallery Image URL
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Notifications & Preferences */}
            {step === 6 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Bell className="w-5 h-5" /> Notifications & Preferences
                </h2>
                <div className="space-y-4">
                  <p className="text-slate-600">
                    Configure how you want to receive notifications and set your response time preferences.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <Label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.notificationsJson?.emailEnabled || false}
                          onChange={(e) =>
                            updateField("notificationsJson", {
                              ...formData.notificationsJson!,
                              emailEnabled: e.target.checked,
                            })
                          }
                          className="w-4 h-4"
                        />
                        Email Notifications
                      </Label>
                    </div>
                    <div>
                      <Label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.notificationsJson?.smsEnabled || false}
                          onChange={(e) =>
                            updateField("notificationsJson", {
                              ...formData.notificationsJson!,
                              smsEnabled: e.target.checked,
                            })
                          }
                          className="w-4 h-4"
                        />
                        SMS Notifications
                      </Label>
                    </div>
                    <div>
                      <Label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.notificationsJson?.inAppEnabled || false}
                          onChange={(e) =>
                            updateField("notificationsJson", {
                              ...formData.notificationsJson!,
                              inAppEnabled: e.target.checked,
                            })
                          }
                          className="w-4 h-4"
                        />
                        In-App Notifications
                      </Label>
                    </div>
                    <div>
                      <Label>Response Time Badge</Label>
                      <Input
                        value={formData.notificationsJson?.responseTimeLabel || ""}
                        onChange={(e) =>
                          updateField("notificationsJson", {
                            ...formData.notificationsJson!,
                            responseTimeLabel: e.target.value,
                          })
                        }
                        placeholder="e.g., Responds within 24 hours"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 7: Review & Publish */}
            {step === 7 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Review & Publish
                </h2>
                <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                  <div><strong>Business Name:</strong> {formData.businessName}</div>
                  <div><strong>Category:</strong> {formData.providerCategory}</div>
                  <div><strong>Email:</strong> {formData.contactEmail}</div>
                  <div><strong>Phone:</strong> {formData.contactPhone || "Not provided"}</div>
                  <div><strong>Location:</strong> {[formData.city, formData.state].filter(Boolean).join(", ") || "Not provided"}</div>
                  
                  {providerType === "vendor" && formData.servicesJson && formData.servicesJson.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <strong>Services:</strong> {formData.servicesJson.length} package(s) configured
                    </div>
                  )}
                  {providerType === "venue" && formData.spacesJson && formData.spacesJson.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <strong>Spaces:</strong> {formData.spacesJson.length} space(s) configured
                    </div>
                  )}
                  
                  {formData.availabilityJson && (
                    <div className="mt-4 pt-4 border-t">
                      <strong>Availability:</strong>{" "}
                      {formData.availabilityJson.minNoticeDays
                        ? `Min ${formData.availabilityJson.minNoticeDays} days notice`
                        : "No minimum notice"}
                      {formData.availabilityJson.serviceAreaRadiusMiles &&
                        ` • ${formData.availabilityJson.serviceAreaRadiusMiles} mile radius`}
                      {formData.availabilityJson.blackoutDates &&
                        formData.availabilityJson.blackoutDates.length > 0 &&
                        ` • ${formData.availabilityJson.blackoutDates.length} blackout date(s)`}
                    </div>
                  )}
                  
                  {formData.paymentsJson && formData.paymentsJson.depositType && (
                    <div className="mt-4 pt-4 border-t">
                      <strong>Payments:</strong>{" "}
                      {formData.paymentsJson.depositType === "percent"
                        ? `${formData.paymentsJson.depositValue || 0}% deposit`
                        : `$${formData.paymentsJson.depositValue || 0} deposit`}
                    </div>
                  )}
                  
                  {formData.mediaJson && (
                    <div className="mt-4 pt-4 border-t">
                      <strong>Media:</strong>{" "}
                      {formData.mediaJson.logoUrl ? "Logo ✓" : "No logo"}
                      {formData.mediaJson.heroImageUrl ? " • Hero image ✓" : ""}
                      {formData.mediaJson.galleryUrls && formData.mediaJson.galleryUrls.length > 0
                        ? ` • ${formData.mediaJson.galleryUrls.length} gallery image(s)`
                        : ""}
                    </div>
                  )}
                  
                  {formData.notificationsJson && (
                    <div className="mt-4 pt-4 border-t">
                      <strong>Notifications:</strong>{" "}
                      {[
                        formData.notificationsJson.emailEnabled && "Email",
                        formData.notificationsJson.smsEnabled && "SMS",
                        formData.notificationsJson.inAppEnabled && "In-App",
                      ]
                        .filter(Boolean)
                        .join(", ") || "None"}
                      {formData.notificationsJson.responseTimeLabel && (
                        <span> • {formData.notificationsJson.responseTimeLabel}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-indigo-900">
                    <strong>✨ Ready to Publish:</strong>
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-indigo-800 list-disc list-inside">
                    <li>Your profile will be visible to event planners</li>
                    <li>You can update details anytime from your dashboard</li>
                    <li>Start receiving booking requests and leads</li>
                  </ul>
                </div>
                {!session?.user && (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-900">
                      <strong>📝 Next Step:</strong> You'll need to create an account to publish your profile.
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
                {step < 7 && (
                  <Button type="button" variant="ghost" onClick={handleSaveDraft}>
                    Save as Draft
                  </Button>
                )}
                {!session?.user && step === 7 && (
                  <Button asChild variant="secondary" type="button">
                    <Link
                      href={`/signin?callbackUrl=${encodeURIComponent(
                        providerType === "vendor" ? "/vendor/dashboard" : "/venue/dashboard"
                      )}&role=${encodeURIComponent(providerType === "vendor" ? "VENDOR" : "VENUE")}`}
                    >
                      Sign In
                    </Link>
                  </Button>
                )}
                <Button type="submit" disabled={loading}>
                  {loading
                    ? "Publishing..."
                    : step === 7
                    ? session?.user
                      ? "Publish Profile"
                      : "Create Account & Publish"
                    : "Continue →"}
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
}
