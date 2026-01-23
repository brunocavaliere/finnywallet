import type { ReactNode } from "react";
import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/assets", label: "Assets" },
  { href: "/holdings", label: "Holdings" },
  { href: "/targets", label: "Targets" },
  { href: "/rebalance", label: "Rebalance" }
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="w-64 border-r border-border bg-white/80 p-6">
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
        </aside>
        <div className="flex flex-1 flex-col">
          <header className="border-b border-border bg-white/70 px-8 py-4 text-sm text-muted-foreground">
            Portfolio control made simple.
          </header>
          <main className="flex-1 bg-white px-8 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
