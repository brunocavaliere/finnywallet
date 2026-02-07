"use client";

import { useEffect, useState } from "react";

export type TreasuryOption = {
  title_type: string;
  maturity_date: string;
};

export function useTreasuryOptions(open: boolean, query: string) {
  const [options, setOptions] = useState<TreasuryOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const controller = new AbortController();
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/treasury-titles?query=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          setOptions([]);
          return;
        }
        const payload = (await response.json()) as {
          items: TreasuryOption[];
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
