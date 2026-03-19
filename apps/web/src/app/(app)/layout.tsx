import { ReactNode } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }
  const role = user.role;
  return (
    <div className="min-h-screen">
      <ImpersonationBanner />
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
