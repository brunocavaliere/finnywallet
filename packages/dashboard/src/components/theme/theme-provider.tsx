"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { createBrowserClient } from "@/lib/supabase/browserClient";

const STORAGE_KEY = "finny-theme";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function ThemeProvider({
  children,
  initialTheme,
  userId
}: {
  children: ReactNode;
  initialTheme?: Theme;
  userId?: string | null;
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme ?? "light");
  const supabase = useMemo(() => createBrowserClient(), []);

  useEffect(() => {
    if (initialTheme) {
      setTheme(initialTheme);
      return;
    }
    setTheme(getPreferredTheme());
  }, [initialTheme]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const syncTheme = async () => {
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: userId, theme }, { onConflict: "user_id" });

      if (error) {
        console.warn("Falha ao salvar tema no perfil.", error);
      }
    };

    void syncTheme();
  }, [theme, userId, supabase]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((prev) => (prev === "dark" ? "light" : "dark"))
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
