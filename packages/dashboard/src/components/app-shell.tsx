import type { ReactNode } from "react";
import Link from "next/link";

import { AuthUserMenu } from "@/components/auth-user-menu";

const navItems = [
  { href: "/dashboard", label: "Painel" },
  { href: "/holdings", label: "Posições" },
  { href: "/targets", label: "Metas" },
  { href: "/rebalance", label: "Rebalanceamento" },
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="flex w-64 flex-col border-r border-border bg-muted/30 p-6">
          <div className="text-lg font-semibold">Finny Wallet</div>
          <nav className="mt-8 space-y-2 text-sm text-muted-foreground">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2 transition hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto border-t border-border pt-4">
            <AuthUserMenu />
          </div>
        </aside>
        <div className="flex flex-1 flex-col">
          <main className="flex-1 bg-background px-8 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
