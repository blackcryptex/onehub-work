import { Card } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function EventSettings({ params }: { params: { eventSlug: string } }) {
  const ev = await prisma.event.findFirst({ where: { slug: params.eventSlug } });
  if (!ev) return null;
  return (
    <Card className="p-4">
      <div className="text-sm text-slate-600">Edit event basics (coming soon).</div>
    </Card>
  );
}
