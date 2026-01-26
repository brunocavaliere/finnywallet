import "server-only";

import type { Quote } from "@/domains/portfolio/types";
import { getServerUserContext } from "@/domains/portfolio/server/session";

export async function listQuotes(): Promise<Quote[]> {
  const { supabase, userId } = await getServerUserContext();

  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw Object.assign(new Error(error.message), { code: error.code });
  }

  return (data ?? []) as Quote[];
}
