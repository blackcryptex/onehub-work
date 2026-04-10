import { ReactNode } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const sessionUser = session?.user;
  const user = sessionUser ? await getCurrentUser() : null;

  if (!sessionUser && !user) {
    redirect("/signin?callbackUrl=/app");
  }

  const role = user?.role || sessionUser?.role;
  return (
    <div className="min-h-screen">
      <Topbar role={role} />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-0 px-4 md:grid-cols-[15rem_1fr] md:gap-6">
        <Sidebar />
        <main id="content" className="py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

