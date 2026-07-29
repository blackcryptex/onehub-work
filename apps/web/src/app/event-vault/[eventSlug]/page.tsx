import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { vaultDetail } from "@/lib/routes";

// This is the OLD event vault page. Redirect to the role-aware event surface.
// The new page includes booking request proposal generation and all event management features
export default async function EventVaultDetailPage(props: { params: Promise<{ eventSlug: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();

  redirect(vaultDetail(user?.role, params.eventSlug) as any);
}
