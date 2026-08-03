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
export function ImpersonateButton({ userId, userEmail }: ImpersonateButtonProps) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [incidentTicketId, setIncidentTicketId] = useState("");

  const isCurrentlyImpersonating = session?.user?.actingUserId === userId;
  const isImpersonatingAnyone = !!session?.user?.actingUserId;
  const canStartImpersonation = !!reason.trim() && !!incidentTicketId.trim();

  const handleStartImpersonation = async () => {
    const trimmedReason = reason.trim();
    const trimmedIncidentTicketId = incidentTicketId.trim();

    if (!trimmedReason || !trimmedIncidentTicketId) {
      alert("Break-glass reason and incident ticket are required");
      return;
    }

    setIsLoading(true);
    try {
      // Validate admin access via API route
      const response = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: userId,
          reason: trimmedReason,
          incidentTicketId: trimmedIncidentTicketId,
        }),
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
    <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-2">
      <p className="text-xs font-medium text-amber-900">Break-glass view as {userEmail}</p>
      <label className="block text-xs font-medium text-slate-700">
        Break-glass reason
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={isLoading}
          rows={2}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
          placeholder="Why is impersonation needed?"
        />
      </label>
      <label className="block text-xs font-medium text-slate-700">
        Incident ticket
        <input
          type="text"
          value={incidentTicketId}
          onChange={(event) => setIncidentTicketId(event.target.value)}
          disabled={isLoading}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
          placeholder="INC-1234"
        />
      </label>
      <Button
        onClick={handleStartImpersonation}
        disabled={isLoading || !canStartImpersonation}
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
    </div>
  );
}

