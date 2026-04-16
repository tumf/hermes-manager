'use client';

import { ExternalLink, Loader2, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CodeEditor } from '@/src/components/code-editor';
import { useLocale } from '@/src/components/locale-provider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/src/components/ui/alert-dialog';
import { Button } from '@/src/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';

interface AgentMcpTabProps {
  name: string;
}

interface McpTemplateEntry {
  name: string;
}

const NO_TEMPLATE_VALUE = '__none__';

export function AgentMcpTab({ name }: AgentMcpTabProps) {
  const { t } = useLocale();
  const [content, setContent] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [docsUrl, setDocsUrl] = useState(
    'https://hermes-agent.nousresearch.com/docs/guides/use-mcp-with-hermes',
  );
  const [templates, setTemplates] = useState<McpTemplateEntry[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(NO_TEMPLATE_VALUE);
  const [applying, setApplying] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(false);

  const dirty = content !== original;
  const lineCount = content ? content.split('\n').length : 0;
  const charCount = content.length;
  const hasSelectedTemplate = selectedTemplate !== NO_TEMPLATE_VALUE;

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

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/mcp-templates');
      if (!res.ok) {
        throw new Error('Failed to load MCP templates');
      }
      const data = (await res.json()) as McpTemplateEntry[];
      setTemplates(data);
    } catch {
      toast.error(t.mcp.failedLoadTemplates);
    }
  }, [t.mcp.failedLoadTemplates]);

  useEffect(() => {
    void load();
    void loadTemplates();
  }, [load, loadTemplates]);

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

  async function handleApplyTemplate() {
    if (!hasSelectedTemplate) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/mcp-templates?name=${encodeURIComponent(selectedTemplate)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(typeof data.error === 'string' ? data.error : t.mcp.failedApplyTemplate);
        return;
      }
      const data = (await res.json()) as { content?: string };
      setContent(data.content ?? '');
      toast.success(t.mcp.templateApplied(selectedTemplate));
    } catch {
      toast.error(t.mcp.failedApplyTemplate);
    } finally {
      setApplying(false);
    }
  }

  async function handleSaveAsTemplate() {
    const trimmed = saveTemplateName.trim();
    if (!trimmed) return;
    setSavingTemplate(true);
    try {
      const existing = templates.some((template) => template.name === trimmed);
      const method = existing ? 'PUT' : 'POST';
      const res = await fetch('/api/mcp-templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(typeof data.error === 'string' ? data.error : t.mcp.failedSaveTemplate);
        return;
      }
      toast.success(t.mcp.templateSaved(trimmed));
      setSaveDialogOpen(false);
      setSaveTemplateName('');
      await loadTemplates();
      setSelectedTemplate(trimmed);
    } catch {
      toast.error(t.mcp.failedSaveTemplate);
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleDeleteTemplate() {
    if (!hasSelectedTemplate) return;
    setDeletingTemplate(true);
    try {
      const res = await fetch(`/api/mcp-templates?name=${encodeURIComponent(selectedTemplate)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(typeof data.error === 'string' ? data.error : t.mcp.failedDeleteTemplate);
        return;
      }
      toast.success(t.mcp.templateDeleted(selectedTemplate));
      setDeleteDialogOpen(false);
      setSelectedTemplate(NO_TEMPLATE_VALUE);
      await loadTemplates();
    } catch {
      toast.error(t.mcp.failedDeleteTemplate);
    } finally {
      setDeletingTemplate(false);
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {t.mcp.templatesSection}
          </span>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger aria-label={t.mcp.templatesSection} className="h-8 w-56 text-xs">
              <SelectValue placeholder={t.mcp.noTemplate} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_TEMPLATE_VALUE}>{t.mcp.noTemplate}</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.name} value={template.name}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => void handleApplyTemplate()}
            disabled={loading || !hasSelectedTemplate || applying}
          >
            {applying ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {t.mcp.applyTemplate}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              setSaveTemplateName(hasSelectedTemplate ? selectedTemplate : '');
              setSaveDialogOpen(true);
            }}
            disabled={loading}
          >
            {t.mcp.saveAsTemplate}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={loading || !hasSelectedTemplate}
          >
            <Trash2 className="size-3.5" />
            {t.mcp.deleteTemplate}
          </Button>
        </div>
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

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveAsTemplate();
            }}
          >
            <DialogHeader>
              <DialogTitle>{t.mcp.saveTemplateDialogTitle}</DialogTitle>
              <DialogDescription>{t.mcp.saveTemplateDialogDescription}</DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-2">
              <label htmlFor="mcp-template-name" className="text-sm font-medium">
                {t.mcp.templateNameLabel}
              </label>
              <Input
                id="mcp-template-name"
                value={saveTemplateName}
                onChange={(event) => setSaveTemplateName(event.target.value)}
                placeholder={t.mcp.templateNamePlaceholder}
                autoFocus
              />
            </div>
            <DialogFooter className="mt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {t.mcp.cancel}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={savingTemplate || !saveTemplateName.trim()}>
                {savingTemplate ? t.mcp.saving : t.mcp.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hasSelectedTemplate
                ? t.mcp.confirmDeleteTemplate(selectedTemplate)
                : t.mcp.deleteTemplate}
            </AlertDialogTitle>
            <AlertDialogDescription>{t.mcp.saveTemplateDialogDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingTemplate}>{t.mcp.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteTemplate();
              }}
              disabled={deletingTemplate}
            >
              {deletingTemplate ? t.mcp.saving : t.mcp.deleteTemplate}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
