import { redirect } from "next/navigation";

/**
 * Legacy compatibility redirect: /app/contracts/[id] → /contracts/[id]
 */
export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  redirect(`/contracts/${resolvedParams.id}`);
}

