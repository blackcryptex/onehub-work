"use client";

import { Button } from "@/components/ui";
import { signOut } from "next-auth/react";

export default function SignOutPage() {
  return (
    <main className="mx-auto grid min-h-[50vh] max-w-md place-items-center px-4 py-12">
      <div className="w-full text-center">
        <h1 className="text-xl font-semibold">Sign out</h1>
        <p className="mt-2 text-sm text-slate-600">You can safely sign out of OneHub.</p>
        <div className="mt-4">
          <Button onClick={() => signOut({ callbackUrl: "/" })}>Sign out</Button>
        </div>
      </div>
    </main>
  );
}
