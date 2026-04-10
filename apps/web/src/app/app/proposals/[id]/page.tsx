import { redirect } from "next/navigation";

/**
 * Legacy compatibility redirect: /app/proposals/[id] → canonical proposal detail route.
 */
export default async function ProposalDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  redirect(`/proposals/${resolvedParams.id}`);
}
