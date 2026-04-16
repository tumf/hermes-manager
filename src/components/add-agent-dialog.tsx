'use client';

import { Plus } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useLocale } from '@/src/components/locale-provider';
import { Button } from '@/src/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';

export interface TemplateEntry {
  name: string;
  files: string[];
}

export interface McpTemplateEntry {
  name: string;
}

const NO_MCP_TEMPLATE_VALUE = '__none__';

interface AddAgentDialogProps {
  templates: TemplateEntry[];
  mcpTemplates?: McpTemplateEntry[];
  onOpen: () => void;
  onCreated: () => Promise<void>;
}

export function AddAgentDialog({
  templates,
  mcpTemplates = [],
  onOpen,
  onCreated,
}: AddAgentDialogProps) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [templateMemoryMd, setTemplateMemoryMd] = useState('default');
  const [templateUserMd, setTemplateUserMd] = useState('default');
  const [templateSoulMd, setTemplateSoulMd] = useState('default');
  const [templateConfigYaml, setTemplateConfigYaml] = useState('default');
  const [selectedMcpTemplate, setSelectedMcpTemplate] = useState<string>(NO_MCP_TEMPLATE_VALUE);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  const memoryMdTemplates = useMemo(
    () => templates.filter((template) => template.files.includes('memories/MEMORY.md')),
    [templates],
  );
  const userMdTemplates = useMemo(
    () => templates.filter((template) => template.files.includes('memories/USER.md')),
    [templates],
  );
  const soulMdTemplates = useMemo(
    () => templates.filter((template) => template.files.includes('SOUL.md')),
    [templates],
  );
  const configYamlTemplates = useMemo(
    () => templates.filter((template) => template.files.includes('config.yaml')),
    [templates],
  );

  function resetForm() {
    setTemplateMemoryMd('default');
    setTemplateUserMd('default');
    setTemplateSoulMd('default');
    setTemplateConfigYaml('default');
    setSelectedMcpTemplate(NO_MCP_TEMPLATE_VALUE);
    setName('');
    setDescription('');
    setTags('');
  }

  async function handleAdd() {
    setBusy(true);
    try {
      const selectedTemplates: Record<string, string> = {};
      if (templateMemoryMd !== 'default') selectedTemplates.memoryMd = templateMemoryMd;
      if (templateUserMd !== 'default') selectedTemplates.userMd = templateUserMd;
      if (templateSoulMd !== 'default') selectedTemplates.soulMd = templateSoulMd;
      if (templateConfigYaml !== 'default') selectedTemplates.configYaml = templateConfigYaml;

      const body: Record<string, unknown> = {};
      if (Object.keys(selectedTemplates).length > 0) body.templates = selectedTemplates;
      if (selectedMcpTemplate !== NO_MCP_TEMPLATE_VALUE) {
        body.mcpTemplate = selectedMcpTemplate;
      }

      const parsedTags = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      if (name.trim() || description.trim() || parsedTags.length > 0) {
        body.meta = { name: name.trim(), description: description.trim(), tags: parsedTags };
      }

      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(
          typeof data.error === 'string' ? data.error : t.dialogs.addAgent.failedToCreate,
        );
        return;
      }

      const created = await res.json();
      resetForm();
      setOpen(false);
      toast.success(t.dialogs.addAgent.created(created.agentId));
      await onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) onOpen();
      }}
    >
      <DialogTrigger asChild>
        <Button className="h-11 gap-2">
          <Plus className="size-4" />
          {t.agentsList.addAgent}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            void handleAdd();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.dialogs.addAgent.title}</DialogTitle>
            <DialogDescription>{t.dialogs.addAgent.description}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <LabeledInput
              id="agent-name"
              label={t.dialogs.addAgent.displayName}
              value={name}
              onChange={setName}
              placeholder={t.dialogs.addAgent.namePlaceholder}
            />
            <LabeledInput
              id="agent-description"
              label={t.dialogs.addAgent.descriptionField}
              value={description}
              onChange={setDescription}
              placeholder={t.dialogs.addAgent.descriptionPlaceholder}
            />
            <LabeledInput
              id="agent-tags"
              label={t.dialogs.addAgent.tagsField}
              value={tags}
              onChange={setTags}
              placeholder={t.dialogs.addAgent.tagsPlaceholder}
            />
            <TemplateSelect
              label={t.dialogs.addAgent.memoryMdTemplate}
              id="tpl-memory-md"
              value={templateMemoryMd}
              onValueChange={setTemplateMemoryMd}
              templates={memoryMdTemplates}
            />
            <TemplateSelect
              label={t.dialogs.addAgent.userMdTemplate}
              id="tpl-user-md"
              value={templateUserMd}
              onValueChange={setTemplateUserMd}
              templates={userMdTemplates}
            />
            <TemplateSelect
              label={t.dialogs.addAgent.soulMdTemplate}
              id="tpl-soul-md"
              value={templateSoulMd}
              onValueChange={setTemplateSoulMd}
              templates={soulMdTemplates}
            />
            <TemplateSelect
              label={t.dialogs.addAgent.configYamlTemplate}
              id="tpl-config-yaml"
              value={templateConfigYaml}
              onValueChange={setTemplateConfigYaml}
              templates={configYamlTemplates}
            />
            <McpTemplateSelect
              label={t.dialogs.addAgent.mcpTemplate}
              noneLabel={t.dialogs.addAgent.mcpTemplateNone}
              id="tpl-mcp"
              value={selectedMcpTemplate}
              onValueChange={setSelectedMcpTemplate}
              templates={mcpTemplates}
            />
          </div>
          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {t.dialogs.addAgent.cancel}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={busy}>
              {busy ? t.dialogs.addAgent.creating : t.dialogs.addAgent.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LabeledInput({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function TemplateSelect({
  label,
  id,
  value,
  onValueChange,
  templates,
}: {
  label: string;
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  templates: TemplateEntry[];
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="default" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">default</SelectItem>
          {templates
            .filter((template) => template.name !== 'default')
            .map((template) => (
              <SelectItem key={template.name} value={template.name}>
                {template.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function McpTemplateSelect({
  label,
  noneLabel,
  id,
  value,
  onValueChange,
  templates,
}: {
  label: string;
  noneLabel: string;
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  templates: McpTemplateEntry[];
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={noneLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_MCP_TEMPLATE_VALUE}>{noneLabel}</SelectItem>
          {templates.map((template) => (
            <SelectItem key={template.name} value={template.name}>
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
