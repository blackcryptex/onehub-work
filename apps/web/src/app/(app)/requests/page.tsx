import { Card } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Calendar, User, Mail, Phone, Users, MessageSquare } from "lucide-react";
import { vaultDetail } from "@/lib/routes";

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case "QUOTED":
      return "bg-green-100 text-green-800 border-green-200";
    case "HOLD":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "DECLINED":
    case "EXPIRED":
    case "WITHDRAWN":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-blue-100 text-blue-800 border-blue-200";
  }
};

export default async function RequestsPage() {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  const userRole = session?.user?.role;
  if (!userId) return <div>Unauthorized</div>;
  
  const orgs = await prisma.organization.findMany({
    where: { members: { some: { userId } } },
  });
  const orgIds = orgs.map((o) => o.id);
  const providerOrgTypes = new Set(["VENDOR", "VENUE"]);
  const providerOrgIds = orgs.filter((o) => providerOrgTypes.has(o.type)).map((o) => o.id);
  const hasProviderOrg = providerOrgIds.length > 0;
  const requests = await prisma.bookingRequest.findMany({
    where: {
      OR: [
        { orgId: { in: orgIds } },
        { listing: { orgId: { in: orgIds } } },
      ],
    },
    include: { listing: true, event: true, org: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Booking Requests</h1>
      </div>

      {requests.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-slate-500 mb-2">{hasProviderOrg ? "No leads or sent booking requests yet." : "No sent booking requests yet."}</div>
          <div className="text-sm text-slate-400">
            {hasProviderOrg
              ? "Provider leads for your listings and requests your team sent will appear here with clear direction labels."
              : "Requests you send to vendors and venues will appear here. Start from marketplace discovery when you are ready to ask for availability or a quote."}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold">{r.listing.title}</h3>
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {providerOrgIds.includes(r.listing.orgId) ? "Lead received" : "Request sent"}
                    </span>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(
                        r.status
                      )}`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
                    {r.event && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          <Link
                            href={vaultDetail(userRole as any, r.event.slug) as any}
                            className="text-indigo-600 hover:underline"
                          >
                            {r.event.name}
                          </Link>
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(r.startAt).toLocaleDateString()} –{" "}
                        {new Date(r.endAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{r.contactName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{r.contactEmail}</span>
                    </div>
                    {r.contactPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{r.contactPhone}</span>
                      </div>
                    )}
                    {r.guests && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{r.guests} guests</span>
                      </div>
                    )}
                    {r.quoteCents && (
                      <div className="flex items-center gap-2 font-medium text-slate-900">
                        <span>Quote: ${(r.quoteCents / 100).toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {r.message && (
                    <div className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                      <MessageSquare className="w-4 h-4 mt-0.5" />
                      <p className="italic">{r.message}</p>
                    </div>
                  )}

                  <div className="mt-3 text-xs text-slate-400">
                    Requested: {new Date(r.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

