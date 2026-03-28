import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import {
  generateJobId,
  parseCronSchedule,
  readJobs,
  writeJobsAtomic,
  type CronJob,
} from '@/src/lib/cron';
import { db, schema } from '@/src/lib/db';
import {
  CreateCronJobSchema,
  DeleteCronJobSchema,
  UpdateCronJobSchema,
} from '@/src/lib/validators/cron';

/**
 * GET /api/cron?agent=<name>
 * Returns jobs array for the specified agent
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentName = searchParams.get('agent');

  if (!agentName) {
    return NextResponse.json({ error: 'agent query param required' }, { status: 400 });
  }

  // Verify agent exists
  const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.name, agentName));
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  // Read jobs from {agent.home}/cron/jobs.json
  const jobs = readJobs(agent.home);

  return NextResponse.json({ jobs });
}

/**
 * POST /api/cron
 * Create a new cron job
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = CreateCronJobSchema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.errors[0];
    return NextResponse.json({ error: firstError.message || 'Validation failed' }, { status: 400 });
  }

  const { agent: agentName, schedule: scheduleExpr, prompt, name, deliver } = result.data;

  // Verify agent exists
  const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.name, agentName));
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  // Parse schedule
  let schedule;
  try {
    schedule = parseCronSchedule(scheduleExpr);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid schedule expression';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Read existing jobs
  const jobs = readJobs(agent.home);

  // Create new job
  const jobId = generateJobId();
  const now = new Date().toISOString();
  const newJob: CronJob = {
    id: jobId,
    name: name || `job-${jobId}`,
    prompt,
    skills: result.data.skills || [],
    skill: null,
    schedule,
    schedule_display: schedule.display || schedule.expr,
    repeat: { times: null, completed: 0 },
    enabled: true,
    state: 'scheduled',
    created_at: now,
    next_run_at: null, // Hermes runtime will compute this
    last_run_at: null,
    last_status: null,
    last_error: null,
    deliver: deliver || '',
    origin: null,
  };

  // Append to jobs array
  jobs.push(newJob);

  // Write back atomically
  try {
    writeJobsAtomic(agent.home, jobs);
  } catch (err) {
    console.error('Failed to write jobs.json:', err);
    return NextResponse.json({ error: 'Failed to save job' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: jobId }, { status: 201 });
}

/**
 * PUT /api/cron
 * Update an existing cron job
 */
export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = UpdateCronJobSchema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.errors[0];
    return NextResponse.json({ error: firstError.message || 'Validation failed' }, { status: 400 });
  }

  const { agent: agentName, id: jobId } = result.data;

  // Verify agent exists
  const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.name, agentName));
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

  // Apply updates
  if (result.data.name !== undefined) {
    job.name = result.data.name;
  }
  if (result.data.prompt !== undefined) {
    job.prompt = result.data.prompt;
  }
  if (result.data.schedule !== undefined) {
    try {
      job.schedule = parseCronSchedule(result.data.schedule);
      job.schedule_display = job.schedule.display || job.schedule.expr;
      // Reset next_run_at so Hermes runtime recomputes it
      job.next_run_at = null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid schedule expression';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
  if (result.data.skills !== undefined) {
    job.skills = result.data.skills;
  }
  if (result.data.deliver !== undefined) {
    job.deliver = result.data.deliver;
  }
  if (result.data.repeat !== undefined) {
    job.repeat = { ...job.repeat, ...result.data.repeat };
  }
  if (result.data.model !== undefined) {
    job.model = result.data.model;
  }
  if (result.data.provider !== undefined) {
    job.provider = result.data.provider;
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

/**
 * DELETE /api/cron?agent=<name>&id=<id>
 * Remove a job by id
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentName = searchParams.get('agent');
  const jobId = searchParams.get('id');

  if (!agentName || !jobId) {
    return NextResponse.json({ error: 'Missing agent or id' }, { status: 400 });
  }

  const result = DeleteCronJobSchema.safeParse({ agent: agentName, id: jobId });
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
  }

  // Verify agent exists
  const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.name, agentName));
  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 });
  }

  // Read existing jobs
  const jobs = readJobs(agent.home);
  const jobIndex = jobs.findIndex((j) => j.id === jobId);

  if (jobIndex === -1) {
    return NextResponse.json({ error: 'job not found' }, { status: 404 });
  }

  // Remove job
  jobs.splice(jobIndex, 1);

  // Write back atomically
  try {
    writeJobsAtomic(agent.home, jobs);
  } catch (err) {
    console.error('Failed to write jobs.json:', err);
    return NextResponse.json({ error: 'Failed to save job' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
