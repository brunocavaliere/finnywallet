import type { Metadata } from "next";

import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { createServerClient } from "@/lib/supabase/serverClient";

export const metadata: Metadata = {
  title: "Finny Wallet",
  description: "Portfolio rebalance dashboard"
};

function resolveTheme(value: unknown): "light" | "dark" | undefined {
  if (value === "light" || value === "dark") {
    return value;
  }
  return undefined;
}

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  let initialTheme: "light" | "dark" | undefined;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("theme")
      .eq("user_id", user.id)
      .maybeSingle();

    initialTheme = resolveTheme(data?.theme);
  }

  const htmlClassName = initialTheme === "dark" ? "dark" : undefined;

  return (
    <html lang="pt-BR" suppressHydrationWarning className={htmlClassName}>
      <body>
        <ThemeProvider initialTheme={initialTheme} userId={user?.id}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
