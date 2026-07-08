import { Card, Button } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canAccessDashboard } from "@/lib/rbac";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Eye, Search } from "lucide-react";
import { ImpersonateButton } from "@/components/admin/ImpersonateButton";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cursor?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const user = await getCurrentUser();
  // Centralized permission check: see apps/web/src/lib/rbac.ts
  if (!user || !canAccessDashboard(user, "ADMIN")) {
    redirect("/app");
  }

  const searchQuery = resolvedSearchParams.q || "";
  const limit = 20;

  // Build where clause for search
  const where: any = {};
  if (searchQuery) {
    where.OR = [
      { email: { contains: searchQuery, mode: "insensitive" } },
      { name: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    take: limit + 1,
    cursor: resolvedSearchParams.cursor ? { id: resolvedSearchParams.cursor } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  const hasMore = users.length > limit;
  const displayUsers = hasMore ? users.slice(0, limit) : users;
  const nextCursor = hasMore ? displayUsers[displayUsers.length - 1]?.id : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
      </div>

      {/* Search */}
      <Card className="p-4">
        <form method="get" className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              name="q"
              placeholder="Search by email or name..."
              defaultValue={searchQuery}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Button type="submit">Search</Button>
          {searchQuery && (
            <Link href="/admin/users">
              <Button variant="ghost" type="button">Clear</Button>
            </Link>
          )}
        </form>
      </Card>

      {/* Users List */}
      <div className="space-y-2">
        {displayUsers.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-slate-600">No users found.</p>
          </Card>
        ) : (
          displayUsers.map((u) => (
            <Card key={u.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-semibold">{u.name || "No name"}</div>
                  <div className="text-sm text-slate-600">{u.email}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Role: {u.role} • Created: {new Date(u.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ImpersonateButton userId={u.id} userEmail={u.email} />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {nextCursor && (
        <div className="text-center">
          <Link href={`/admin/users?cursor=${nextCursor}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}>
            <Button variant="ghost">Load More</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

