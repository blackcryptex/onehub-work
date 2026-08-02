"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const roles = [
  "CLIENT",
  "DIY_PLANNER",
  "PRO_PLANNER",
  "VENDOR",
  "VENUE",
  "EVENT_DREAMER",
  "ADMIN",
] as const;

type Role = (typeof roles)[number];

type FounderRoleControlProps = {
  userId: string;
  currentRole: Role;
  canManageRoles: boolean;
};

export function FounderRoleControl({ userId, currentRole, canManageRoles }: FounderRoleControlProps) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(currentRole);
  const [isSaving, setIsSaving] = useState(false);

  if (!canManageRoles) return null;

  async function saveRole() {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        alert(data?.error || "Unable to update role");
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("[Admin] Unable to update user role", error);
      alert("Unable to update role");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="User role"
        value={role}
        onChange={(event) => setRole(event.target.value as Role)}
        disabled={isSaving}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
      >
        {roles.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={saveRole}
        disabled={isSaving || role === currentRole}
        className="rounded-md bg-slate-900 px-3 py-1 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? "Saving..." : "Save role"}
      </button>
    </div>
  );
}
