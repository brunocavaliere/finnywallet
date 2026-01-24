import { z } from "zod";

export const tickerSchema = z
  .string()
  .trim()
  .min(1, "Ticker é obrigatório")
  .transform((value) => value.toUpperCase());

const assetNameSchema = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() === "") {
      return null;
    }
    return value;
  },
  z.string().trim().optional().nullable()
);

export const assetCreateSchema = z.object({
  ticker: tickerSchema,
  name: assetNameSchema
});

export const assetUpdateSchema = assetCreateSchema.extend({
  id: z.string().uuid()
});

export const holdingUpsertSchema = z.object({
  asset_id: z.string().uuid(),
  qty: z.coerce.number().min(0, "Quantidade deve ser positiva")
});

export const holdingCreateSchema = z.object({
  ticker: tickerSchema,
  name: assetNameSchema,
  qty: z.coerce.number().min(0, "Quantidade deve ser positiva")
});

export const holdingUpdateSchema = z.object({
  id: z.string().uuid(),
  qty: z.coerce.number().min(0, "Quantidade deve ser positiva")
});

export const targetUpsertSchema = z.object({
  asset_id: z.string().uuid(),
  target_percent: z
    .coerce
    .number()
    .min(0, "Percentual mínimo é 0")
    .max(100, "Percentual máximo é 100")
});

export const targetUpdateSchema = z.object({
  id: z.string().uuid(),
  target_percent: z
    .coerce
    .number()
    .min(0, "Percentual mínimo é 0")
    .max(100, "Percentual máximo é 100")
});
