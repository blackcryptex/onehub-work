import { redirect } from "next/navigation";

/**
 * Legacy compatibility redirect: /app/proposals → /proposals
 */
export default function ProposalsPage() {
  redirect("/proposals");
}

