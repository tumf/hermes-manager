'use client';

import { Bot, MessageSquare, Terminal, Wrench } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

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

type AgentMeta = {
  agentId: string;
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
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<ChatStatus>('ready');
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const [apiServerAvailable, setApiServerAvailable] = useState<boolean | null>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  async function loadAgentMeta() {
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error('failed to load agent meta');
      const data = (await res.json()) as AgentMeta;
      setApiServerAvailable(data.apiServerAvailable === true);
    } catch {
      setApiServerAvailable(false);
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
      toast.error('Failed to load sessions');
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
      toast.error('Failed to load messages');
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
      toast.error(e instanceof Error ? e.message : 'Failed to send message');
    }
  }

  function stopStreaming() {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setStatus('ready');
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sessions</CardTitle>
          <label className="text-xs text-muted-foreground">
            Source filter
            <select
              aria-label="Source filter"
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
        <CardContent className="space-y-2">
          {loadingSessions ? (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              state.db が見つからないか、セッションがありません。
            </p>
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
      </Card>

      <Card className="flex min-h-[600px] flex-col">
        <CardHeader>
          <CardTitle className="text-sm">Chat</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col space-y-3">
          {apiServerAvailable === false ? (
            <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
              Chat を使うには api_server プラットフォームを有効にし、gateway を再起動してください
            </div>
          ) : (
            <>
              <div
                ref={scrollContainerRef}
                className="flex-1 space-y-2 overflow-y-auto rounded-md border p-3"
                onScroll={(e) => {
                  const node = e.currentTarget;
                  const threshold = 24;
                  const atBottom =
                    node.scrollHeight - node.scrollTop - node.clientHeight <= threshold;
                  setIsAutoScrollEnabled(atBottom);
                }}
              >
                {loadingMessages ? (
                  <Skeleton className="h-20 w-full" />
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">メッセージがありません。</p>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={`${msg.timestamp ?? 'optimistic'}-${idx}`}
                      className={cn(
                        'max-w-[90%] rounded-lg px-3 py-2 text-sm',
                        msg.role === 'user' && 'ml-auto bg-primary text-primary-foreground',
                        msg.role === 'assistant' && 'bg-muted',
                        msg.role === 'tool' && 'border border-dashed bg-background',
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
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <Textarea
                  aria-label="Chat message"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    e.currentTarget.style.height = 'auto';
                    e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 220)}px`;
                  }}
                  placeholder="Type a message"
                  disabled={status === 'submitted' || status === 'streaming'}
                  rows={1}
                  className="min-h-[44px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void submitMessage();
                    }
                  }}
                />
                {status === 'streaming' ? (
                  <Button type="button" variant="destructive" onClick={stopStreaming}>
                    Stop
                  </Button>
                ) : (
                  <Button
                    onClick={() => void submitMessage()}
                    disabled={(status !== 'ready' && status !== 'error') || !message.trim()}
                  >
                    {status === 'submitted' ? 'Sending...' : 'Send'}
                  </Button>
                )}
              </div>

              {status === 'error' && (
                <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs">
                  <span>送信に失敗しました。</span>
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
                    Retry
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
