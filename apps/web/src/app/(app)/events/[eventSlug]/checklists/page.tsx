import { Card } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export default async function EventChecklists({ params }: { params: { eventSlug: string } }) {
  const user = await getCurrentUser();
  
  // Phase 0: Security hardening - Block CLIENT users from accessing planner event pages
  if (!user) {
    redirect("/signin");
  }
  if (user.role === "CLIENT") {
    redirect("/app");
  }

  const ev = await prisma.event.findFirst({ where: { slug: params.eventSlug } });
  if (!ev) return null;
  const lists = await prisma.checklist.findMany({ where: { eventId: ev.id }, include: { items: true } });
  return (
    <div className="space-y-4">
      {lists.map((cl) => (
        <Card key={cl.id} className="p-4">
          <div className="font-semibold">{cl.title}</div>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {cl.items.map((it) => (
              <li key={it.id} className={it.done ? "line-through text-slate-500" : ""}>{it.title}</li>
            ))}
          </ul>
        </Card>
      ))}
      {lists.length === 0 && <div className="text-sm text-slate-600">No checklists yet.</div>}
    </div>
  );
}
