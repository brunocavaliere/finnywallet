import "server-only";

import { createServerClient } from "@/lib/supabase/serverClient";

export async function getServerUserContext() {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Usuário não autenticado.");
  }

  return { supabase, userId: data.user.id };
}
