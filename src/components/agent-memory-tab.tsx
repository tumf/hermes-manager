import { Plus, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { FileEditor, type FileEditorHandle } from '@/src/components/agent-file-editor';
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

const MEMORY_FILES = ['SOUL', 'memories/MEMORY.md', 'memories/USER.md'] as const;
type MemoryFile = (typeof MEMORY_FILES)[number];

const FILE_DESCRIPTIONS: Record<MemoryFile, string> = {
  SOUL: "Contains the agent's personality, tone, and communication style",
  'memories/MEMORY.md': 'Stores long-term memory and reusable context for this agent',
  'memories/USER.md': 'Captures user profile, preferences, and communication hints',
};

interface AgentMemoryTabProps {
  name: string;
}

interface PartialEntry {
  name: string;
  usedBy: string[];
}

export function AgentMemoryTab({ name }: AgentMemoryTabProps) {
  const [selectedFile, setSelectedFile] = useState<MemoryFile>(MEMORY_FILES[0]);
  const [pendingFile, setPendingFile] = useState<MemoryFile | null>(null);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [partialModeEnabled, setPartialModeEnabled] = useState(false);
  const [enablingPartials, setEnablingPartials] = useState(false);
  const [partials, setPartials] = useState<PartialEntry[]>([]);
  const [loadingPartials, setLoadingPartials] = useState(false);

  const editorRef = useRef<FileEditorHandle>(null);

  const soulFilePath = partialModeEnabled ? 'SOUL.src.md' : 'SOUL.md';
  const soulLabel = partialModeEnabled ? 'SOUL.src.md' : 'SOUL.md';

  const refreshAgentMode = useCallback(async () => {
    try {
      const response = await fetch(`/api/agents/${encodeURIComponent(name)}`);
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { partialModeEnabled?: boolean };
      setPartialModeEnabled(Boolean(payload.partialModeEnabled));
    } catch {
      // noop
    }
  }, [name]);

  async function loadPartials() {
    setLoadingPartials(true);
    try {
      const response = await fetch('/api/partials');
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as PartialEntry[];
      setPartials(payload);
    } finally {
      setLoadingPartials(false);
    }
  }

  function handleSwitch(file: MemoryFile) {
    if (file === selectedFile) return;
    if (editorRef.current?.isDirty()) {
      setPendingFile(file);
      setDiscardDialogOpen(true);
      return;
    }
    setSelectedFile(file);
  }

  function confirmDiscard() {
    if (pendingFile) {
      setSelectedFile(pendingFile);
    }
    setPendingFile(null);
    setDiscardDialogOpen(false);
  }

  async function enablePartialMode() {
    setEnablingPartials(true);
    try {
      const soulResponse = await fetch(
        `/api/files?agent=${encodeURIComponent(name)}&path=${encodeURIComponent('SOUL.md')}`,
      );
      if (!soulResponse.ok) {
        toast.error('Failed to read SOUL.md');
        return;
      }
      const soulPayload = (await soulResponse.json()) as { content?: string };

      const sourceWriteResponse = await fetch('/api/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: name,
          path: 'SOUL.src.md',
          content: soulPayload.content ?? '',
        }),
      });

      if (!sourceWriteResponse.ok) {
        const errorBody = (await sourceWriteResponse.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.error(errorBody.error ?? 'Failed to enable partial mode');
        return;
      }

      setPartialModeEnabled(true);
      setSelectedFile('SOUL');
      await loadPartials();
      toast.success('Partial mode enabled');
    } finally {
      setEnablingPartials(false);
    }
  }

  useEffect(() => {
    void refreshAgentMode();
  }, [refreshAgentMode]);

  useEffect(() => {
    if (partialModeEnabled) {
      void loadPartials();
    }
  }, [partialModeEnabled]);

  function insertPartialReference(partialName: string) {
    editorRef.current?.insertText(`\n{{partial:${partialName}}}\n`);
    toast.success(`Inserted partial: ${partialName}`);
  }

  const activeFilePath = selectedFile === 'SOUL' ? soulFilePath : selectedFile;
  const activeFileLabel = selectedFile === 'SOUL' ? soulLabel : selectedFile;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1">
          {MEMORY_FILES.map((file) => (
            <Button
              key={file}
              variant={selectedFile === file ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleSwitch(file)}
              className="relative"
              aria-pressed={selectedFile === file}
            >
              {editorRef.current?.isDirty() && selectedFile === file && (
                <span
                  className="absolute -right-1 -top-1 size-2 rounded-full bg-orange-400"
                  aria-hidden="true"
                />
              )}
              {file === 'SOUL' ? activeFileLabel : file}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{FILE_DESCRIPTIONS[selectedFile]}</p>
      </div>

      {selectedFile === 'SOUL' && !partialModeEnabled && (
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Enable shared partial mode</p>
              <p className="text-xs text-muted-foreground">
                Create SOUL.src.md from current SOUL.md and switch to source-based editing.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => void enablePartialMode()}
              disabled={enablingPartials}
              className="gap-1.5"
            >
              <Sparkles className="size-3.5" />
              {enablingPartials ? 'Enabling...' : 'Enable Partials'}
            </Button>
          </div>
        </div>
      )}

      {selectedFile === 'SOUL' && partialModeEnabled && (
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Insert shared partial</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void loadPartials()}
              disabled={loadingPartials}
            >
              Refresh
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {partials.length === 0 ? (
              <p className="text-xs text-muted-foreground">No partials available.</p>
            ) : (
              partials.map((partial) => (
                <Button
                  key={partial.name}
                  size="sm"
                  variant="secondary"
                  className="gap-1"
                  onClick={() => insertPartialReference(partial.name)}
                >
                  <Plus className="size-3" />
                  {partial.name}
                </Button>
              ))
            )}
          </div>
        </div>
      )}

      <FileEditor
        key={activeFilePath}
        ref={editorRef}
        name={name}
        filePath={activeFilePath}
        label={activeFileLabel}
      />

      {selectedFile === 'SOUL' && partialModeEnabled && (
        <FileEditor
          key="assembled-soul"
          name={name}
          filePath="SOUL.md"
          label="SOUL.md (assembled)"
          readOnly
          hideTemplateButton
        />
      )}

      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in the current file. Switching tabs will discard your
              changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingFile(null)}>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDiscard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
