"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import type { Route } from "next";

interface VendorVenueFooterLinkProps {
  label: string;
}

export function VendorVenueFooterLink({ label }: VendorVenueFooterLinkProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isNavigating, setIsNavigating] = useState(false);

  const signedOutHref = `/signin?callbackUrl=${encodeURIComponent("/providers/start")}`;
  const fallbackHref = session?.user ? "/providers/start" : signedOutHref;

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    if (isNavigating || status === "loading") return;

    if (!session?.user) {
      router.push(signedOutHref as Route);
      return;
    }

    setIsNavigating(true);

    try {
      const response = await fetch("/api/vendor-venue/check-profile", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        router.push("/providers/start");
        return;
      }

      const data = await response.json();

      if (data.hasVendorOrg) {
        router.push("/vendor/dashboard");
        return;
      }

      if (data.hasVenueOrg) {
        router.push("/venue/dashboard");
        return;
      }

      router.push("/providers/start");
    } catch {
      router.push("/providers/start");
    } finally {
      setIsNavigating(false);
    }
  };

  return (
    <a
      href={fallbackHref}
      onClick={handleClick}
      className="text-sm text-slate-600 hover:text-indigo-600 transition-colors"
    >
      {label}
    </a>
  );
}
