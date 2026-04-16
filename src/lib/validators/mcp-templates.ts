import { z } from 'zod';

const mcpTemplateNameRegex = /^[a-zA-Z0-9_-]+$/;

export const mcpTemplateNameSchema = z
  .string()
  .regex(
    mcpTemplateNameRegex,
    'MCP template name must only contain alphanumeric, underscore, or hyphen characters',
  );

export const CreateMcpTemplateSchema = z.object({
  name: mcpTemplateNameSchema,
  content: z.string(),
});

export const UpdateMcpTemplateSchema = z.object({
  name: mcpTemplateNameSchema,
  content: z.string(),
});
