'use client';

import * as React from "react";

type Invite = {
  id: string;
  email: string;
  role?: string;
  inviteUrl?: string;
};

export function AssistantCollaborationPanel({ orgId }: { orgId: string }) {
  const [email, setEmail] = React.useState("");
  const [invites, setInvites] = React.useState<Invite[]>([]);
  const [lastInviteUrl, setLastInviteUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const loadInvites = React.useCallback(async () => {
    const response = await fetch(`/api/assistant-collaboration/invites?orgId=${encodeURIComponent(orgId)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load assistant invites");
    setInvites(await response.json());
  }, [orgId]);

  React.useEffect(() => {
    loadInvites().catch((err) => setError(err instanceof Error ? err.message : "Failed to load assistant invites"));
  }, [loadInvites]);

  async function submitInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/assistant-collaboration/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, email }),
      });
      if (!response.ok) throw new Error("Failed to invite assistant");
      const invite = await response.json();
      setEmail("");
      setLastInviteUrl(invite.inviteUrl ?? null);
      await loadInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite assistant");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
      <div>
        <h3 className="font-semibold text-slate-950">Assistant collaboration</h3>
        <p className="mt-1 text-sm text-slate-600">Invite assistants or coordinators with limited member access.</p>
      </div>
      <form onSubmit={submitInvite} className="flex flex-col gap-2 sm:flex-row">
        <label className="flex-1 text-sm font-medium text-slate-700">
          Assistant email
          <input
            aria-label="Assistant email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            required
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="self-end rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Invite assistant
        </button>
      </form>
      {lastInviteUrl && <p className="text-xs font-medium text-indigo-700">{lastInviteUrl}</p>}
      {error && <p className="text-sm font-medium text-rose-700">{error}</p>}
      <div className="space-y-2">
        {invites.length > 0 ? invites.map((invite) => (
          <div key={invite.id} className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
            <span className="font-medium">{invite.email}</span>
            <span className="ml-2 text-xs text-slate-500">{invite.role ?? "MEMBER"}</span>
          </div>
        )) : <p className="text-sm text-slate-500">No pending assistant invites.</p>}
      </div>
    </section>
  );
}
