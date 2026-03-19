import { redirect } from "next/navigation";

// This is the OLD event vault page. Redirect to the new feature-rich vault page at /app/vault/[eventSlug]
// The new page includes booking request proposal generation and all event management features
export default async function EventVaultDetailPage({ params }: { params: { eventSlug: string } }) {
  // Type assertion: Next.js typed routes don't support dynamic template strings, so we cast to satisfy TypeScript
  redirect(`/app/vault/${params.eventSlug}` as any);
}
