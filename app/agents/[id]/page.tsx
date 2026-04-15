'use client';

import {
  ChevronLeft,
  Clock,
  FileText,
  MessageCircle,
  Network,
  Plug,
  ScrollText,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AgentEnvTab } from '@/src/components/agent-env-tab';
import { FileEditor } from '@/src/components/agent-file-editor';
import { AgentLogViewer } from '@/src/components/agent-log-viewer';
import { AgentMcpTab } from '@/src/components/agent-mcp-tab';
import { AgentMemoryTab } from '@/src/components/agent-memory-tab';
import { AgentMetadataCard } from '@/src/components/agent-metadata-card';
import { AgentStatusHeader } from '@/src/components/agent-status-header';
import { ChatTab } from '@/src/components/chat-tab';
import { CronTab } from '@/src/components/cron-tab';
import { DelegationTab } from '@/src/components/delegation-tab';
import { useLocale } from '@/src/components/locale-provider';
import { McpTab } from '@/src/components/mcp-tab';
import { SkillsTab } from '@/src/components/skills-tab';
import { Badge } from '@/src/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { useAgentMeta } from '@/src/hooks/use-agent-meta';
import { useAgentStatus } from '@/src/hooks/use-agent-status';
import { cn } from '@/src/lib/utils';

interface AgentPageProps {
  params: Promise<{ id: string }>;
}

export default function AgentPage({ params }: AgentPageProps) {
  const { id: name } = use(params);
  const { t } = useLocale();

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
      return window.location.hash.slice(1) || 'metadata';
    }
    return 'metadata';
  });

  useEffect(() => {
    void Promise.all([fetchStatus(), fetchMeta()]);
  }, [fetchStatus, fetchMeta]);

  return (
    <div
      className={cn(
        'space-y-6',
        activeTab === 'chat' &&
          'flex min-h-[calc(100dvh-6rem)] flex-col space-y-4 overflow-hidden md:min-h-[calc(100dvh-4rem)]',
      )}
    >
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {t.agentDetail.backToAgents}
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
            {meta?.description?.trim() && (
              <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
            )}
            {meta?.tags?.length ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {meta.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[11px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              {t.agentDetail.hermesVersion}: {meta?.hermesVersion || '--'}
            </p>
            {meta?.home && (
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 font-mono text-[9px] text-muted-foreground/60 transition-colors hover:text-foreground"
                onClick={() => {
                  void navigator.clipboard.writeText(meta.home);
                  toast.success(t.agentDetail.copiedHome);
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
      </div>

      <Tabs
        className={cn(activeTab === 'chat' && 'flex min-h-0 flex-1 flex-col')}
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          window.history.replaceState(null, '', `#${v}`);
        }}
      >
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="metadata" className="gap-1.5">
            <Settings className="size-3.5" />
            <span className="hidden sm:inline">{t.agentDetail.tabs.metadata}</span>
          </TabsTrigger>
          <TabsTrigger value="memory" className="gap-1.5">
            <FileText className="size-3.5" />
            <span className="hidden sm:inline">{t.agentDetail.tabs.memory}</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5">
            <Settings className="size-3.5" />
            <span className="hidden sm:inline">{t.agentDetail.tabs.config}</span>
          </TabsTrigger>
          <TabsTrigger value="mcp" className="gap-1.5">
            <Plug className="size-3.5" />
            <span className="hidden sm:inline">{t.agentDetail.tabs.mcp}</span>
          </TabsTrigger>
          <TabsTrigger value="env" className="gap-1.5">
            <Settings className="size-3.5" />
            <span className="hidden sm:inline">{t.agentDetail.tabs.env}</span>
          </TabsTrigger>
          <TabsTrigger value="skills" className="gap-1.5">
            <Settings className="size-3.5" />
            <span className="hidden sm:inline">{t.agentDetail.tabs.skills}</span>
          </TabsTrigger>
          <TabsTrigger value="delegation" className="gap-1.5">
            <Network className="size-3.5" />
            <span className="hidden sm:inline">{t.agentDetail.tabs.delegation}</span>
          </TabsTrigger>
          <TabsTrigger value="cron" className="gap-1.5">
            <Clock className="size-3.5" />
            <span className="hidden sm:inline">{t.agentDetail.tabs.cron}</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-1.5">
            <MessageCircle className="size-3.5" />
            <span className="hidden sm:inline">{t.agentDetail.tabs.chat}</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <ScrollText className="size-3.5" />
            <span className="hidden sm:inline">{t.agentDetail.tabs.logs}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metadata">
          <AgentMetadataCard
            metaDraft={metaDraft}
            metaSaving={metaSaving}
            onMetaDraftChange={setMetaDraft}
            onSave={() => {
              void saveMeta();
            }}
          />
        </TabsContent>

        <TabsContent value="memory">
          <AgentMemoryTab name={name} />
        </TabsContent>

        <TabsContent value="config">
          <FileEditor name={name} filePath="config.yaml" label="config.yaml" />
        </TabsContent>

        <TabsContent value="mcp">
          <AgentMcpTab name={name} />
        </TabsContent>

        <TabsContent value="env">
          <AgentEnvTab name={name} />
        </TabsContent>

        <TabsContent value="skills">
          <SkillsTab name={name} />
        </TabsContent>

        <TabsContent value="delegation">
          <DelegationTab name={name} />
        </TabsContent>

        <TabsContent value="cron">
          <CronTab name={name} />
        </TabsContent>

        <TabsContent value="chat" className="mt-1 min-h-0 flex-1">
          <ChatTab name={name} />
        </TabsContent>

        <TabsContent value="logs">
          <AgentLogViewer name={name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
