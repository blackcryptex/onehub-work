import { redirect } from "next/navigation";

/**
 * Legacy compatibility redirect: /app/requests → canonical booking requests route.
 */
export default function RequestsRedirectPage() {
  redirect("/requests");
}
