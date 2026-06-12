"use client";

import { Button } from "@/components/ui";
import { Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@onehub/types/src/roles";
import { vaultDetail } from "@/lib/routes";
import { eventDeleteResultMessage, parseEventDeleteResult, type EventDeleteUiResult } from "@/lib/event-delete-lifecycle";

interface EventActionsProps {
  /**
   * User's role - determines which routes to use
   */
  role: Role | undefined;
  /**
   * Event slug for navigation
   */
  eventSlug: string;
  /**
   * Event ID for delete operation
   */
  eventId: string;
  /**
   * Event name for confirmation dialog
   */
  eventName: string;
  /**
   * Whether the user can edit this event (from RBAC check)
   */
  canEdit: boolean;
  /**
   * Whether the user can delete this event (from RBAC check)
   */
  canDelete: boolean;
  /**
   * Optional callback when event is deleted (for updating local state)
   */
  onDeleted?: (result: EventDeleteUiResult) => void;
  /**
   * Optional custom delete handler (if not provided, uses default)
   */
  onDelete?: (eventSlug: string, eventId: string, eventName: string) => Promise<EventDeleteUiResult | void>;
  /**
   * Size of buttons
   */
  size?: "sm" | "lg";
  /**
   * Whether to show labels or just icons
   */
  showLabels?: boolean;
}

/**
 * Shared EventActions component for Edit/Delete controls
 * 
 * This component provides consistent Edit/Delete UI across:
 * - Pro Planner Dashboard
 * - DIY Planner Dashboard
 * - Vault detail pages
 * 
 * It respects RBAC permissions and uses role-aware routing.
 */
export function EventActions({
  role,
  eventSlug,
  eventId,
  eventName,
  canEdit,
  canDelete,
  onDeleted,
  onDelete,
  size = "sm",
  showLabels = true,
}: EventActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${eventName}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      let result: EventDeleteUiResult;
      if (onDelete) {
        result = (await onDelete(eventSlug, eventId, eventName)) ?? parseEventDeleteResult(undefined);
      } else {
        // Default delete handler
        const response = await fetch(`/api/events/${eventSlug}`, {
          method: "DELETE",
        });

        const responseBody = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(responseBody?.error || "Failed to delete event");
        }
        result = parseEventDeleteResult(responseBody);
      }

      // Call onDeleted callback if provided
      if (onDeleted) {
        onDeleted(result);
      }

      if (result.action === "canceled") {
        alert(eventDeleteResultMessage(result));
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert(error instanceof Error ? error.message : "Failed to delete event. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    // Navigate to vault detail page (which serves as the edit view)
    const vaultPath = vaultDetail(role, eventSlug);
    router.push(vaultPath as any);
  };

  // Don't render anything if user can't edit or delete
  if (!canEdit && !canDelete) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {canEdit && (
        <Button
          size={size}
          variant="secondary"
          onClick={handleEdit}
        >
          <Edit className="w-4 h-4 mr-1.5" />
          {showLabels && "Edit"}
        </Button>
      )}
      {canDelete && (
        <Button
          size={size}
          variant="secondary"
          onClick={handleDelete}
          disabled={deleting}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          {showLabels && (deleting ? "Deleting..." : "Delete")}
        </Button>
      )}
    </div>
  );
}

