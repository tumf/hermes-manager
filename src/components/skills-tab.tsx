'use client';

import { CheckSquare, ChevronDown, ChevronRight, Loader2, XSquare } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Skeleton } from '@/src/components/ui/skeleton';

export interface SkillNode {
  name: string;
  relativePath: string;
  hasSkill: boolean;
  children: SkillNode[];
}

export interface EquippedLink {
  id: number;
  agent: string;
  sourcePath: string;
  targetPath: string;
  exists: boolean;
  relativePath: string;
}

/**
 * Collect all descendant skill relative paths from a list of tree nodes.
 * Recursively walks children; only includes nodes with hasSkill=true.
 */
export function collectDescendantSkillPaths(nodes: SkillNode[]): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    if (node.hasSkill) {
      paths.push(node.relativePath);
    }
    if (node.children.length > 0) {
      paths.push(...collectDescendantSkillPaths(node.children));
    }
  }
  return paths;
}

function hasDescendantSkill(node: SkillNode): boolean {
  if (node.hasSkill) return true;
  return node.children.some(hasDescendantSkill);
}

export function SkillsTab({ name }: { name: string }) {
  const [tree, setTree] = useState<SkillNode[]>([]);
  const [equipped, setEquipped] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const reloadLinks = useCallback(async () => {
    const linksRes = await fetch(`/api/skills/links?agent=${encodeURIComponent(name)}`);
    if (linksRes.ok) {
      const links = await linksRes.json();
      const equippedSet = new Set<string>(
        links
          .filter((link: EquippedLink) => link.exists)
          .map((link: EquippedLink) => link.relativePath),
      );
      setEquipped(equippedSet);
    }
  }, [name]);

  useEffect(() => {
    async function loadSkills() {
      try {
        const [treeRes, linksRes] = await Promise.all([
          fetch('/api/skills/tree'),
          fetch(`/api/skills/links?agent=${encodeURIComponent(name)}`),
        ]);

        if (treeRes.ok) {
          const data = await treeRes.json();
          setTree(data.tree || []);
        }

        if (linksRes.ok) {
          const links = await linksRes.json();
          const equippedSet = new Set<string>(
            links
              .filter((link: EquippedLink) => link.exists)
              .map((link: EquippedLink) => link.relativePath),
          );
          setEquipped(equippedSet);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    void loadSkills();
  }, [name]);

  async function handleToggle(relativePath: string, checked: boolean) {
    setActioning((s) => new Set([...s, relativePath]));

    try {
      if (checked) {
        const res = await fetch('/api/skills/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent: name, relativePath }),
        });

        if (res.ok) {
          setEquipped((s) => new Set([...s, relativePath]));
          toast.success(`Equipped ${relativePath}`);
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(typeof err.error === 'string' ? err.error : 'Failed to equip skill');
        }
      } else {
        const delRes = await fetch(
          `/api/skills/links?agent=${encodeURIComponent(name)}&path=${encodeURIComponent(relativePath)}`,
          { method: 'DELETE' },
        );

        if (delRes.ok) {
          setEquipped((s) => {
            const next = new Set(s);
            next.delete(relativePath);
            return next;
          });
          toast.success(`Unequipped ${relativePath}`);
        } else {
          const err = await delRes.json().catch(() => ({}));
          toast.error(typeof err.error === 'string' ? err.error : 'Failed to unequip skill');
        }
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActioning((s) => {
        const next = new Set(s);
        next.delete(relativePath);
        return next;
      });
    }
  }

  /**
   * Bulk equip/unequip skills for the given set of skill paths.
   * Skips no-op operations based on current equipped set.
   */
  async function handleBulkAction(skillPaths: string[], equip: boolean) {
    const linksRes = await fetch(`/api/skills/links?agent=${encodeURIComponent(name)}`);
    if (!linksRes.ok) {
      toast.error(`Failed to fetch links for bulk ${equip ? 'equip' : 'unequip'}`);
      return;
    }

    const links: EquippedLink[] = await linksRes.json();
    const equippedNow = new Set(
      links.filter((link) => link.exists).map((link) => link.relativePath),
    );
    const toAct = equip
      ? skillPaths.filter((p) => !equippedNow.has(p))
      : skillPaths.filter((p) => equippedNow.has(p));

    if (toAct.length === 0) {
      toast.success(equip ? 'All skills already equipped' : 'No skills to unequip');
      return;
    }

    setBulkBusy(true);
    setActioning((s) => new Set([...s, ...toAct]));

    let succeeded = 0;
    let failed = 0;

    try {
      if (equip) {
        // Equip: POST each skill
        const results = await Promise.allSettled(
          toAct.map(async (relativePath) => {
            const res = await fetch('/api/skills/links', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ agent: name, relativePath }),
            });
            if (!res.ok && res.status !== 409) {
              throw new Error(`Failed to equip ${relativePath}`);
            }
          }),
        );

        for (const r of results) {
          if (r.status === 'fulfilled') succeeded++;
          else failed++;
        }
      } else {
        const results = await Promise.allSettled(
          toAct.map(async (relativePath) => {
            const res = await fetch(
              `/api/skills/links?agent=${encodeURIComponent(name)}&path=${encodeURIComponent(relativePath)}`,
              { method: 'DELETE' },
            );
            if (!res.ok && res.status !== 404) {
              throw new Error(`Failed to unequip ${relativePath}`);
            }
          }),
        );

        for (const r of results) {
          if (r.status === 'fulfilled') succeeded++;
          else failed++;
        }
      }

      // Reload current equipped state after bulk action
      await reloadLinks();

      if (failed === 0) {
        toast.success(
          `${equip ? 'Equipped' : 'Unequipped'} ${succeeded} skill${succeeded !== 1 ? 's' : ''}`,
        );
      } else {
        toast.error(`${succeeded} succeeded, ${failed} failed`);
      }
    } catch {
      toast.error('Bulk action failed');
    } finally {
      setActioning((s) => {
        const next = new Set(s);
        for (const p of toAct) next.delete(p);
        return next;
      });
      setBulkBusy(false);
    }
  }

  const allSkillPaths = collectDescendantSkillPaths(tree);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="text-sm">Skills</CardTitle>
        {!loading && tree.length > 0 && (
          <div className="flex items-center gap-2">
            {bulkBusy && <Loader2 className="size-4 animate-spin" />}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleBulkAction(allSkillPaths, true)}
              disabled={bulkBusy || actioning.size > 0}
              className="gap-1.5"
              aria-label="Select all skills"
            >
              <CheckSquare className="size-3.5" />
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleBulkAction(allSkillPaths, false)}
              disabled={bulkBusy || actioning.size > 0}
              className="gap-1.5"
              aria-label="Clear all skills"
            >
              <XSquare className="size-3.5" />
              Clear All
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : tree.length === 0 ? (
          <p className="text-sm text-muted-foreground">No skills available in ~/.agents/skills</p>
        ) : (
          <div className="space-y-1">
            {tree.filter(hasDescendantSkill).map((node) => (
              <SkillTreeNode
                key={node.relativePath}
                node={node}
                equipped={equipped}
                actioning={actioning}
                onToggle={handleToggle}
                onBulkAction={handleBulkAction}
                bulkBusy={bulkBusy}
                depth={0}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SkillTreeNode({
  node,
  equipped,
  actioning,
  onToggle,
  onBulkAction,
  bulkBusy,
  depth,
}: {
  node: SkillNode;
  equipped: Set<string>;
  actioning: Set<string>;
  onToggle: (path: string, checked: boolean) => void;
  onBulkAction: (skillPaths: string[], equip: boolean) => void;
  bulkBusy: boolean;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  // スキルディレクトリは子フォルダを表示しない（再帰的に深掘りしない）
  // 非スキルディレクトリだけ展開可能
  const canExpand = !node.hasSkill && node.children.length > 0;
  const visibleChildren = node.hasSkill ? [] : node.children.filter(hasDescendantSkill);

  // Folder-level bulk: collect all descendant skill paths under this folder
  const folderSkillPaths = canExpand ? collectDescendantSkillPaths(node.children) : [];
  const hasFolderSkills = folderSkillPaths.length > 0;

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2 py-1" style={{ paddingLeft: `${depth * 1.5}rem` }}>
        {canExpand && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex size-5 items-center justify-center rounded hover:bg-muted"
          >
            {expanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
        )}

        {!canExpand && <div className="size-5" />}

        {node.hasSkill ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Checkbox
              checked={equipped.has(node.relativePath)}
              onCheckedChange={(checked) => void onToggle(node.relativePath, checked === true)}
              disabled={actioning.has(node.relativePath) || bulkBusy}
              className="mt-0.5"
            />
            <label className="flex-1 cursor-pointer select-none truncate text-sm font-medium">
              {node.name}
            </label>
            {actioning.has(node.relativePath) && (
              <Loader2 className="size-3 flex-shrink-0 animate-spin" />
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{node.name}</span>
            {hasFolderSkills && (
              <div className="ml-auto flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-1.5 text-xs"
                  onClick={() => void onBulkAction(folderSkillPaths, true)}
                  disabled={bulkBusy || actioning.size > 0}
                  aria-label={`Select all in ${node.name}`}
                >
                  <CheckSquare className="size-3" />
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-1.5 text-xs"
                  onClick={() => void onBulkAction(folderSkillPaths, false)}
                  disabled={bulkBusy || actioning.size > 0}
                  aria-label={`Clear all in ${node.name}`}
                >
                  <XSquare className="size-3" />
                  None
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {expanded && visibleChildren.length > 0 && (
        <div>
          {visibleChildren.map((child) => (
            <SkillTreeNode
              key={child.relativePath}
              node={child}
              equipped={equipped}
              actioning={actioning}
              onToggle={onToggle}
              onBulkAction={onBulkAction}
              bulkBusy={bulkBusy}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
