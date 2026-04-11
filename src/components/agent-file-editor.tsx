import { FileText, Loader2, Save, Undo2 } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { toast } from 'sonner';

import { CodeEditor, type CodeEditorHandle } from '@/src/components/code-editor';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { Skeleton } from '@/src/components/ui/skeleton';
import { cn } from '@/src/lib/utils';

const FILE_PATH_TO_TEMPLATE_FILE: Record<string, string> = {
  'SOUL.md': 'SOUL.md',
  'memories/MEMORY.md': 'memories/MEMORY.md',
  'memories/USER.md': 'memories/USER.md',
  'config.yaml': 'config.yaml',
};

export interface FileEditorHandle {
  isDirty: () => boolean;
  save: () => void;
  insertText: (text: string) => void;
}

interface FileEditorProps {
  name: string;
  filePath: string;
  label: string;
  savePath?: string;
  readOnly?: boolean;
  hideTemplateButton?: boolean;
  className?: string;
}

export const FileEditor = forwardRef<FileEditorHandle, FileEditorProps>(function FileEditor(
  { name, filePath, label, savePath, readOnly = false, hideTemplateButton = false, className },
  ref,
) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const originalRef = useRef('');
  const codeEditorRef = useRef<CodeEditorHandle>(null);

  const effectiveSavePath = savePath ?? filePath;

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: name, path: effectiveSavePath, content }),
      });
      if (res.ok) {
        originalRef.current = content;
        setDirty(false);
        toast.success(`${label} saved`);
      } else {
        toast.error(`Failed to save ${label}`);
      }
    } catch {
      toast.error(`Failed to save ${label}`);
    } finally {
      setSaving(false);
    }
  }, [name, content, effectiveSavePath, label]);

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => dirty,
      save,
      insertText: (text: string) => {
        codeEditorRef.current?.insertTextAtSelection(text);
      },
    }),
    [dirty, save],
  );

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/files?agent=${encodeURIComponent(name)}&path=${encodeURIComponent(filePath)}`,
        );
        if (res.ok) {
          const data = await res.json();
          const text = typeof data === 'string' ? data : (data.content ?? '');
          setContent(text);
          originalRef.current = text;
        }
      } catch {
        // noop
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [name, filePath]);

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

  async function saveAsTemplate() {
    const trimmed = templateName.trim();
    if (!trimmed) {
      toast.error('Template name is required');
      return;
    }

    const file = FILE_PATH_TO_TEMPLATE_FILE[filePath];
    if (!file) return;

    setSavingTemplate(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file, name: trimmed, content }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(typeof d.error === 'string' ? d.error : 'Failed to save template');
        return;
      }
      toast.success(`Saved as template "${trimmed}"`);
      setSaveAsTemplateOpen(false);
      setTemplateName('');
    } finally {
      setSavingTemplate(false);
    }
  }

  const lineCount = content.split('\n').length;
  const charCount = content.length;

  return (
    <Card className={cn('flex h-[calc(100dvh-14rem)] flex-col', className)}>
      <CardHeader className="shrink-0 flex-row items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="font-mono text-xs">{label}</CardTitle>
          {dirty && (
            <span className="text-[10px] text-orange-500" aria-live="polite">
              unsaved
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          {!hideTemplateButton && (
            <Dialog open={saveAsTemplateOpen} onOpenChange={setSaveAsTemplateOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={loading || readOnly}
                  className="gap-1.5"
                  onClick={() => setTemplateName('')}
                >
                  <FileText className="size-3.5" />
                  <span className="hidden sm:inline">Template</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <div className="flex min-h-0 flex-1 flex-col">
                  <DialogHeader>
                    <DialogTitle>Save as Template</DialogTitle>
                    <DialogDescription>
                      Save the current content of {label} as a reusable template.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                    <Input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="template-name"
                      aria-label="Template name"
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      onClick={() => void saveAsTemplate()}
                      disabled={savingTemplate || !templateName.trim()}
                    >
                      {savingTemplate ? 'Saving...' : 'Save'}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void save()}
            disabled={readOnly || saving || loading || !dirty}
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
        {loading ? (
          <Skeleton className="w-full flex-1" />
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <CodeEditor
              ref={codeEditorRef}
              value={content}
              onChange={handleChange}
              filePath={filePath}
              className="min-h-0 w-full flex-1 overflow-hidden rounded-md border border-input"
              ariaLabel={`Edit ${label}`}
              readOnly={readOnly}
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
});
