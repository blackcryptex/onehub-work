"use client";

import { useRouter } from "next/navigation";

export function RefreshButton({ label = "Refresh" }: { label?: string }) {
  const router = useRouter();
  return (
    <button onClick={() => router.refresh()} aria-label={label}>
      {label}
    </button>
  );
}

