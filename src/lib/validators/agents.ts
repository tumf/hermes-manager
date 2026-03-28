import { z } from 'zod';

const agentIdRegex = /^[a-zA-Z0-9_-]+$/;

/**
 * POST /api/agents — body is optional (id is auto-generated).
 * Optionally accepts templates for initial file content.
 */
export const CreateAgentSchema = z
  .object({
    templates: z
      .object({
        agentsMd: z.string().optional(),
        soulMd: z.string().optional(),
        configYaml: z.string().optional(),
      })
      .optional(),
  })
  .optional();

/**
 * POST /api/agents/copy — only `from` is required (destination id is auto-generated).
 */
export const CopyAgentSchema = z.object({
  from: z
    .string()
    .regex(agentIdRegex, 'from must only contain alphanumeric, underscore, or hyphen characters'),
});
