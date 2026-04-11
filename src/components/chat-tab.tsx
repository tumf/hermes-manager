'use client';

import { Bot, ChevronRight, Menu, MessageSquare, Plus, Terminal, Wrench, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

import { useLocale } from '@/src/components/locale-provider';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Textarea } from '@/src/components/ui/textarea';
import { cn } from '@/src/lib/utils';

type Session = {
  id: string;
  source: string | null;
  title: string | null;
  started_at: string;
  message_count: number;
};

type Message = {
  session_id?: string;
  role: string;
  content: string;
  timestamp?: string;
  tool_name?: string | null;
  optimistic?: boolean;
};

type ApiServerStatus = 'disabled' | 'configured-needs-restart' | 'starting' | 'connected' | 'error';

type AgentMeta = {
  agentId: string;
  apiServerStatus?: ApiServerStatus;
  apiServerStatusReason?: string;
  apiServerAvailable?: boolean;
  apiServerPort?: number | null;
};

type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error';

function sourceIcon(source: string | null) {
  if (source === 'telegram') return MessageSquare;
  if (source === 'cli') return Terminal;
  if (source === 'tool') return Wrench;
  return Bot;
}

export function ChatTab({ name }: { name: string }) {
  const { t } = useLocale();
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<ChatStatus>('ready');
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const [apiServerStatus, setApiServerStatus] = useState<ApiServerStatus>('disabled');
  const [apiServerStatusReason, setApiServerStatusReason] = useState<string | null>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [messagesViewportHeight, setMessagesViewportHeight] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const inputComposerRef = useRef<HTMLDivElement | null>(null);
  const [isMobileSessionsOpen, setIsMobileSessionsOpen] = useState(false);

  const [collapsedTools, setCollapsedTools] = useState<Set<number>>(new Set());

  const visibleMessages = useMemo(
    () => messages.filter((msg) => !(msg.role === 'assistant' && !msg.content.trim())),
    [messages],
  );
  function toggleToolCollapse(idx: number) {
    setCollapsedTools((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  async function loadAgentMeta() {
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error('failed to load agent meta');
      const data = (await res.json()) as AgentMeta;
      setApiServerStatusReason(data.apiServerStatusReason ?? null);
      if (data.apiServerStatus) {
        setApiServerStatus(data.apiServerStatus);
        return;
      }
      setApiServerStatus(data.apiServerAvailable === true ? 'connected' : 'disabled');
    } catch {
      setApiServerStatus('error');
      setApiServerStatusReason('failed to load agent metadata');
    }
  }

  async function loadSessions() {
    setLoadingSessions(true);
    try {
      const params = new URLSearchParams();
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      const res = await fetch(
        `/api/agents/${encodeURIComponent(name)}/sessions?${params.toString()}`,
      );
      if (!res.ok) throw new Error('failed to load sessions');
      const data: Session[] = await res.json();
      setSessions(data);
      if (data.length > 0 && !selectedSessionId) {
        setSelectedSessionId(data[0].id);
      }
      if (data.length === 0) {
        setSelectedSessionId(null);
        setMessages([]);
      }
    } catch {
      toast.error(t.chat.failedToLoadSessions);
    } finally {
      setLoadingSessions(false);
    }
  }

  async function loadMessages(sessionId: string) {
    setLoadingMessages(true);
    try {
      const res = await fetch(
        `/api/agents/${encodeURIComponent(name)}/sessions/${encodeURIComponent(sessionId)}/messages`,
      );
      if (!res.ok) throw new Error('failed to load messages');
      const data: Message[] = await res.json();
      setMessages(data);
    } catch {
      toast.error(t.chat.failedToLoadMessages);
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    void Promise.all([loadAgentMeta(), loadSessions()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, sourceFilter]);

  useEffect(() => {
    if (selectedSessionId) {
      void loadMessages(selectedSessionId);
      setIsMobileSessionsOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId]);

  useEffect(() => {
    if (!isAutoScrollEnabled) return;
    const node = scrollContainerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, isAutoScrollEnabled]);

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  useLayoutEffect(() => {
    function updateMessagesViewportHeight() {
      const grid = gridRef.current;
      const composer = inputComposerRef.current;
      if (!grid || !composer || typeof window === 'undefined') return;

      const gridRect = grid.getBoundingClientRect();
      const composerRect = composer.getBoundingClientRect();
      const available = Math.floor(composerRect.top - gridRect.top - 12);
      setMessagesViewportHeight(Math.max(160, available));
    }

    updateMessagesViewportHeight();
    window.addEventListener('resize', updateMessagesViewportHeight);
    return () => window.removeEventListener('resize', updateMessagesViewportHeight);
  }, [
    apiServerStatus,
    loadingMessages,
    loadingSessions,
    isMobileSessionsOpen,
    message,
    messages.length,
    selectedSessionId,
    sessions.length,
    status,
  ]);

  const sourceOptions = useMemo(() => ['all', 'tool', 'telegram', 'cli'], []);

  function parseSseChunk(buffer: string): { events: string[]; rest: string } {
    const events: string[] = [];
    const blocks = buffer.split('\n\n');
    const rest = blocks.pop() ?? '';

    for (const block of blocks) {
      const lines = block.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        events.push(line.slice(5).trim());
      }
    }

    return { events, rest };
  }

  async function submitMessage(messageToSend?: string) {
    const text = (messageToSend ?? message).trim();
    if (!text || status === 'submitted' || status === 'streaming') return;

    setStatus('submitted');
    setLastUserMessage(text);

    const optimisticUser: Message = {
      role: 'user',
      content: text,
      optimistic: true,
    };
    const optimisticAssistant: Message = {
      role: 'assistant',
      content: '',
      optimistic: true,
    };

    setMessages((prev) => [...prev, optimisticUser, optimisticAssistant]);
    if (!messageToSend) {
      setMessage('');
    }

    const abortController = new AbortController();
    streamAbortRef.current = abortController;

    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(name)}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
        signal: abortController.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'failed to send message');
      }

      setStatus('streaming');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseChunk(buffer);
        buffer = parsed.rest;

        for (const evt of parsed.events) {
          if (evt === '[DONE]') {
            setStatus('ready');
            await loadSessions();
            if (selectedSessionId) {
              await loadMessages(selectedSessionId);
            }
            return;
          }

          try {
            const json = JSON.parse(evt) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = json.choices?.[0]?.delta?.content ?? '';
            if (!delta) continue;

            setMessages((prev) => {
              if (prev.length === 0) return prev;
              const next = [...prev];
              const lastIndex = next.length - 1;
              const last = next[lastIndex];
              if (last.role !== 'assistant') return prev;
              next[lastIndex] = {
                ...last,
                content: `${last.content}${delta}`,
              };
              return next;
            });
          } catch {
            // ignore non-JSON SSE lines
          }
        }
      }

      setStatus('ready');
      await loadSessions();
      if (selectedSessionId) {
        await loadMessages(selectedSessionId);
      }
    } catch (e) {
      if (abortController.signal.aborted) {
        setStatus('ready');
        return;
      }
      setStatus('error');
      toast.error(e instanceof Error ? e.message : t.chat.failedToSendMessage);
    }
  }

  function stopStreaming() {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setStatus('ready');
  }

  const sessionsPanel = (
    <>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">{t.chat.sessions}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => {
                setSelectedSessionId(null);
                setMessages([]);
                setStatus('ready');
                setIsMobileSessionsOpen(false);
              }}
            >
              <Plus className="size-3" />
              {t.chat.newChat}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 md:hidden"
              onClick={() => setIsMobileSessionsOpen(false)}
              aria-label={t.chat.closeSessions}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
        <label className="text-xs text-muted-foreground">
          {t.chat.sourceFilter}
          <select
            aria-label={t.chat.sourceFilter}
            className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-sm"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            {sourceOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {loadingSessions ? (
          <>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.chat.noSessions}</p>
        ) : (
          sessions.map((session) => {
            const Icon = sourceIcon(session.source);
            return (
              <button
                key={session.id}
                type="button"
                className={cn(
                  'w-full rounded-md border p-2 text-left text-xs transition-colors hover:bg-muted',
                  selectedSessionId === session.id && 'border-primary bg-muted',
                )}
                onClick={() => setSelectedSessionId(session.id)}
              >
                <div className="flex items-center gap-2 font-medium">
                  <Icon className="size-3.5" />
                  <span>{session.source ?? 'unknown'}</span>
                </div>
                <div className="mt-1 line-clamp-1 text-muted-foreground">
                  {session.title || session.id}
                </div>
                <div className="mt-1 text-muted-foreground">
                  {new Date(session.started_at).toLocaleString()} · {session.message_count} msgs
                </div>
              </button>
            );
          })
        )}
      </CardContent>
    </>
  );

  return (
    <div
      ref={gridRef}
      data-testid="chat-tab-layout"
      className="grid h-full min-h-0 gap-4 md:grid-cols-[320px_1fr]"
    >
      <Card className="hidden flex-col overflow-hidden md:flex">{sessionsPanel}</Card>

      <Card className="flex min-h-0 flex-col overflow-hidden">
        <CardHeader className="shrink-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">{t.chat.chatTitle}</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 text-xs md:hidden"
              onClick={() => setIsMobileSessionsOpen(true)}
            >
              <Menu className="size-3.5" />
              {t.chat.sessions}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden">
          {apiServerStatus === 'disabled' ? (
            <div className="space-y-2 rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
              <p className="font-medium">{t.chat.disabled.title}</p>
              <ol className="list-inside list-decimal space-y-1 text-xs">
                <li>
                  {t.chat.disabled.step1.split('api_server')[0]}
                  <code className="rounded bg-muted px-1">api_server</code>
                  {t.chat.disabled.step1.split('api_server')[1]}
                </li>
                <li>
                  {t.chat.disabled.step2.split('hermes gateway restart')[0]}
                  <code className="rounded bg-muted px-1">hermes gateway restart</code>
                </li>
              </ol>
              <p className="text-xs">
                {t.chat.disabled.docsPrefix}
                <a
                  href="https://hermes-agent.nousresearch.com/docs/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {t.chat.disabled.docsLink}
                </a>
                {t.chat.disabled.docsSuffix}
              </p>
            </div>
          ) : apiServerStatus === 'configured-needs-restart' ? (
            <div className="space-y-2 rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
              <p className="font-medium">{t.chat.needsRestart.title}</p>
              <p className="text-xs">{t.chat.needsRestart.description}</p>
              <p className="text-xs">{t.chat.needsRestart.recommendation}</p>
            </div>
          ) : apiServerStatus === 'starting' ? (
            <div className="space-y-2 rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
              <p className="font-medium">{t.chat.starting.title}</p>
              <p className="text-xs">{t.chat.starting.description}</p>
            </div>
          ) : apiServerStatus === 'error' ? (
            <div className="space-y-2 rounded-md border bg-destructive/10 p-4 text-sm text-muted-foreground">
              <p className="font-medium">{t.chat.error.title}</p>
              {apiServerStatusReason && (
                <p className="text-xs">
                  {t.chat.error.reason}:{' '}
                  <code className="rounded bg-muted px-1">{apiServerStatusReason}</code>
                </p>
              )}
              <ol className="list-inside list-decimal space-y-1 text-xs">
                <li>{t.chat.error.step1}</li>
                <li>
                  <code className="rounded bg-muted px-1">hermes gateway restart</code>
                </li>
                <li>{t.chat.error.step3}</li>
              </ol>
            </div>
          ) : apiServerStatus === 'connected' ? (
            <>
              <div
                ref={scrollContainerRef}
                data-testid="chat-messages-scroll"
                className="flex-1 overflow-y-auto rounded-md border p-3"
                style={
                  messagesViewportHeight ? { height: `${messagesViewportHeight}px` } : undefined
                }
                onScroll={(e) => {
                  const node = e.currentTarget;
                  const threshold = 24;
                  const atBottom =
                    node.scrollHeight - node.scrollTop - node.clientHeight <= threshold;
                  setIsAutoScrollEnabled(atBottom);
                }}
              >
                <div className="space-y-2">
                  {loadingMessages ? (
                    <Skeleton className="h-20 w-full" />
                  ) : visibleMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {selectedSessionId ? t.chat.noMessages : t.chat.startConversation}
                    </p>
                  ) : (
                    visibleMessages.map((msg, idx) =>
                      msg.role === 'tool' ? (
                        <button
                          key={`${msg.timestamp ?? 'optimistic'}-${idx}`}
                          type="button"
                          className="flex w-full max-w-[90%] items-start gap-1.5 rounded border border-dashed bg-background px-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/50"
                          onClick={() => toggleToolCollapse(idx)}
                        >
                          <ChevronRight
                            className={cn(
                              'mt-0.5 size-3 shrink-0 transition-transform',
                              collapsedTools.has(idx) && 'rotate-90',
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-mono text-[11px]">{msg.tool_name ?? 'tool'}</span>
                            {collapsedTools.has(idx) && (
                              <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-tight">
                                {msg.content}
                              </pre>
                            )}
                          </div>
                        </button>
                      ) : (
                        <div
                          key={`${msg.timestamp ?? 'optimistic'}-${idx}`}
                          className={cn(
                            'max-w-[90%] rounded-lg px-3 py-2 text-sm',
                            msg.role === 'user' && 'ml-auto bg-primary text-primary-foreground',
                            msg.role === 'assistant' && 'bg-muted',
                          )}
                        >
                          <div className="mb-1 text-[11px] uppercase text-muted-foreground">
                            {msg.role}
                          </div>
                          {msg.role === 'assistant' ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          )}
                        </div>
                      ),
                    )
                  )}
                </div>
              </div>

              <div ref={inputComposerRef} className="shrink-0" data-testid="chat-input-composer">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Textarea
                    aria-label="Chat message"
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      e.currentTarget.style.height = 'auto';
                      e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 220)}px`;
                    }}
                    placeholder={t.chat.typeMessage}
                    disabled={status === 'submitted' || status === 'streaming'}
                    rows={1}
                    className="min-h-[44px] resize-none sm:flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void submitMessage();
                      }
                    }}
                  />
                  {status === 'streaming' ? (
                    <Button type="button" variant="destructive" onClick={stopStreaming}>
                      {t.chat.stop}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => void submitMessage()}
                      disabled={(status !== 'ready' && status !== 'error') || !message.trim()}
                    >
                      {status === 'submitted' ? t.chat.sending : t.chat.send}
                    </Button>
                  )}
                </div>

                {status === 'error' && (
                  <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs">
                    <span>{t.chat.sendFailed}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (lastUserMessage) {
                          void submitMessage(lastUserMessage);
                        }
                      }}
                      disabled={!lastUserMessage}
                    >
                      {t.chat.retry}
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {isMobileSessionsOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            aria-label={t.chat.closeSessions}
            onClick={() => setIsMobileSessionsOpen(false)}
          />
          <Card className="absolute inset-x-4 bottom-4 top-4 flex min-h-0 flex-col overflow-hidden">
            {sessionsPanel}
          </Card>
        </div>
      )}
    </div>
  );
}
