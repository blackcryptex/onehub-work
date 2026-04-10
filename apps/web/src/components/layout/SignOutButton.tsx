"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  const [isPending, setIsPending] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleSignOut = async () => {
    setIsPending(true);
    await signOut({ callbackUrl: "/signin", redirect: true });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      disabled={!isHydrated || isPending}
    >
      {!isHydrated ? "Loading..." : isPending ? "Signing out..." : "Sign out"}
    </Button>
  );
}
