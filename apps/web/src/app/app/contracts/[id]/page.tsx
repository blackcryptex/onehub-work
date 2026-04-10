import { redirect } from "next/navigation";

/**
 * Legacy compatibility redirect: /app/contracts/[id] → canonical contract detail route.
 */
export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  redirect(`/contracts/${resolvedParams.id}`);
}

