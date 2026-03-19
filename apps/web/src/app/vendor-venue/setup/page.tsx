"use client";

import { useState, useEffect } from "react";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { useRouter } from "next/navigation";
import { Building2, MapPin, Tag, DollarSign } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function VendorVenueSetupPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<"VENDOR" | "VENUE">("VENDOR");
  const [formData, setFormData] = useState({
    orgName: "",
    category: "",
    location: "",
    services: "",
    priceRange: "",
    capacity: "",
    availability: "",
  });

  const handleCreateOrg = async (dataToUse = formData, roleToUse = userRole) => {
    setLoading(true);
    try {
      const response = await fetch("/api/orgs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...dataToUse, orgType: roleToUse === "VENUE" ? "VENUE" : "VENDOR" }),
      });

      if (response.ok) {
        await response.json();
        // TODO: Create /app/listings/new page for listing creation
        router.push("/app/marketplace/manage" as any);
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
  };

  // Check auth and redirect if not signed in
  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      // Not signed in - redirect to sign-in with callback
      router.push(`/signin?callbackUrl=${encodeURIComponent("/providers/start")}`);
      return;
    }

    // If signed in, check if they already have a vendor/venue org
    const checkExistingOrg = async () => {
      try {
        const response = await fetch("/api/vendor-venue/check-profile");
        if (response.ok) {
          const data = await response.json();
          if (data.hasVendorOrg) {
            router.push("/vendor/dashboard");
            return;
          } else if (data.hasVenueOrg) {
            router.push("/venue/dashboard");
            return;
          }
        }
      } catch (error) {
        console.error("Error checking profile:", error);
      }
    };

    checkExistingOrg();
  }, [session, status, router]);

  // Restore pending setup only when session changes
  useEffect(() => {
    if (status === "loading" || !session?.user) return;

    const searchParams = new URLSearchParams(window.location.search);
    const createOrg = searchParams.get("createOrg");
    const dataParam = searchParams.get("data");
    
    if (createOrg === "true" && dataParam && session?.user) {
      try {
        const parsed = JSON.parse(decodeURIComponent(dataParam));
        setFormData(parsed);
        setUserRole(parsed.userRole || "VENDOR");
        setStep(5);
        setTimeout(() => {
          handleCreateOrg(parsed, parsed.userRole || "VENDOR");
        }, 1000);
      } catch (err) {
        console.error("Error parsing setup data:", err);
      }
    } else {
      const pendingData = sessionStorage.getItem("pendingVendorVenueSetup");
      if (pendingData && session?.user) {
        try {
          const parsed = JSON.parse(pendingData);
          setFormData(parsed);
          setUserRole(parsed.userRole || "VENDOR");
          setStep(5);
        } catch (err) {
          console.error("Error parsing setup data:", err);
        }
      }
    }
  }, [session, status, handleCreateOrg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 5) {
      setStep(step + 1);
      return;
    }

    if (!session?.user) {
      sessionStorage.setItem("pendingVendorVenueSetup", JSON.stringify({ ...formData, userRole }));
      router.push(`/signup?role=${userRole}&setup=true`);
      return;
    }

    await handleCreateOrg();
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Set Up Your {userRole === "VENUE" ? "Venue" : "Vendor"} Profile</h1>
        <p className="text-slate-600">
          {session?.user 
            ? `Create your ${userRole === "VENUE" ? "venue" : "vendor"} profile to start attracting event planners.`
            : `Get started by setting up your ${userRole === "VENUE" ? "venue" : "vendor"} profile. You\u2019ll create an account to save it.`}
        </p>
      </div>

      {/* Role Toggle */}
      <div className="mb-6 flex gap-4 justify-center">
        <Button
          type="button"
          variant={userRole === "VENDOR" ? "primary" : "secondary"}
          onClick={() => setUserRole("VENDOR")}
        >
          I’m a Vendor
        </Button>
        <Button
          type="button"
          variant={userRole === "VENUE" ? "primary" : "secondary"}
          onClick={() => setUserRole("VENUE")}
        >
          I’m a Venue
        </Button>
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
                <Building2 className="w-5 h-5" /> {userRole === "VENUE" ? "Venue" : "Business"} Basics
              </h2>
              <div>
                <Label htmlFor="orgName">{userRole === "VENUE" ? "Venue Name" : "Business Name"} *</Label>
                <Input
                  id="orgName"
                  value={formData.orgName}
                  onChange={(e) => updateField("orgName", e.target.value)}
                  required
                  placeholder={userRole === "VENUE" ? "e.g., Grand Ballroom" : "e.g., Premier Catering Co."}
                />
              </div>
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  id="category"
                  value={formData.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  required
                >
                  <option value="">Select category</option>
                  {userRole === "VENUE" ? (
                    <>
                      <option value="HOTEL">Hotel</option>
                      <option value="BALLROOM">Ballroom</option>
                      <option value="OUTDOOR">Outdoor Venue</option>
                      <option value="WEDDING_VENUE">Wedding Venue</option>
                      <option value="CONFERENCE_CENTER">Conference Center</option>
                    </>
                  ) : (
                    <>
                      <option value="CATERING">Catering</option>
                      <option value="PHOTOGRAPHY">Photography</option>
                      <option value="FLORAL">Floral &amp; Decor</option>
                      <option value="ENTERTAINMENT">Entertainment</option>
                      <option value="PLANNING">Event Planning Services</option>
                    </>
                  )}
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5" /> Location
              </h2>
              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  required
                  placeholder="e.g., New York, NY"
                />
              </div>
              {userRole === "VENUE" && (
                <div>
                  <Label htmlFor="capacity">Capacity (max guests) *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => updateField("capacity", e.target.value)}
                    required
                    placeholder="e.g., 500"
                    min="1"
                  />
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Tag className="w-5 h-5" /> Services
              </h2>
              <div>
                <Label htmlFor="services">Services Offered *</Label>
                <textarea
                  id="services"
                  value={formData.services}
                  onChange={(e) => updateField("services", e.target.value)}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder={userRole === "VENUE" ? "e.g., Full catering kitchen, AV equipment, parking..." : "e.g., Full-service catering, custom menus, bar service..."}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5" /> Pricing &amp; Availability
              </h2>
              <div>
                <Label htmlFor="priceRange">Price Range *</Label>
                <select
                  id="priceRange"
                  value={formData.priceRange}
                  onChange={(e) => updateField("priceRange", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select range</option>
                  <option value="BUDGET">Budget-friendly</option>
                  <option value="MID">Mid-range</option>
                  <option value="PREMIUM">Premium</option>
                  <option value="LUXURY">Luxury</option>
                </select>
              </div>
              <div>
                <Label htmlFor="availability">Availability Notes</Label>
                <textarea
                  id="availability"
                  value={formData.availability}
                  onChange={(e) => updateField("availability", e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., Available weekends, minimum booking notice..."
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Review &amp; Create</h2>
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                <div><strong>{userRole === "VENUE" ? "Venue" : "Business"} Name:</strong> {formData.orgName}</div>
                <div><strong>Category:</strong> {formData.category}</div>
                <div><strong>Location:</strong> {formData.location}</div>
                {userRole === "VENUE" && <div><strong>Capacity:</strong> {formData.capacity}</div>}
                <div><strong>Services:</strong> {formData.services}</div>
                <div><strong>Price Range:</strong> {formData.priceRange}</div>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm text-indigo-900">
                  <strong>✨ Next Steps:</strong>
                </p>
                <ul className="mt-2 space-y-1 text-sm text-indigo-800 list-disc list-inside">
                  <li>Create your first service listing</li>
                  <li>Add photos and gallery</li>
                  <li>Set up availability calendar</li>
                  <li>Start receiving booking requests</li>
                </ul>
              </div>
              {!session?.user && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-900">
                    <strong>📝 Next Step:</strong> You’ll need to create an account to save your profile.
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
                {loading ? "Creating..." : step === 5 ? (session?.user ? "Create Profile" : "Create Account &amp; Setup") : "Continue →"}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}

