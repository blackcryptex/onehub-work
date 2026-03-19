'use client';

import { useCallback, useEffect, useMemo, useState } from "react";

type ShortlistedVendor = {
  id: string;
  name: string | null;
};

export function useShortlist(eventId: string | null | undefined) {
  const [vendorIds, setVendorIds] = useState<Set<string>>(new Set());
  const [vendorMap, setVendorMap] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!eventId) {
        if (!ignore) {
          setVendorIds(new Set());
          setVendorMap(new Map());
        }
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/shortlist?eventId=${encodeURIComponent(eventId)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          return;
        }
        const data: { vendors: ShortlistedVendor[] } = await res.json();
        if (!ignore) {
          setVendorIds(new Set(data.vendors.map((v) => v.id)));
          setVendorMap(new Map(data.vendors.map((v) => [v.id, v.name ?? null])));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [eventId]);

  const refetch = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/shortlist?eventId=${encodeURIComponent(eventId)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data: { vendors: ShortlistedVendor[] } = await res.json();
      setVendorIds(new Set(data.vendors.map((v) => v.id)));
      setVendorMap(new Map(data.vendors.map((v) => [v.id, v.name ?? null])));
    } catch {
      // swallow errors; caller can retry
    }
  }, [eventId]);

  const toggleShortlist = useCallback(
    async (
      vendor: { id: string; name?: string | null },
      checked: boolean,
    ) => {
      if (!eventId) return;

      setVendorIds((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(vendor.id);
        } else {
          next.delete(vendor.id);
        }
        return next;
      });
      setVendorMap((prev) => {
        const next = new Map(prev);
        if (checked) {
          next.set(vendor.id, vendor.name ?? null);
        } else {
          next.delete(vendor.id);
        }
        return next;
      });

      try {
        await fetch("/api/shortlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            vendorId: vendor.id,
            vendorName: vendor.name ?? null,
            checked,
          }),
        });
      } catch {
        await refetch();
      }
    },
    [eventId, refetch],
  );

  const isShortlisted = useCallback(
    (id: string) => vendorIds.has(id),
    [vendorIds],
  );

  const shortlistedVendors = useMemo<ShortlistedVendor[]>(() => {
    return Array.from(vendorIds).map((id) => ({
      id,
      name: vendorMap.get(id) ?? null,
    }));
  }, [vendorIds, vendorMap]);

  return {
    loading,
    shortlistedVendorIds: vendorIds,
    shortlistedVendors,
    isShortlisted,
    toggleShortlist,
    refetch,
  };
}


