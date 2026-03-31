'use client';

import { CheckSquare, ChevronDown, ChevronRight, Loader2, Search, XSquare } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
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

function countEquippedInSubtree(
  node: SkillNode,
  equipped: Set<string>,
): { equipped: number; total: number } {
  let equippedCount = 0;
  let totalCount = 0;

  if (node.hasSkill) {
    totalCount = 1;
    if (equipped.has(node.relativePath)) equippedCount = 1;
  }

  for (const child of node.children) {
    const childCounts = countEquippedInSubtree(child, equipped);
    equippedCount += childCounts.equipped;
    totalCount += childCounts.total;
  }

  return { equipped: equippedCount, total: totalCount };
}

function filterTree(nodes: SkillNode[], query: string): SkillNode[] {
  if (!query.trim()) return nodes;

  const lowerQuery = query.toLowerCase();

  return nodes
    .map((node) => {
      const filteredChildren = filterTree(node.children, query);
      const matchesQuery = node.name.toLowerCase().includes(lowerQuery);
      const hasMatchingDescendant = filteredChildren.length > 0;

      if (matchesQuery || hasMatchingDescendant) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      return null;
    })
    .filter((node): node is SkillNode => node !== null)
    .filter(hasDescendantSkill);
}

export function SkillsTab({ name }: { name: string }) {
  const [tree, setTree] = useState<SkillNode[]>([]);
  const [equipped, setEquipped] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    const requestedCount = toAct.length;

    try {
      if (equip) {
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

      await reloadLinks();

      if (failed === 0) {
        const completedCount = equip ? succeeded : requestedCount;
        toast.success(
          `${equip ? 'Equipped' : 'Unequipped'} ${completedCount} skill${completedCount !== 1 ? 's' : ''}`,
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

  const allSkillPaths = useMemo(() => collectDescendantSkillPaths(tree), [tree]);
  const filteredTree = useMemo(() => filterTree(tree, searchQuery), [tree, searchQuery]);
  const equippedCount = useMemo(
    () => allSkillPaths.filter((p) => equipped.has(p)).length,
    [allSkillPaths, equipped],
  );

  return (
    <Card>
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CardTitle className="text-sm">Skills</CardTitle>
          {!loading && allSkillPaths.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {equippedCount} / {allSkillPaths.length} equipped
            </Badge>
          )}
        </div>
        {!loading && tree.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {bulkBusy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-40 pl-8 text-xs sm:w-48"
                aria-label="Filter skills"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleBulkAction(allSkillPaths, true)}
              disabled={bulkBusy || actioning.size > 0}
              className="h-8 gap-1.5 text-xs"
              aria-label="Select all skills"
            >
              <CheckSquare className="size-3.5" />
              <span className="hidden sm:inline">Select All</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleBulkAction(allSkillPaths, false)}
              disabled={bulkBusy || actioning.size > 0}
              className="h-8 gap-1.5 text-xs"
              aria-label="Clear all skills"
            >
              <XSquare className="size-3.5" />
              <span className="hidden sm:inline">Clear All</span>
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        ) : tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No skills available in ~/.agents/skills</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Add skills to get started with agent capabilities
            </p>
          </div>
        ) : filteredTree.length === 0 && searchQuery ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No skills match &ldquo;{searchQuery}&rdquo;
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="mt-2 text-xs"
            >
              Clear filter
            </Button>
          </div>
        ) : (
          <div className="overflow-y-auto" role="tree" aria-label="Skills tree">
            {filteredTree.filter(hasDescendantSkill).map((node) => (
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
  const [expanded, setExpanded] = useState(true);
  const canExpand = !node.hasSkill && node.children.length > 0;
  const visibleChildren = node.hasSkill ? [] : node.children.filter(hasDescendantSkill);
  const folderSkillPaths = canExpand ? collectDescendantSkillPaths(node.children) : [];
  const hasFolderSkills = folderSkillPaths.length > 0;
  const counts = canExpand ? countEquippedInSubtree(node, equipped) : null;

  const isPartiallyEquipped =
    counts !== null && counts.equipped > 0 && counts.equipped < counts.total;
  const isFullyEquipped = counts !== null && counts.equipped === counts.total && counts.total > 0;

  return (
    <div className="space-y-0.5">
      <div
        className="group flex items-center gap-1.5 py-1 pr-2"
        style={{ paddingLeft: `${depth * 1.25}rem` }}
        role={canExpand ? 'treeitem' : undefined}
        aria-expanded={canExpand ? expanded : undefined}
      >
        {canExpand ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex size-6 min-w-6 items-center justify-center rounded hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
          >
            {expanded ? (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="size-6" />
        )}

        {node.hasSkill ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Checkbox
              checked={equipped.has(node.relativePath)}
              onCheckedChange={(checked) => void onToggle(node.relativePath, checked === true)}
              disabled={actioning.has(node.relativePath) || bulkBusy}
              aria-label={`${node.name} skill`}
            />
            <Label
              htmlFor={node.relativePath}
              className="flex-1 cursor-pointer truncate text-sm"
              title={node.relativePath}
            >
              {node.name}
            </Label>
            {actioning.has(node.relativePath) && (
              <Loader2 className="size-3.5 flex-shrink-0 animate-spin text-muted-foreground" />
            )}
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
              {node.name}
            </span>
            {hasFolderSkills && counts && (
              <span className="ml-auto whitespace-nowrap text-[10px] text-muted-foreground/70">
                {counts.equipped}/{counts.total}
              </span>
            )}
            {hasFolderSkills && (
              <div className="ml-auto flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-1.5 text-[10px]"
                  onClick={() => void onBulkAction(folderSkillPaths, true)}
                  disabled={bulkBusy || actioning.size > 0}
                  aria-label={`Select all in ${node.name}`}
                >
                  <CheckSquare className="size-2.5" />
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-1.5 text-[10px]"
                  onClick={() => void onBulkAction(folderSkillPaths, false)}
                  disabled={bulkBusy || actioning.size > 0}
                  aria-label={`Clear all in ${node.name}`}
                >
                  <XSquare className="size-2.5" />
                  None
                </Button>
              </div>
            )}
            {isFullyEquipped && !isPartiallyEquipped && (
              <div className="ml-auto">
                <Badge variant="success" className="h-4 px-1.5 text-[10px]">
                  Equipped
                </Badge>
              </div>
            )}
          </div>
        )}
      </div>

      {expanded && visibleChildren.length > 0 && (
        <div role="group">
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
