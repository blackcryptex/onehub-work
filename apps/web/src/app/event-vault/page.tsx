import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";

// Redirect to the new vault page at /app/vault
// The new page has all the same features plus proposal generation
// This is a legacy route - we redirect authenticated users to /app/vault
// and unauthenticated users to signin (which will redirect to /app/vault after login)
export default async function EventVaultPage() {
  const user = await getCurrentUser();
  
  // If not authenticated, redirect to signin with the target as /app/vault
  // This prevents loops - signin will redirect to /app/vault after login
  if (!user) {
    redirect("/signin?redirect=/app/vault");
  }
  
  // If authenticated, redirect directly to /app/vault
  redirect("/app/vault");
}

