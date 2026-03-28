import { z } from 'zod';

const nameRegex = /^[a-zA-Z0-9_-]+$/;

export const CreateAgentSchema = z.object({
  name: z
    .string()
    .regex(nameRegex, 'Name must only contain alphanumeric, underscore, or hyphen characters'),
  templates: z
    .object({
      agentsMd: z.string().optional(),
      soulMd: z.string().optional(),
      configYaml: z.string().optional(),
    })
    .optional(),
});

export const CopyAgentSchema = z.object({
  from: z
    .string()
    .regex(nameRegex, 'from must only contain alphanumeric, underscore, or hyphen characters'),
  to: z
    .string()
    .regex(nameRegex, 'to must only contain alphanumeric, underscore, or hyphen characters'),
});
