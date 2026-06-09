"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@onehub/ui";
import { Eye, Loader2 } from "lucide-react";

interface ImpersonateButtonProps {
  userId: string;
  userEmail: string;
}

/**
 * Client component for starting/stopping impersonation
 * 
 * Uses NextAuth's update() method with a server-signed transition token.
 */
export function ImpersonateButton({ userId, userEmail: _userEmail }: ImpersonateButtonProps) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const isCurrentlyImpersonating = session?.user?.actingUserId === userId;
  const isImpersonatingAnyone = !!session?.user?.actingUserId;

  const handleStartImpersonation = async () => {
    setIsLoading(true);
    try {
      // Validate admin access via API route
      const response = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to start impersonation");
        setIsLoading(false);
        return;
      }

      const data = await response.json();

      if (!data.sessionUpdate) {
        alert("Failed to start impersonation");
        setIsLoading(false);
        return;
      }

      // Update NextAuth session with the server-authorized transition payload.
      await update(data.sessionUpdate);

      // Redirect to app dashboard (will route based on impersonated user's role)
      router.push("/app");
      router.refresh();
    } catch (error) {
      console.error("[Impersonation] Error:", error);
      alert("Failed to start impersonation");
      setIsLoading(false);
    }
  };

  const handleStopImpersonation = async () => {
    setIsLoading(true);
    try {
      // Validate admin access via API route
      const response = await fetch("/api/admin/stop-impersonate", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to stop impersonation");
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      if (!data.sessionUpdate) {
        alert("Failed to stop impersonation");
        setIsLoading(false);
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
      setIsLoading(false);
    }
  };

  if (isCurrentlyImpersonating) {
    return (
      <Button
        onClick={handleStopImpersonation}
        disabled={isLoading}
        variant="secondary"
        size="sm"
        className="bg-red-50 text-red-700 hover:bg-red-100"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Stopping...
          </>
        ) : (
          "Stop Impersonating"
        )}
      </Button>
    );
  }

  if (isImpersonatingAnyone) {
    // Already impersonating someone else - disable button
    return (
      <Button disabled size="sm" variant="ghost">
        <Eye className="w-4 h-4 mr-2" />
        View as
      </Button>
    );
  }

  return (
    <Button
      onClick={handleStartImpersonation}
      disabled={isLoading}
      size="sm"
      variant="secondary"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Starting...
        </>
      ) : (
        <>
          <Eye className="w-4 h-4 mr-2" />
          View as
        </>
      )}
    </Button>
  );
}

