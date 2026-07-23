import { Card, Button } from "@onehub/ui";
import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import Link from "next/link";

export default async function ManageListingsPage() {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) return <div>Unauthorized</div>;
  const orgs = await db.organization.findMany({ where: { members: { some: { userId, role: { in: ["OWNER", "ADMIN"] } } } } });
  const providerType = orgs.some((org) => org.type === "VENUE") && !orgs.some((org) => org.type === "VENDOR") ? "venue" : "vendor";
  const listings = await db.listing.findMany({ where: { orgId: { in: orgs.map((o) => o.id) } }, include: { tags: true } });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Listings</h1>
        <Button asChild>
          <Link href={`/providers/onboarding?providerType=${providerType}`}>Create listing profile</Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {listings.map((l) => (
          <Card key={l.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{l.title}</h3>
                <div className="mt-1 text-sm text-slate-600">{l.city}, {l.state}</div>
                <div className="mt-1 text-xs text-slate-500">{l.category}</div>
              </div>
              <Link href={`/marketplace/${l.slug}`}>
                <Button variant="ghost" className="text-sm">View</Button>
              </Link>
            </div>
          </Card>
        ))}
        {listings.length === 0 && (
          <Card className="p-6">
            <div className="text-sm text-slate-600">No listings yet. Create one to get started.</div>
            <Button asChild className="mt-3">
              <Link href={`/providers/onboarding?providerType=${providerType}`}>Start listing profile</Link>
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

