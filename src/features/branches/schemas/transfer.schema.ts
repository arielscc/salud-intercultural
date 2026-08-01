import { z } from "zod";

const branchCode = z.string().trim().regex(/^[a-z0-9-]{2,80}$/);

export const inventoryTransferSchema = z.object({
  itemId: z.string().trim().min(1).max(120),
  sourceBranchCode: branchCode,
  destinationBranchCode: branchCode,
  quantity: z.coerce.number().int().positive().max(1_000_000),
  reason: z.string().trim().min(3).max(300),
  idempotencyKey: z.string().uuid()
}).refine((value) => value.sourceBranchCode !== value.destinationBranchCode, {
  message: "Las sucursales deben ser diferentes.",
  path: ["destinationBranchCode"]
});
