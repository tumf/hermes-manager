import { NextResponse } from 'next/server';

import { getSkillsRoot, walkSkillsTree } from '@/src/lib/skills';

export async function GET() {
  const root = getSkillsRoot();
  const tree = walkSkillsTree(root);
  return NextResponse.json({ tree });
}
