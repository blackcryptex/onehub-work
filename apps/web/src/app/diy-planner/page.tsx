/**
 * DIY Planner Dashboard Page
 * 
 * Route: /diy-planner
 * 
 * This is the main DIY Planner dashboard with sidebar navigation
 */

import { Suspense } from "react";
import { DIYPlannerDashboard } from "@/components/diy-planner/Dashboard";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canAccessDashboard } from "@/lib/rbac";
import { redirect } from "next/navigation";

export default async function DIYPlannerPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessDashboard(user, "DIY_PLANNER")) {
    redirect("/app");
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <DIYPlannerDashboard />
    </Suspense>
  );
}
