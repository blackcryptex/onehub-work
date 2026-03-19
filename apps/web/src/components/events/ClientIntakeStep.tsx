"use client";

import { useState, useEffect } from "react";
import { Input, Label, Button } from "@/components/ui";
import { UserPlus, Search, X, Check } from "lucide-react";

interface ClientUser {
  id: string;
  name: string | null;
  email: string;
}

interface ClientIntakeStepProps {
  selectedClientIds: string[];
  onClientIdsChange: (ids: string[]) => void;
  autoShareSummary: boolean;
  onAutoShareChange: (value: boolean) => void;
}

/**
 * Phase 3: Client Intake step for event creation wizard
 * 
 * Allows Pro Planner to:
 * - Search for existing CLIENT users
 * - Invite new clients by email
 * - Select clients to link to the event
 * - Optionally auto-share SUMMARY
 */
export function ClientIntakeStep({
  selectedClientIds,
  onClientIdsChange,
  autoShareSummary,
  onAutoShareChange,
}: ClientIntakeStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ClientUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [selectedClients, setSelectedClients] = useState<ClientUser[]>([]);

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
        setSearchResults(data.users || []);
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
        const newClient: ClientUser = {
          id: data.userId,
          name: data.name || null,
          email: inviteEmail,
        };
        
        // Add to selected clients
        if (!selectedClientIds.includes(newClient.id)) {
          onClientIdsChange([...selectedClientIds, newClient.id]);
          setSelectedClients([...selectedClients, newClient]);
        }
        
        setInviteEmail("");
        alert(`Invitation sent to ${inviteEmail}`);
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

  // Add client from search results
  const handleAddClient = (client: ClientUser) => {
    if (!selectedClientIds.includes(client.id)) {
      onClientIdsChange([...selectedClientIds, client.id]);
      setSelectedClients([...selectedClients, client]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  // Remove selected client
  const handleRemoveClient = (clientId: string) => {
    onClientIdsChange(selectedClientIds.filter((id) => id !== clientId));
    setSelectedClients(selectedClients.filter((c) => c.id !== clientId));
  };

  // Load selected clients info (if we have IDs but not full objects)
  useEffect(() => {
    // This would fetch client details if needed
    // For now, we'll rely on search results and invite responses
  }, [selectedClientIds]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Client Intake</h2>
        <p className="text-sm text-slate-600">
          Select or invite clients to link to this event. Clients will be able to view shared content.
        </p>
      </div>

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
          >
            {searchLoading ? "Searching..." : "Search"}
          </Button>
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="border border-slate-200 rounded-lg p-2 max-h-48 overflow-y-auto">
            {searchResults.map((client) => {
              const isSelected = selectedClientIds.includes(client.id);
              return (
                <div
                  key={client.id}
                  className={`flex items-center justify-between p-2 rounded hover:bg-slate-50 ${
                    isSelected ? "bg-blue-50" : ""
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium">
                      {client.name || client.email}
                    </div>
                    {client.name && (
                      <div className="text-xs text-slate-500">{client.email}</div>
                    )}
                  </div>
                  {isSelected ? (
                    <span className="text-green-600 text-sm">✓ Added</span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAddClient(client)}
                    >
                      Add
                    </Button>
                  )}
                </div>
              );
            })}
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
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {inviteLoading ? "Inviting..." : "Invite"}
          </Button>
        </div>
      </div>

      {/* Selected clients */}
      {selectedClientIds.length > 0 && (
        <div className="space-y-2">
          <Label>Selected Clients ({selectedClientIds.length})</Label>
          <div className="space-y-2">
            {selectedClients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
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
                  onClick={() => handleRemoveClient(client.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {/* Show IDs for clients we don't have full info for */}
            {selectedClientIds
              .filter((id) => !selectedClients.some((c) => c.id === id))
              .map((id) => (
                <div
                  key={id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="text-sm text-slate-600">Client ID: {id.slice(0, 8)}...</div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveClient(id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Auto-share option */}
      <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <input
          type="checkbox"
          id="autoShare"
          checked={autoShareSummary}
          onChange={(e) => onAutoShareChange(e.target.checked)}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
        <Label htmlFor="autoShare" className="text-sm cursor-pointer">
          Automatically share event summary with selected clients
        </Label>
      </div>

      {selectedClientIds.length === 0 && (
        <p className="text-sm text-slate-500 italic">
          No clients selected. You can add clients later from the event detail page.
        </p>
      )}
    </div>
  );
}

