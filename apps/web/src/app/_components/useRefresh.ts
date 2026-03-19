"use client";

import { useRouter } from "next/navigation";

export function useRefresh() {
  const router = useRouter();
  return () => router.refresh();
}

