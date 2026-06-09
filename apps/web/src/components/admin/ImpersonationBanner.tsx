"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, X, Loader2 } from "lucide-react";
import { Button } from "@onehub/ui";

/**
 * Banner component that displays when an admin is impersonating another user
 * 
 * Shows at the top of the app with a warning message and a button to stop impersonation.
 */
export function ImpersonationBanner() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isStopping, setIsStopping] = useState(false);

  const actingUserId = session?.user?.actingUserId;
  const realUserId = session?.user?.realUserId;
  const isImpersonating = !!actingUserId && actingUserId !== realUserId;

  if (!isImpersonating) {
    return null;
  }

  const handleStopImpersonation = async () => {
    setIsStopping(true);
    try {
      // Validate admin access via API route
      const response = await fetch("/api/admin/stop-impersonate", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to stop impersonation");
        setIsStopping(false);
        return;
      }

      const data = await response.json();
      if (!data.sessionUpdate) {
        alert("Failed to stop impersonation");
        setIsStopping(false);
        return;
      }

      // Update NextAuth session with the server-authorized transition payload.
      await update(data.sessionUpdate);

      // Redirect to admin dashboard
      router.push("/admin/overview");
      router.refresh();
    } catch (error) {
      console.error("[Impersonation] Error:", error);
      alert("Failed to stop impersonation");
      setIsStopping(false);
    }
  };

  const actingUserEmail = session?.user?.email || "Unknown user";

  return (
    <div className="sticky top-0 z-50 w-full border-b-2 border-yellow-400 bg-yellow-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-yellow-900">
          <AlertTriangle className="h-4 w-4" />
          <span>
            <strong>Viewing as:</strong> {actingUserEmail}
            {session?.user?.role && ` (${session.user.role})`}
          </span>
        </div>
        <Button
          onClick={handleStopImpersonation}
          disabled={isStopping}
          size="sm"
          variant="secondary"
          className="border-yellow-600 text-yellow-900 hover:bg-yellow-100"
        >
          {isStopping ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Stopping...
            </>
          ) : (
            <>
              <X className="mr-2 h-4 w-4" />
              Stop Impersonating
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

