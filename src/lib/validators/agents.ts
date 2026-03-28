import { z } from 'zod';

const agentIdRegex = /^[a-zA-Z0-9_-]+$/;

/**
 * POST /api/agents — no body required (id is auto-generated).
 * Schema accepts empty body or no body at all.
 */
export const CreateAgentSchema = z.object({}).optional();

/**
 * POST /api/agents/copy — only `from` is required (destination id is auto-generated).
 */
export const CopyAgentSchema = z.object({
  from: z
    .string()
    .regex(agentIdRegex, 'from must only contain alphanumeric, underscore, or hyphen characters'),
});
