// @vitest-environment node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockRuntimePaths = vi.hoisted(() => ({
  agentsRoot: '',
}));

vi.mock('../../src/lib/runtime-paths', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getRuntimeAgentsRootPath: (...segments: string[]) =>
      mockRuntimePaths.agentsRoot
        ? path.join(mockRuntimePaths.agentsRoot, ...segments)
        : (actual.getRuntimeAgentsRootPath as (...s: string[]) => string)(...segments),
  };
});

import {
  buildSubagentSoulBlock,
  DEFAULT_POLICY,
  detectCycle,
  findDependentAgentIds,
  injectSubagentSoulBlock,
  readDelegationPolicy,
  stripSubagentSoulBlock,
  validateDispatch,
  validateNoSelfTarget,
  writeDelegationPolicy,
} from '../../src/lib/delegation';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'delegation-test-'));
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('readDelegationPolicy', () => {
  it('returns default policy when file missing', async () => {
    const policy = await readDelegationPolicy(tmpDir);
    expect(policy).toEqual(DEFAULT_POLICY);
  });

  it('reads valid policy from canonical dispatch.json', async () => {
    await fsp.writeFile(
      path.join(tmpDir, 'dispatch.json'),
      JSON.stringify({ allowedAgents: ['agent-a', 'agent-b'], maxHop: 5 }),
    );
    const policy = await readDelegationPolicy(tmpDir);
    expect(policy.allowedAgents).toEqual(['agent-a', 'agent-b']);
    expect(policy.maxHop).toBe(5);
  });

  it('falls back to legacy delegation.json when dispatch.json absent', async () => {
    await fsp.writeFile(
      path.join(tmpDir, 'delegation.json'),
      JSON.stringify({ allowedAgents: ['legacy-agent'], maxHop: 2 }),
    );
    const policy = await readDelegationPolicy(tmpDir);
    expect(policy.allowedAgents).toEqual(['legacy-agent']);
    expect(policy.maxHop).toBe(2);
  });

  it('prefers dispatch.json over legacy delegation.json', async () => {
    await fsp.writeFile(
      path.join(tmpDir, 'dispatch.json'),
      JSON.stringify({ allowedAgents: ['canonical'], maxHop: 4 }),
    );
    await fsp.writeFile(
      path.join(tmpDir, 'delegation.json'),
      JSON.stringify({ allowedAgents: ['legacy'], maxHop: 2 }),
    );
    const policy = await readDelegationPolicy(tmpDir);
    expect(policy.allowedAgents).toEqual(['canonical']);
    expect(policy.maxHop).toBe(4);
  });

  it('returns default for invalid JSON', async () => {
    await fsp.writeFile(path.join(tmpDir, 'dispatch.json'), 'not json');
    const policy = await readDelegationPolicy(tmpDir);
    expect(policy).toEqual(DEFAULT_POLICY);
  });
});

describe('writeDelegationPolicy', () => {
  it('writes policy to canonical dispatch.json atomically', async () => {
    const policy = { allowedAgents: ['target-01'], maxHop: 2 };
    await writeDelegationPolicy(tmpDir, policy);
    const raw = await fsp.readFile(path.join(tmpDir, 'dispatch.json'), 'utf-8');
    expect(JSON.parse(raw)).toEqual(policy);
    const tmpExists = fs.existsSync(path.join(tmpDir, 'dispatch.json.tmp'));
    expect(tmpExists).toBe(false);
  });
});

describe('validateNoSelfTarget', () => {
  it('rejects self-targeting', () => {
    expect(validateNoSelfTarget('agent-a', ['agent-a', 'agent-b'])).toBe(false);
  });

  it('allows non-self targets', () => {
    expect(validateNoSelfTarget('agent-a', ['agent-b', 'agent-c'])).toBe(true);
  });
});

describe('detectCycle', () => {
  it('detects direct cycle', () => {
    const edges = new Map([['a', ['b']]]);
    expect(detectCycle(edges, 'b', ['a'])).toBe(true);
  });

  it('detects indirect cycle', () => {
    const edges = new Map([
      ['a', ['b']],
      ['b', ['c']],
    ]);
    expect(detectCycle(edges, 'c', ['a'])).toBe(true);
  });

  it('allows acyclic graph', () => {
    const edges = new Map([['a', ['b']]]);
    expect(detectCycle(edges, 'c', ['b'])).toBe(false);
  });

  it('allows empty graph', () => {
    expect(detectCycle(new Map(), 'a', ['b'])).toBe(false);
  });
});

describe('buildSubagentSoulBlock', () => {
  it('returns empty string for empty policy', () => {
    expect(buildSubagentSoulBlock({ allowedAgents: [], maxHop: 3 }, [])).toBe('');
  });

  it('renders single agent with tags', () => {
    const block = buildSubagentSoulBlock({ allowedAgents: ['research01'], maxHop: 3 }, [
      {
        id: 'research01',
        name: 'Research Agent',
        description: 'Searches for info',
        tags: ['research', 'summary'],
      },
    ]);
    expect(block).toContain('HERMES_MANAGER_SUBAGENTS_V1_BEGIN');
    expect(block).toContain('HERMES_MANAGER_SUBAGENTS_V1_END');
    expect(block).toContain(
      'Prefer dispatching work to a listed managed subagent when one is a clear fit',
    );
    expect(block).toContain('Built-in `delegate_task` is a separate mechanism');
    expect(block).toContain('parent resumes ownership and delivers the final result');
    expect(block).toContain('dispatchSkill: hermes-manager-subagent-dispatch');
    expect(block).toContain('maxHop: 3');

    expect(block).not.toContain('dispatchEndpointPath');

    expect(block).toContain('id: research01');
    expect(block).toContain('name: Research Agent');
    expect(block).toContain('- research');
    expect(block).toContain('- summary');
  });

  it('renders multiline description', () => {
    const block = buildSubagentSoulBlock({ allowedAgents: ['agent-x'], maxHop: 2 }, [
      {
        id: 'agent-x',
        name: 'Agent X',
        description: 'Line one\nLine two',
        tags: [],
      },
    ]);
    expect(block).toContain('description: |-');
    expect(block).toContain('          Line one');
    expect(block).toContain('          Line two');
  });
});

describe('stripSubagentSoulBlock', () => {
  it('removes existing block', () => {
    const content = [
      '# Soul',
      '',
      '<!-- HERMES_MANAGER_SUBAGENTS_V1_BEGIN -->',
      'subagents:',
      '  dispatchSkill: test',
      '<!-- HERMES_MANAGER_SUBAGENTS_V1_END -->',
    ].join('\n');
    expect(stripSubagentSoulBlock(content)).toBe('# Soul');
  });

  it('returns unchanged content when no block exists', () => {
    const content = '# Soul\n\nSome text';
    expect(stripSubagentSoulBlock(content)).toBe(content);
  });
});

describe('injectSubagentSoulBlock', () => {
  it('appends block to content', () => {
    const result = injectSubagentSoulBlock('# Soul', '<!-- BEGIN -->\nblock\n<!-- END -->');
    expect(result).toBe('# Soul\n\n<!-- BEGIN -->\nblock\n<!-- END -->\n');
  });

  it('replaces existing block', () => {
    const content = [
      '# Soul',
      '',
      '<!-- HERMES_MANAGER_SUBAGENTS_V1_BEGIN -->',
      'old block',
      '<!-- HERMES_MANAGER_SUBAGENTS_V1_END -->',
    ].join('\n');
    const result = injectSubagentSoulBlock(content, 'new-block');
    expect(result).toContain('new-block');
    expect(result).not.toContain('old block');
  });

  it('returns stripped content for empty block', () => {
    const result = injectSubagentSoulBlock('# Soul', '');
    expect(result).toBe('# Soul');
  });
});

describe('validateDispatch', () => {
  const policy = { allowedAgents: ['target-a', 'target-b'], maxHop: 3 };

  it('accepts valid dispatch', () => {
    const result = validateDispatch('source', policy, {
      targetAgent: 'target-a',
      message: 'hello',
      dispatchPath: ['source'],
      hopCount: 0,
    });
    expect(result.valid).toBe(true);
  });

  it('rejects unlisted target', () => {
    const result = validateDispatch('source', policy, {
      targetAgent: 'unknown',
      message: 'hello',
      dispatchPath: [],
      hopCount: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not allowed');
  });

  it('rejects revisit', () => {
    const result = validateDispatch('source', policy, {
      targetAgent: 'target-a',
      message: 'hello',
      dispatchPath: ['source', 'target-a'],
      hopCount: 1,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('revisit');
  });

  it('rejects maxHop violation', () => {
    const result = validateDispatch('source', policy, {
      targetAgent: 'target-a',
      message: 'hello',
      dispatchPath: ['source'],
      hopCount: 3,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('maxHop');
  });
});

describe('findDependentAgentIds', () => {
  let agentsRoot: string;

  beforeEach(() => {
    agentsRoot = path.join(tmpDir, 'runtime', 'agents');
    fs.mkdirSync(agentsRoot, { recursive: true });
    mockRuntimePaths.agentsRoot = agentsRoot;
  });

  afterEach(() => {
    mockRuntimePaths.agentsRoot = '';
  });

  it('returns agents whose allowedAgents contains the target', async () => {
    const plannerHome = path.join(agentsRoot, 'planner01');
    const researchHome = path.join(agentsRoot, 'research01');
    const unrelatedHome = path.join(agentsRoot, 'unrelated01');
    fs.mkdirSync(plannerHome, { recursive: true });
    fs.mkdirSync(researchHome, { recursive: true });
    fs.mkdirSync(unrelatedHome, { recursive: true });

    await fsp.writeFile(
      path.join(plannerHome, 'delegation.json'),
      JSON.stringify({ allowedAgents: ['research01'], maxHop: 3 }),
    );
    await fsp.writeFile(
      path.join(researchHome, 'delegation.json'),
      JSON.stringify({ allowedAgents: [], maxHop: 3 }),
    );

    const result = await findDependentAgentIds('research01');
    expect(result).toEqual(['planner01']);
  });

  it('returns empty array when no agents depend on target', async () => {
    const agentHome = path.join(agentsRoot, 'solo01');
    fs.mkdirSync(agentHome, { recursive: true });
    await fsp.writeFile(
      path.join(agentHome, 'delegation.json'),
      JSON.stringify({ allowedAgents: ['other01'], maxHop: 3 }),
    );

    const result = await findDependentAgentIds('research01');
    expect(result).toEqual([]);
  });

  it('returns multiple dependents', async () => {
    for (const id of ['a', 'b', 'c']) {
      const home = path.join(agentsRoot, id);
      fs.mkdirSync(home, { recursive: true });
      await fsp.writeFile(
        path.join(home, 'delegation.json'),
        JSON.stringify({ allowedAgents: ['target01'], maxHop: 3 }),
      );
    }

    const result = await findDependentAgentIds('target01');
    expect(result.sort()).toEqual(['a', 'b', 'c']);
  });
});
