"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, LayoutGrid, Target } from "lucide-react";

import { AuthUserMenu } from "@/components/auth-user-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { href: "/dashboard", label: "Painel", icon: LayoutGrid },
  { href: "/targets", label: "Metas", icon: Target }
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar>
          <SidebarHeader className="px-7">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="group-data-[state=collapsed]/sidebar:hidden">
                Finny Wallet
              </span>
              <span className="hidden text-sm font-semibold tracking-widest group-data-[state=collapsed]/sidebar:inline">
                FW
              </span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild active={isActive}>
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span className="group-data-[state=collapsed]/sidebar:hidden">
                          {item.label}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <AuthUserMenu />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex items-center justify-between gap-4 border-b border-border bg-background/95 px-8 py-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <SidebarCollapseButton />
              <span>Controle de carteira, sem complicação.</span>
            </div>
          </header>
          <main className="flex-1 min-h-0 overflow-hidden bg-background px-8 py-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function SidebarCollapseButton() {
  const { open } = useSidebar();
  return (
    <SidebarTrigger aria-label={open ? "Colapsar menu" : "Expandir menu"}>
      {open ? (
        <ChevronLeft className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
    </SidebarTrigger>
  );
}
