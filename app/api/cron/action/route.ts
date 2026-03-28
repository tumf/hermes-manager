import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { readJobs, writeJobsAtomic } from '@/src/lib/cron';
import { db, schema } from '@/src/lib/db';
import { CronJobActionSchema } from '@/src/lib/validators/cron';

/**
 * POST /api/cron/action
 * Execute an action on a cron job (pause, resume, run)
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = CronJobActionSchema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.errors[0];
    return NextResponse.json({ error: firstError.message || 'Validation failed' }, { status: 400 });
  }

  const { agent: agentName, id: jobId, action, reason } = result.data;

  // Verify agent exists
  const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.agentId, agentName));
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  // Read existing jobs
  const jobs = readJobs(agent.home);
  const jobIndex = jobs.findIndex((j) => j.id === jobId);

  if (jobIndex === -1) {
    return NextResponse.json({ error: 'job not found' }, { status: 404 });
  }

  const job = jobs[jobIndex];
  const now = new Date().toISOString();

  // Execute action
  switch (action) {
    case 'pause':
      job.state = 'paused';
      job.enabled = false;
      job.paused_at = now;
      job.paused_reason = reason || null;
      break;

    case 'resume':
      job.state = 'scheduled';
      job.enabled = true;
      job.paused_at = null;
      job.paused_reason = null;
      break;

    case 'run':
      // Set next_run_at to now so the Hermes scheduler picks it up immediately
      job.next_run_at = now;
      break;

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Write back atomically
  try {
    writeJobsAtomic(agent.home, jobs);
  } catch (err) {
    console.error('Failed to write jobs.json:', err);
    return NextResponse.json({ error: 'Failed to save job' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
