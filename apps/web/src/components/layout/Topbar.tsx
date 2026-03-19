import Link from "next/link";
import { Button } from "@/components/ui";
import { SignOutButton } from "./SignOutButton";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import type { Role } from "@onehub/types/src/roles";

interface TopbarProps {
  role?: Role | null;
}

export function Topbar({ role }: TopbarProps = {}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-sm font-semibold">
          OneHub
        </Link>
        <div className="flex items-center gap-2">
          {role === "DIY_PLANNER" && (
            <Button asChild variant="ghost">
              <Link href="/diy-planner">DIY Planner</Link>
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link href="/app">Dashboard</Link>
          </Button>
          <NotificationDropdown />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
