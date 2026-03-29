import { z } from 'zod';

const templateNameRegex = /^[a-zA-Z0-9_-]+$/;

export const fileSchema = z.enum(['AGENTS.md', 'SOUL.md', 'config.yaml']);

export const templateNameSchema = z
  .string()
  .regex(
    templateNameRegex,
    'Template name must only contain alphanumeric, underscore, or hyphen characters',
  );

export const CreateTemplateSchema = z.object({
  file: fileSchema,
  name: templateNameSchema,
  content: z.string(),
});

export const UpdateTemplateSchema = z.object({
  file: fileSchema,
  name: templateNameSchema,
  content: z.string(),
});

export const SaveAsTemplateSchema = z.object({
  file: fileSchema,
  name: templateNameSchema,
  content: z.string(),
});
