'use client';

import { ChevronLeft, Clock, FileText, MessageCircle, ScrollText, Settings } from 'lucide-react';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AgentEnvTab } from '@/src/components/agent-env-tab';
import { FileEditor } from '@/src/components/agent-file-editor';
import { AgentLogViewer } from '@/src/components/agent-log-viewer';
import { AgentMemoryTab } from '@/src/components/agent-memory-tab';
import { AgentMetadataCard } from '@/src/components/agent-metadata-card';
import { AgentStatusHeader } from '@/src/components/agent-status-header';
import { ChatTab } from '@/src/components/chat-tab';
import { CronTab } from '@/src/components/cron-tab';
import { SkillsTab } from '@/src/components/skills-tab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { useAgentMeta } from '@/src/hooks/use-agent-meta';
import { useAgentStatus } from '@/src/hooks/use-agent-status';

interface AgentPageProps {
  params: Promise<{ id: string }>;
}

export default function AgentPage({ params }: AgentPageProps) {
  const { id: name } = use(params);

  const {
    status,
    loading: statusLoading,
    actionBusy,
    fetchStatus,
    handleStartStop,
  } = useAgentStatus(name);
  const { meta, metaDraft, metaSaving, setMetaDraft, fetchMeta, saveMeta } = useAgentMeta(name);

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      return window.location.hash.slice(1) || 'memory';
    }
    return 'memory';
  });

  useEffect(() => {
    void Promise.all([fetchStatus(), fetchMeta()]);
  }, [fetchStatus, fetchMeta]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Agents
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {meta?.name?.trim() ? (
                <>
                  {meta.name}{' '}
                  <span className="font-mono text-sm font-normal text-muted-foreground">
                    {name}
                  </span>
                </>
              ) : (
                <span className="font-mono">{name}</span>
              )}
            </h1>
            {status?.label && <p className="text-sm text-muted-foreground">{status.label}</p>}
            {meta?.home && (
              <button
                type="button"
                className="inline-flex items-center gap-1 font-mono text-[9px] text-muted-foreground/60 transition-colors hover:text-foreground"
                onClick={() => {
                  void navigator.clipboard.writeText(meta.home);
                  toast.success('Copied HERMES_HOME');
                }}
                title="Click to copy HERMES_HOME"
              >
                {meta.home}
              </button>
            )}
          </div>

          <AgentStatusHeader
            statusLoading={statusLoading}
            status={status}
            actionBusy={actionBusy}
            onAction={(action) => {
              void handleStartStop(action);
            }}
          />
        </div>

        <AgentMetadataCard
          metaDraft={metaDraft}
          metaSaving={metaSaving}
          onMetaDraftChange={setMetaDraft}
          onSave={() => {
            void saveMeta();
          }}
        />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          window.history.replaceState(null, '', `#${v}`);
        }}
      >
        <TabsList className="w-full justify-start">
          <TabsTrigger value="memory" className="gap-1.5">
            <FileText className="size-3.5" />
            <span className="hidden sm:inline">Memory</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5">
            <Settings className="size-3.5" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
          <TabsTrigger value="env" className="gap-1.5">
            <Settings className="size-3.5" />
            <span className="hidden sm:inline">Env</span>
          </TabsTrigger>
          <TabsTrigger value="skills" className="gap-1.5">
            <Settings className="size-3.5" />
            <span className="hidden sm:inline">Skills</span>
          </TabsTrigger>
          <TabsTrigger value="cron" className="gap-1.5">
            <Clock className="size-3.5" />
            <span className="hidden sm:inline">Cron</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-1.5">
            <MessageCircle className="size-3.5" />
            <span className="hidden sm:inline">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <ScrollText className="size-3.5" />
            <span className="hidden sm:inline">Logs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="memory">
          <AgentMemoryTab name={name} />
        </TabsContent>

        <TabsContent value="config">
          <FileEditor name={name} filePath="config.yaml" label="config.yaml" />
        </TabsContent>

        <TabsContent value="env">
          <AgentEnvTab name={name} />
        </TabsContent>

        <TabsContent value="skills">
          <SkillsTab name={name} />
        </TabsContent>

        <TabsContent value="cron">
          <CronTab name={name} />
        </TabsContent>

        <TabsContent value="chat">
          <ChatTab name={name} />
        </TabsContent>

        <TabsContent value="logs">
          <AgentLogViewer name={name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
