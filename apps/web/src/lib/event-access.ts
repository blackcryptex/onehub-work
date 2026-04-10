import { getCurrentUser, type AppUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canEditEvent, canManageEvent, canViewEvent } from "@/lib/rbac";
import { notFound, redirect } from "next/navigation";

export type EventAccessMode = "view" | "manage" | "edit";

export async function requireAuthorizedEventBySlug(
  eventSlug: string,
  access: EventAccessMode = "manage"
) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  const event = await prisma.event.findFirst({
    where: { slug: eventSlug },
    include: {
      org: {
        include: {
          members: {
            where: { userId: user.id },
          },
        },
      },
      stakeholders: {
        where: { userId: user.id },
        select: { userId: true, role: true },
      },
      shares: {
        where: { viewerUserId: user.id, scope: "SUMMARY" },
        select: { viewerUserId: true, scope: true },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const authorized = hasEventAccess(user, event, access);
  if (!authorized) {
    notFound();
  }

  return { user, event };
}

function hasEventAccess(
  user: AppUser,
  event: Parameters<typeof canManageEvent>[1],
  access: EventAccessMode
): boolean {
  switch (access) {
    case "view":
      return canViewEvent(user, event);
    case "edit":
      return canEditEvent(user, event);
    case "manage":
    default:
      return canManageEvent(user, event);
  }
}
