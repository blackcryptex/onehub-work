import { redirect } from "next/navigation";

/**
 * Legacy compatibility redirect: /app/proposals → canonical in-app commercial surface.
 */
export default function ProposalsPage() {
  redirect("/app/vault");
}

