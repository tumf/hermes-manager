import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Cron job types and interfaces
 */
export interface CronSchedule {
  kind: 'cron' | 'interval' | 'once';
  expr: string;
  display?: string;
}

export interface CronRepeat {
  times: number | null;
  completed: number;
}

export interface CronJob {
  id: string;
  name: string;
  prompt: string;
  skills: string[];
  skill?: string | null;
  model?: string | null;
  provider?: string | null;
  base_url?: string | null;
  schedule: CronSchedule;
  schedule_display?: string;
  repeat: CronRepeat;
  enabled: boolean;
  state: 'scheduled' | 'paused' | 'completed';
  paused_at?: string | null;
  paused_reason?: string | null;
  created_at: string;
  next_run_at?: string | null;
  last_run_at?: string | null;
  last_status?: string | null;
  last_error?: string | null;
  deliver: string;
  origin?: string | null;
}

export interface CronJobsFile {
  jobs: CronJob[];
  updated_at: string;
}

/**
 * Get the cron home directory for an agent
 */
export function getCronHome(agentHome: string): string {
  return path.join(agentHome, 'cron');
}

/**
 * Read and parse jobs.json file
 */
export function readJobs(agentHome: string): CronJob[] {
  const cronHome = getCronHome(agentHome);
  const jobsPath = path.join(cronHome, 'jobs.json');

  if (!fs.existsSync(jobsPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(jobsPath, 'utf-8');
    const data = JSON.parse(content) as CronJobsFile;
    return data.jobs || [];
  } catch {
    console.error(`Failed to read cron jobs from ${jobsPath}`);
    return [];
  }
}

/**
 * Write jobs to jobs.json with atomic operation (write to .tmp, then rename)
 */
export function writeJobsAtomic(agentHome: string, jobs: CronJob[]): void {
  const cronHome = getCronHome(agentHome);
  const jobsPath = path.join(cronHome, 'jobs.json');
  const tmpPath = path.join(cronHome, 'jobs.json.tmp');

  // Ensure cron directory exists
  if (!fs.existsSync(cronHome)) {
    fs.mkdirSync(cronHome, { recursive: true });
  }

  const data: CronJobsFile = {
    jobs,
    updated_at: new Date().toISOString(),
  };

  try {
    // Write to temp file
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    // Atomic rename
    fs.renameSync(tmpPath, jobsPath);
  } catch (error) {
    // Clean up temp file if it exists
    if (fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // ignore
      }
    }
    throw error;
  }
}

/**
 * Generate a 12-character hex UUID for a job
 */
export function generateJobId(): string {
  return randomBytes(6).toString('hex');
}

/**
 * Validate and parse a cron schedule expression
 * Accepts:
 * - 5-field cron: "0 20 * * *"
 * - Intervals: "30m", "2h", "1d"
 * - ISO timestamp: "2026-03-28T20:00:00Z"
 *
 * Returns the schedule object or throws an error
 */
export function parseCronSchedule(expr: string): CronSchedule {
  const trimmed = expr.trim();

  if (!trimmed) {
    throw new Error('Schedule expression cannot be empty');
  }

  // Try to parse as cron expression (5 fields separated by spaces)
  const cronRegex =
    /^(\*|[0-9,/-]+)\s+(\*|[0-9,/-]+)\s+(\*|[0-9,/-]+)\s+(\*|[0-9,/-]+)\s+(\*|[0-9,/-]+)$/;
  if (cronRegex.test(trimmed)) {
    return {
      kind: 'cron',
      expr: trimmed,
      display: trimmed,
    };
  }

  // Try to parse as interval (e.g., "30m", "2h", "1d")
  const intervalRegex = /^(\d+)(m|h|d)$/;
  const intervalMatch = trimmed.match(intervalRegex);
  if (intervalMatch) {
    return {
      kind: 'interval',
      expr: trimmed,
      display: trimmed,
    };
  }

  // Try to parse as ISO timestamp
  try {
    const ts = new Date(trimmed);
    if (!isNaN(ts.getTime())) {
      return {
        kind: 'once',
        expr: trimmed,
        display: trimmed,
      };
    }
  } catch {
    // not a valid timestamp
  }

  throw new Error(
    `Invalid schedule expression: "${trimmed}". Expected: cron (5 fields), interval (e.g., 30m, 2h, 1d), or ISO timestamp`,
  );
}

/**
 * Compute next run time for a schedule
 * Returns ISO string or null if indeterminate (for interval/once on create)
 */
export function computeNextRunAt(schedule: CronSchedule): string | null {
  // For cron expressions, we'd need croniter or similar
  // For now, return null to signal that Hermes runtime will compute it
  // In a real implementation, you might use a library like cron-parser

  if (schedule.kind === 'cron') {
    // Return null to let Hermes runtime compute the next run time
    // This avoids heavy dependency on cron parsing library
    return null;
  }

  // For interval and once, also return null (Hermes will compute)
  return null;
}

/**
 * Format a job state for display
 */
export function formatJobState(job: CronJob): string {
  if (job.state === 'paused') return 'paused';
  if (job.state === 'completed') return 'completed';
  return job.enabled ? 'active' : 'disabled';
}

/**
 * Find a job by ID in the jobs array
 */
export function findJobById(jobs: CronJob[], id: string): CronJob | undefined {
  return jobs.find((j) => j.id === id);
}

/**
 * Find the index of a job by ID
 */
export function findJobIndexById(jobs: CronJob[], id: string): number {
  return jobs.findIndex((j) => j.id === id);
}
