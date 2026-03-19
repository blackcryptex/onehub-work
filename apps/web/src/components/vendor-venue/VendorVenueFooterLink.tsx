"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import type { Route } from "next";

interface VendorVenueFooterLinkProps {
  label: string;
}

export function VendorVenueFooterLink({ label }: VendorVenueFooterLinkProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isChecking, setIsChecking] = useState(false);
  const [href, setHref] = useState("/providers/start");

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      // Not signed in - redirect to sign-in with callback
      setHref(`/signin?callbackUrl=${encodeURIComponent("/providers/start")}`);
      return;
    }

    // Signed in - check profile and set appropriate href
    const checkProfile = async () => {
      setIsChecking(true);
      try {
        const response = await fetch("/api/vendor-venue/check-profile");
        if (response.ok) {
          const data = await response.json();
          if (data.hasVendorOrg) {
            setHref("/vendor/dashboard");
          } else if (data.hasVenueOrg) {
            setHref("/venue/dashboard");
          } else {
            // No org yet - go to provider start
            setHref("/providers/start");
          }
        }
      } catch (error) {
        console.error("Error checking profile:", error);
        setHref("/providers/start");
      } finally {
        setIsChecking(false);
      }
    };

    checkProfile();
  }, [session, status]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (isChecking) return;
    router.push(href as Route);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className="text-sm text-slate-600 hover:text-indigo-600 transition-colors"
    >
      {label}
    </a>
  );
}

