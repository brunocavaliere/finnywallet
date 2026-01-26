"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { ChevronDown, LogOut, Moon, User2 } from "lucide-react";

import { createBrowserClient } from "@/lib/supabase/browserClient";
import { ThemeToggle } from "@/components/theme/theme-toggle";
const supabase = createBrowserClient();

export function AuthUserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", userId)
        .maybeSingle();

      if (isMounted) {
        setDisplayName(profile?.display_name ?? null);
      }
    };

    supabase.auth.getUser().then(async ({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        setUser(null);
        setDisplayName(null);
      } else {
        setUser(data.user ?? null);
        if (data.user) {
          await loadProfile(data.user.id);
        } else {
          setDisplayName(null);
        }
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        if (nextUser) {
          void loadProfile(nextUser.id);
        } else {
          setDisplayName(null);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="text-sm text-muted-foreground transition hover:text-foreground"
      >
        Entrar
      </Link>
    );
  }

  const label = displayName || user.email || "Minha conta";
  const secondary = displayName ? user.email : null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
      >
        <div className="min-w-0">
          <div className="truncate font-medium">{label}</div>
          {secondary ? (
            <div className="truncate text-xs text-muted-foreground">
              {secondary}
            </div>
          ) : null}
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {isOpen ? (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-md border border-border bg-background p-1 text-sm shadow-md">
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onClick={() => setIsOpen(false)}
          >
            <User2 className="h-4 w-4" />
            Perfil
          </Link>
          <div className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Tema
            </div>
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      ) : null}
    </div>
  );
}
