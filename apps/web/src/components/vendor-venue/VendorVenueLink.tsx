"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import type { Route } from "next";

export function VendorVenueLink() {
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
      className="flex items-center gap-1 text-indigo-600 font-medium hover:underline"
    >
      Get Featured <span>→</span>
    </a>
  );
}

