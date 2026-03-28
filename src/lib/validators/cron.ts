import { z } from 'zod';
import { parseCronSchedule } from '../cron';

const agentNameRegex = /^[a-zA-Z0-9_-]+$/;

// Schema for creating a new cron job
export const CreateCronJobSchema = z.object({
  agent: z.string().regex(agentNameRegex, 'Invalid agent name'),
  schedule: z.string().refine(
    (expr) => {
      try {
        parseCronSchedule(expr);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid schedule expression' },
  ),
  prompt: z.string().min(1, 'Prompt is required').max(10000, 'Prompt too long'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  skills: z.array(z.string()).default([]).optional(),
  deliver: z.string().optional(),
  repeat: z
    .object({
      times: z.number().int().positive().nullable().optional(),
    })
    .optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
});

// Schema for updating a cron job (all fields optional)
export const UpdateCronJobSchema = z.object({
  agent: z.string().regex(agentNameRegex, 'Invalid agent name'),
  id: z.string().min(1, 'Job ID is required'),
  schedule: z
    .string()
    .refine(
      (expr) => {
        try {
          parseCronSchedule(expr);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'Invalid schedule expression' },
    )
    .optional(),
  prompt: z.string().min(1, 'Prompt is required').max(10000, 'Prompt too long').optional(),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  skills: z.array(z.string()).optional(),
  deliver: z.string().optional(),
  repeat: z
    .object({
      times: z.number().int().positive().nullable().optional(),
    })
    .optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
});

// Schema for deleting a job
export const DeleteCronJobSchema = z.object({
  agent: z.string().regex(agentNameRegex, 'Invalid agent name'),
  id: z.string().min(1, 'Job ID is required'),
});

// Schema for job action (pause, resume, run)
export const CronJobActionSchema = z.object({
  agent: z.string().regex(agentNameRegex, 'Invalid agent name'),
  id: z.string().min(1, 'Job ID is required'),
  action: z.enum(['pause', 'resume', 'run'], {
    errorMap: () => ({ message: 'action must be one of: pause, resume, run' }),
  }),
  reason: z.string().optional(),
});

// Schema for listing output files
export const CronOutputSchema = z.object({
  agent: z.string().regex(agentNameRegex, 'Invalid agent name'),
  id: z.string().min(1, 'Job ID is required'),
  file: z.string().optional(),
});
