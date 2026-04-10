import { redirect } from "next/navigation";

/**
 * Legacy compatibility redirect: /app/contracts → canonical in-app commercial surface.
 */
export default function ContractsPage() {
  redirect("/app/vault");
}

