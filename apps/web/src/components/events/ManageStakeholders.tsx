"use client";

import { useState, useEffect } from "react";
import { Input, Label, Button } from "@/components/ui";
import { UserPlus, Search, X, Trash2 } from "lucide-react";

interface ClientUser {
  id: string;
  name: string | null;
  email: string;
}

interface Stakeholder {
  id: string;
  userId: string;
  role: "CLIENT" | "STAKEHOLDER";
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface ManageStakeholdersProps {
  eventSlug: string;
  stakeholders: Stakeholder[];
  onStakeholdersChange: () => void; // Callback to refresh the list
}

/**
 * Component for managing event stakeholders (clients) in the vault detail page.
 * Allows Pro Planners to search, invite, and remove clients.
 */
export function ManageStakeholders({
  eventSlug,
  stakeholders,
  onStakeholdersChange,
}: ManageStakeholdersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ClientUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  // Search for existing CLIENT users
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&role=CLIENT`);
      if (response.ok) {
        const data = await response.json();
        // Filter out users who are already stakeholders
        const existingUserIds = new Set(stakeholders.map((s) => s.userId));
        setSearchResults((data.users || []).filter((u: ClientUser) => !existingUserIds.has(u.id)));
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Invite new client by email
  const handleInvite = async () => {
    if (!inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      alert("Please enter a valid email address");
      return;
    }

    setInviteLoading(true);
    try {
      const response = await fetch("/api/users/invite-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });

      if (response.ok) {
        const data = await response.json();
        // Add the newly invited client
        await handleAddStakeholder(data.userId);
        setInviteEmail("");
        alert(`Client invited and added to event`);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to invite client");
      }
    } catch (error) {
      console.error("Error inviting client:", error);
      alert("Failed to invite client. Please try again.");
    } finally {
      setInviteLoading(false);
    }
  };

  // Add stakeholder from search results
  const handleAddStakeholder = async (userId: string) => {
    setAddingUserId(userId);
    try {
      const response = await fetch(`/api/events/${eventSlug}/stakeholders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          role: "CLIENT",
        }),
      });

      if (response.ok) {
        setSearchQuery("");
        setSearchResults([]);
        onStakeholdersChange(); // Refresh the list
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to add client");
      }
    } catch (error) {
      console.error("Error adding stakeholder:", error);
      alert("Failed to add client. Please try again.");
    } finally {
      setAddingUserId(null);
    }
  };

  // Remove stakeholder
  const handleRemoveStakeholder = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this client from the event?")) {
      return;
    }

    setRemovingUserId(userId);
    try {
      const response = await fetch(`/api/events/${eventSlug}/stakeholders?userId=${userId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onStakeholdersChange(); // Refresh the list
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to remove client");
      }
    } catch (error) {
      console.error("Error removing stakeholder:", error);
      alert("Failed to remove client. Please try again.");
    } finally {
      setRemovingUserId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search for existing clients */}
      <div className="space-y-2">
        <Label htmlFor="clientSearch">Search for Existing Clients</Label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="clientSearch"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Search by name or email..."
              className="pl-10"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleSearch}
            disabled={searchLoading}
            size="sm"
          >
            {searchLoading ? "Searching..." : "Search"}
          </Button>
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="border border-slate-200 rounded-lg p-2 max-h-48 overflow-y-auto">
            {searchResults.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-2 rounded hover:bg-slate-50"
              >
                <div>
                  <div className="text-sm font-medium">
                    {client.name || client.email}
                  </div>
                  {client.name && (
                    <div className="text-xs text-slate-500">{client.email}</div>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAddStakeholder(client.id)}
                  disabled={addingUserId === client.id}
                >
                  {addingUserId === client.id ? "Adding..." : "Add"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite new client */}
      <div className="space-y-2">
        <Label htmlFor="inviteEmail">Invite New Client by Email</Label>
        <div className="flex gap-2">
          <Input
            id="inviteEmail"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="client@example.com"
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleInvite}
            disabled={inviteLoading || !inviteEmail.trim()}
            size="sm"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {inviteLoading ? "Inviting..." : "Invite"}
          </Button>
        </div>
      </div>

      {/* Current stakeholders */}
      {stakeholders.length > 0 && (
        <div className="space-y-2">
          <Label>Current Clients ({stakeholders.length})</Label>
          <div className="space-y-2">
            {stakeholders.map((stakeholder) => (
              <div
                key={stakeholder.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {stakeholder.user.name || stakeholder.user.email}
                  </div>
                  {stakeholder.user.name && (
                    <div className="text-xs text-slate-500">{stakeholder.user.email}</div>
                  )}
                  <div className="text-xs text-slate-400 mt-1">
                    {stakeholder.role === "CLIENT" ? "Client" : "Stakeholder"}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveStakeholder(stakeholder.userId)}
                  disabled={removingUserId === stakeholder.userId}
                  className="text-rose-600 hover:text-rose-700"
                >
                  {removingUserId === stakeholder.userId ? (
                    "Removing..."
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {stakeholders.length === 0 && (
        <p className="text-sm text-slate-500 italic">
          No clients assigned. Use the search or invite options above to add clients.
        </p>
      )}
    </div>
  );
}

