"use client";

import { useEffect, useState } from "react";

export type B3AssetOption = {
  ticker: string;
  name: string | null;
  category: string | null;
};

export function useB3AssetOptions(open: boolean, query: string) {
  const [options, setOptions] = useState<B3AssetOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!query.trim()) {
      setOptions([]);
      return;
    }

    const controller = new AbortController();
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/b3-assets?query=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          setOptions([]);
          return;
        }
        const payload = (await response.json()) as {
          items: B3AssetOption[];
        };
        setOptions(payload.items ?? []);
      } catch {
        if (!controller.signal.aborted) {
          setOptions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [open, query]);

  return { options, loading };
}
