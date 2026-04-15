'use client';

import { ExternalLink, Loader2, Save } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CodeEditor } from '@/src/components/code-editor';
import { useLocale } from '@/src/components/locale-provider';
import { Button } from '@/src/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';

interface AgentMcpTabProps {
  name: string;
}

export function AgentMcpTab({ name }: AgentMcpTabProps) {
  const { t } = useLocale();
  const [content, setContent] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [docsUrl, setDocsUrl] = useState(
    'https://hermes-agent.nousresearch.com/docs/guides/use-mcp-with-hermes',
  );

  const dirty = content !== original;
  const lineCount = content ? content.split('\n').length : 0;
  const charCount = content.length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(name)}/mcp`);
      if (!res.ok) {
        throw new Error('Failed to load MCP config');
      }
      const data = (await res.json()) as { content?: string; docsUrl?: string };
      const nextContent = data.content ?? '';
      setContent(nextContent);
      setOriginal(nextContent);
      if (data.docsUrl) {
        setDocsUrl(data.docsUrl);
      }
    } catch {
      toast.error(t.mcp.failedToLoad);
    } finally {
      setLoading(false);
    }
  }, [name, t.mcp.failedToLoad]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(name)}/mcp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(typeof data.error === 'string' ? data.error : t.mcp.failedToSave);
        return;
      }
      setOriginal(content);
      toast.success(t.mcp.saved);
    } catch {
      toast.error(t.mcp.failedToSave);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="flex h-[calc(100dvh-14rem)] flex-col">
      <CardHeader className="shrink-0 gap-3 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{t.mcp.title}</CardTitle>
            <CardDescription>{t.mcp.description}</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href={docsUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" />
              {t.mcp.docsLink}
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t.mcp.helper}</p>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {dirty ? t.mcp.unsaved : t.mcp.fragmentLabel}
          </span>
          <Button
            onClick={() => void handleSave()}
            disabled={loading || saving || !dirty}
            size="sm"
            className="gap-1.5"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            {saving ? t.mcp.saving : t.mcp.save}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col pt-2">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            {t.common.loading}
          </div>
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <CodeEditor
              value={content}
              onChange={setContent}
              filePath="mcp.yaml"
              className="min-h-0 w-full flex-1 overflow-hidden rounded-md border border-input"
              ariaLabel={t.mcp.editorAriaLabel}
            />
            <div className="mt-1.5 flex items-center justify-end gap-3 text-[10px] text-muted-foreground/70">
              <span>
                {lineCount} {t.templates.lines}
              </span>
              <span>
                {charCount.toLocaleString()} {t.templates.chars}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
