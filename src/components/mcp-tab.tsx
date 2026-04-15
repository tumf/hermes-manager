'use client';

import { ExternalLink, Loader2, Save, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { CodeEditor } from '@/src/components/code-editor';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Skeleton } from '@/src/components/ui/skeleton';

interface McpTabProps {
  name: string;
}

export function McpTab({ name }: McpTabProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [docsUrl, setDocsUrl] = useState('');
  const originalRef = useRef('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/agents/${encodeURIComponent(name)}/mcp`);
        if (res.ok) {
          const data = await res.json();
          setContent(data.content ?? '');
          originalRef.current = data.content ?? '';
          if (data.docsUrl) setDocsUrl(data.docsUrl);
        }
      } catch {
        // noop
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [name]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(name)}/mcp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        originalRef.current = content;
        setDirty(false);
        toast.success('MCP configuration saved');
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(
          typeof data.error === 'string' ? data.error : 'Failed to save MCP configuration',
        );
      }
    } catch {
      toast.error('Failed to save MCP configuration');
    } finally {
      setSaving(false);
    }
  }, [name, content]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (!saving && dirty && !loading) {
          void save();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saving, dirty, loading, save]);

  function handleChange(val: string) {
    setContent(val);
    setDirty(val !== originalRef.current);
  }

  const lineCount = content.split('\n').length;
  const charCount = content.length;

  return (
    <Card className="flex h-[calc(100dvh-14rem)] flex-col">
      <CardHeader className="shrink-0 flex-row items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="font-mono text-xs">mcp_servers</CardTitle>
          {dirty && (
            <span className="text-[10px] text-orange-500" aria-live="polite">
              unsaved
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          {docsUrl && (
            <Button variant="ghost" size="sm" asChild className="gap-1.5">
              <a href={docsUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
                <span className="hidden sm:inline">Docs</span>
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void save()}
            disabled={saving || loading || !dirty}
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : dirty ? (
              <Save className="size-3.5" />
            ) : (
              <Undo2 className="size-3.5 text-muted-foreground" />
            )}
            <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col pt-2">
        <p className="mb-2 text-xs text-muted-foreground">
          Edit the <code className="rounded bg-muted px-1">mcp_servers</code> section of this
          agent&apos;s config. Changes are merged into{' '}
          <code className="rounded bg-muted px-1">config.yaml</code> on save.
        </p>
        {loading ? (
          <Skeleton className="w-full flex-1" />
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <CodeEditor
              value={content}
              onChange={handleChange}
              filePath="mcp_servers.yaml"
              className="min-h-0 w-full flex-1 overflow-hidden rounded-md border border-input"
              ariaLabel="Edit MCP servers configuration"
            />
            <div className="mt-1.5 flex items-center justify-end gap-3 text-[10px] text-muted-foreground/70">
              <span>{lineCount} lines</span>
              <span>{charCount.toLocaleString()} chars</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
