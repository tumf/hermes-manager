import { useRef, useState } from 'react';

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

const MEMORY_FILES = ['AGENTS.md', 'SOUL.md'] as const;

const FILE_DESCRIPTIONS: Record<string, string> = {
  'AGENTS.md': 'Defines agent behavior, instructions, and capabilities',
  'SOUL.md': "Contains the agent's personality, tone, and communication style",
};

interface AgentMemoryTabProps {
  name: string;
}

export function AgentMemoryTab({ name }: AgentMemoryTabProps) {
  const [selectedFile, setSelectedFile] = useState<string>(MEMORY_FILES[0]);
  const [pendingFile, setPendingFile] = useState<string | null>(null);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const editorRef = useRef<FileEditorHandle>(null);

  function handleSwitch(file: string) {
    if (file === selectedFile) return;
    if (editorRef.current?.isDirty()) {
      setPendingFile(file);
      setDiscardDialogOpen(true);
      return;
    }
    setSelectedFile(file);
  }

  function confirmDiscard() {
    setSelectedFile(pendingFile!);
    setPendingFile(null);
    setDiscardDialogOpen(false);
  }

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
              {file}
            </Button>
          ))}
        </div>
        {selectedFile && FILE_DESCRIPTIONS[selectedFile] && (
          <p className="text-xs text-muted-foreground">{FILE_DESCRIPTIONS[selectedFile]}</p>
        )}
      </div>

      <FileEditor
        key={selectedFile}
        ref={editorRef}
        name={name}
        filePath={selectedFile}
        label={selectedFile}
      />

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
