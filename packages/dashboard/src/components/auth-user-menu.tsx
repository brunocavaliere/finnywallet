"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { ChevronDown, LogOut, Moon, Sun, User2 } from "lucide-react";

import { createBrowserClient } from "@/lib/supabase/browserClient";
import { useTheme } from "@/components/theme/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
const supabase = createBrowserClient();

export function AuthUserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
        >
          <div className="flex min-w-0 items-center gap-3">
            <User2 className="h-4 w-4 text-muted-foreground" />
            <div className="min-w-0 group-data-[state=collapsed]/sidebar:hidden">
              <div className="truncate font-medium">{label}</div>
              {secondary ? (
                <div className="truncate text-xs text-muted-foreground">
                  {secondary}
                </div>
              ) : null}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground group-data-[state=collapsed]/sidebar:hidden" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" side="top">
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center gap-2">
            <User2 className="h-4 w-4" />
            Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            toggleTheme();
          }}
        >
          {theme === "dark" ? (
            <Sun className="mr-2 h-4 w-4" />
          ) : (
            <Moon className="mr-2 h-4 w-4" />
          )}
          Tema
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
