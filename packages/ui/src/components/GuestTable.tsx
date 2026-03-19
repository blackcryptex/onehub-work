import * as React from "react";
import { RSVPBadge } from "./RSVPBadge";

export interface GuestRow {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  group?: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "WAITLIST";
  plusOnes: number;
  seat?: string;
}

export function GuestTable({ guests, onInvite, onUpdate }: { guests: GuestRow[]; onInvite?: (ids: string[]) => void; onUpdate?: (id: string, partial: Partial<GuestRow>) => void }) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
          onClick={() => onInvite && onInvite(Array.from(selected))}
          disabled={selected.size === 0}
        >
          Invite Selected ({selected.size})
        </button>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2"><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? new Set(guests.map((g) => g.id)) : new Set())} /></th>
            <th className="text-left p-2">Name</th>
            <th className="text-left p-2">Email</th>
            <th className="text-left p-2">Group</th>
            <th className="text-left p-2">Status</th>
            <th className="text-left p-2">+1s</th>
            <th className="text-left p-2">Seat</th>
          </tr>
        </thead>
        <tbody>
          {guests.map((g) => (
            <tr key={g.id} className="border-b">
              <td className="p-2"><input type="checkbox" checked={selected.has(g.id)} onChange={(e) => setSelected((s) => { const ns = new Set(s); if (e.target.checked) ns.add(g.id); else ns.delete(g.id); return ns; })} /></td>
              <td className="p-2">{g.firstName} {g.lastName}</td>
              <td className="p-2">{g.email || "-"}</td>
              <td className="p-2">{g.group || "-"}</td>
              <td className="p-2"><RSVPBadge status={g.status} /></td>
              <td className="p-2">{g.plusOnes}</td>
              <td className="p-2">{g.seat || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
