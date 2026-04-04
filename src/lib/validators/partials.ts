import { z } from 'zod';

const partialNameRegex = /^[a-zA-Z0-9_-]+$/;

export const partialNameSchema = z
  .string()
  .regex(partialNameRegex, 'Partial name must only contain alphanumeric, underscore, or hyphen');

export const upsertPartialSchema = z.object({
  name: partialNameSchema,
  content: z.string(),
});
