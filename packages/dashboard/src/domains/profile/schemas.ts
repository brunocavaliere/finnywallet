import { z } from "zod";

const optionalTextSchema = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() === "") {
      return null;
    }
    return value;
  },
  z.string().trim().min(1, "Informe um nome válido.").max(80).nullable().optional()
);

export const profileUpsertSchema = z.object({
  display_name: optionalTextSchema
});
