import { redirect } from "next/navigation";

/**
 * Legacy compatibility redirect: /app/contracts → /contracts
 */
export default function ContractsPage() {
  redirect("/contracts");
}

