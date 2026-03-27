import { z } from 'zod';

export const envVisibilitySchema = z.enum(['plain', 'secure']);

export const upsertGlobalSchema = z.object({
  key: z.string().min(1),
  value: z.string().default(''),
  visibility: envVisibilitySchema.default('plain'),
});

export type EnvVisibility = z.infer<typeof envVisibilitySchema>;
