"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(() => {
      signOut({ callbackUrl: "/" });
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      disabled={isPending}
    >
      {isPending ? "Signing out..." : "Sign out"}
    </Button>
  );
}

