import { z } from 'zod';

export const fileTypeSchema = z.enum(['agents.md', 'soul.md', 'config.yaml']);

const templateNameRegex = /^[a-zA-Z0-9_-]+$/;

export const CreateTemplateSchema = z.object({
  fileType: fileTypeSchema,
  name: z
    .string()
    .regex(
      templateNameRegex,
      'Template name must only contain alphanumeric, underscore, or hyphen characters',
    ),
  content: z.string(),
});

export const UpdateTemplateSchema = z.object({
  fileType: fileTypeSchema,
  name: z
    .string()
    .regex(
      templateNameRegex,
      'Template name must only contain alphanumeric, underscore, or hyphen characters',
    ),
  content: z.string(),
});

export const SaveAsTemplateSchema = z.object({
  fileType: fileTypeSchema,
  name: z
    .string()
    .regex(
      templateNameRegex,
      'Template name must only contain alphanumeric, underscore, or hyphen characters',
    ),
  content: z.string(),
});
