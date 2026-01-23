import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/serverClient";

export default async function AuthLayout({
  children
}: {
  children: ReactNode;
}) {
  const supabase = createServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
      {children}
    </div>
  );
}
