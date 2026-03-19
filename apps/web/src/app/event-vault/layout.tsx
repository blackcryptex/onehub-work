import { ReactNode } from "react";

// This layout is for the old /event-vault routes which now redirect to /app/vault
// The page component handles auth and redirects, so this layout just passes through
// We don't render any UI here since the page will redirect before rendering
export default function EventVaultLayout({ children }: { children: ReactNode }) {
  // No auth check here - the page component handles redirects
  // This prevents redirect loops between layout and page
  return <>{children}</>;
}

