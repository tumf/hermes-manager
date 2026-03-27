import { z } from 'zod';

export const upsertGlobalSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export type UpsertGlobalInput = z.infer<typeof upsertGlobalSchema>;
