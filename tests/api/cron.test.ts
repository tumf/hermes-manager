import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  readJobs,
  writeJobsAtomic,
  generateJobId,
  parseCronSchedule,
  type CronJob,
  type CronJobsFile,
} from '@/src/lib/cron';

const testDir = path.join('/tmp', 'cron-test');

describe('Cron Library', () => {
  beforeEach(() => {
    // Create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('readJobs', () => {
    it('returns empty array when jobs.json does not exist', () => {
      const jobs = readJobs(testDir);
      expect(jobs).toEqual([]);
    });

    it('reads and parses jobs.json', () => {
      const cronHome = path.join(testDir, 'cron');
      fs.mkdirSync(cronHome, { recursive: true });

      const jobsData: CronJobsFile = {
        jobs: [
          {
            id: 'abc123',
            name: 'test-job',
            prompt: 'test prompt',
            skills: [],
            schedule: { kind: 'cron', expr: '0 9 * * *', display: '0 9 * * *' },
            state: 'scheduled',
            enabled: true,
            repeat: { times: null, completed: 0 },
            created_at: '2026-03-28T00:00:00Z',
            deliver: '',
          },
        ],
        updated_at: '2026-03-28T00:00:00Z',
      };

      fs.writeFileSync(path.join(cronHome, 'jobs.json'), JSON.stringify(jobsData));

      const jobs = readJobs(testDir);
      expect(jobs).toHaveLength(1);
      expect(jobs[0].name).toBe('test-job');
    });
  });

  describe('writeJobsAtomic', () => {
    it('creates cron directory if it does not exist', () => {
      const jobs: CronJob[] = [];
      writeJobsAtomic(testDir, jobs);

      const cronHome = path.join(testDir, 'cron');
      expect(fs.existsSync(cronHome)).toBe(true);
    });

    it('writes jobs to jobs.json atomically', () => {
      const jobs: CronJob[] = [
        {
          id: 'job1',
          name: 'job-1',
          prompt: 'test',
          skills: [],
          schedule: { kind: 'cron', expr: '0 9 * * *' },
          state: 'scheduled',
          enabled: true,
          repeat: { times: null, completed: 0 },
          created_at: '2026-03-28T00:00:00Z',
          deliver: '',
        },
      ];

      writeJobsAtomic(testDir, jobs);

      const readBack = readJobs(testDir);
      expect(readBack).toHaveLength(1);
      expect(readBack[0].id).toBe('job1');
    });

    it('does not leave .tmp files on success', () => {
      const jobs: CronJob[] = [];
      writeJobsAtomic(testDir, jobs);

      const cronHome = path.join(testDir, 'cron');
      const tmpFile = path.join(cronHome, 'jobs.json.tmp');
      expect(fs.existsSync(tmpFile)).toBe(false);
    });
  });

  describe('generateJobId', () => {
    it('generates a 12-character hex string', () => {
      const id = generateJobId();
      expect(id).toMatch(/^[0-9a-f]{12}$/);
    });

    it('generates unique ids', () => {
      const id1 = generateJobId();
      const id2 = generateJobId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('parseCronSchedule', () => {
    it('parses 5-field cron expressions', () => {
      const schedule = parseCronSchedule('0 9 * * *');
      expect(schedule.kind).toBe('cron');
      expect(schedule.expr).toBe('0 9 * * *');
    });

    it('parses interval expressions', () => {
      const schedule = parseCronSchedule('30m');
      expect(schedule.kind).toBe('interval');
      expect(schedule.expr).toBe('30m');
    });

    it('parses various interval units', () => {
      expect(parseCronSchedule('2h').kind).toBe('interval');
      expect(parseCronSchedule('1d').kind).toBe('interval');
    });

    it('parses ISO timestamp', () => {
      const ts = '2026-03-28T20:00:00Z';
      const schedule = parseCronSchedule(ts);
      expect(schedule.kind).toBe('once');
      expect(schedule.expr).toBe(ts);
    });

    it('rejects empty expressions', () => {
      expect(() => parseCronSchedule('')).toThrow();
      expect(() => parseCronSchedule('   ')).toThrow();
    });

    it('rejects invalid expressions', () => {
      expect(() => parseCronSchedule('invalid')).toThrow();
      expect(() => parseCronSchedule('99 99 99 99 99')).not.toThrow(); // Still valid cron format
    });
  });
});
