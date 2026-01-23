"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createBrowserClient } from "@/lib/supabase/browserClient";
import { Button } from "@/components/ui/button";

const supabase = createBrowserClient();

export function AuthUserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        setUser(null);
      } else {
        setUser(data.user ?? null);
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

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

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span>{user.email}</span>
      <Button variant="ghost" size="sm" onClick={handleSignOut}>
        Sair
      </Button>
    </div>
  );
}
