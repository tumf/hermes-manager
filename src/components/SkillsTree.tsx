'use client';

import { ChevronRight, Link2, Unlink } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/src/components/ui/collapsible';
import { cn } from '@/src/lib/utils';

interface SkillNode {
  name: string;
  path: string;
  children?: SkillNode[];
}

interface SkillLink {
  id: number;
  agent: string;
  sourcePath: string;
  targetPath: string;
}

interface SkillsTreeProps {
  agentName: string;
}

function TreeNode({
  node,
  linkedPaths,
  onLink,
}: {
  node: SkillNode;
  linkedPaths: Set<string>;
  onLink: (path: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isLinked = linkedPaths.has(node.path);

  if (hasChildren) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
          <ChevronRight
            className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-90')}
          />
          <span className="truncate">{node.name}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="ml-4 border-l pl-2">
          {node.children!.map((child) => (
            <TreeNode key={child.path} node={child} linkedPaths={linkedPaths} onLink={onLink} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent">
      <span className="truncate">{node.name}</span>
      {!isLinked && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => onLink(node.path)}
          aria-label={`Link ${node.name}`}
        >
          <Link2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export function SkillsTree({ agentName }: SkillsTreeProps) {
  const [tree, setTree] = useState<SkillNode[]>([]);
  const [links, setLinks] = useState<SkillLink[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [treeRes, linksRes] = await Promise.all([
        fetch('/api/skills/tree'),
        fetch(`/api/skills/links?agent=${encodeURIComponent(agentName)}`),
      ]);
      if (treeRes.ok) {
        const data = await treeRes.json();
        setTree(Array.isArray(data) ? data : (data.tree ?? []));
      }
      if (linksRes.ok) {
        setLinks(await linksRes.json());
      }
    } catch {
      // silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, [agentName]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const linkedPaths = new Set(links.map((l) => l.sourcePath));

  async function handleLink(sourcePath: string) {
    await fetch('/api/skills/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent: agentName, sourcePath }),
    });
    void fetchData();
  }

  async function handleUnlink(id: number) {
    await fetch(`/api/skills/links?id=${id}`, { method: 'DELETE' });
    void fetchData();
  }

  if (loading) {
    return <p className="py-4 text-sm text-muted-foreground">Loading skills...</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Available Skills</CardTitle>
        </CardHeader>
        <CardContent className="max-h-80 overflow-y-auto">
          {tree.length === 0 ? (
            <p className="text-sm text-muted-foreground">No skills found.</p>
          ) : (
            tree.map((node) => (
              <TreeNode key={node.path} node={node} linkedPaths={linkedPaths} onLink={handleLink} />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Linked Skills</CardTitle>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground">No skills linked.</p>
          ) : (
            <div className="space-y-1">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm"
                >
                  <span className="truncate">{link.sourcePath}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => handleUnlink(link.id)}
                    aria-label={`Unlink ${link.sourcePath}`}
                  >
                    <Unlink className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
