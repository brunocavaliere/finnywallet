"use server";

import { revalidatePath } from "next/cache";

import { profileUpsertSchema } from "@/domains/profile/schemas";
import { getServerUserContext } from "@/domains/portfolio/server/session";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function upsertProfileAction(input: {
  display_name?: string | null;
}): Promise<ActionResult> {
  try {
    const payload = profileUpsertSchema.parse(input);
    const { supabase, userId } = await getServerUserContext();

    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          display_name: payload.display_name ?? null
        },
        { onConflict: "user_id" }
      );

    if (error) {
      throw error;
    }

    revalidatePath("/profile");
    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Não foi possível salvar o perfil." };
  }
}
