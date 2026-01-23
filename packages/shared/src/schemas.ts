import { z } from "zod";

export const moneySchema = z.number().finite();

export const allocationSchema = z.object({
  symbol: z.string().min(1),
  target: z.number().min(0).max(1)
});
