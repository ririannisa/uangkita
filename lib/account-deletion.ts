import { z } from "zod";

export const accountDeletionSchema = z
  .object({
    confirmation: z.literal("HAPUS AKUN"),
    acknowledgeSharedData: z.literal(true),
  })
  .strict();

export const accountDeletionSql = `DELETE FROM neon_auth."user" u
WHERE u.id=$1::uuid AND EXISTS (
  SELECT 1 FROM neon_auth.session s
  WHERE s.id=$2::uuid AND s."userId"=u.id AND s."expiresAt">now()
    AND s."createdAt">now()-interval '15 minutes'
    AND s."impersonatedBy" IS NULL
) RETURNING u.id`;
