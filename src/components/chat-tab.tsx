'use client';

import { Bot, MessageSquare, Terminal, Wrench } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Skeleton } from '@/src/components/ui/skeleton';
import { cn } from '@/src/lib/utils';

type Session = {
  id: string;
  source: string | null;
  title: string | null;
  started_at: string;
  message_count: number;
};

type Message = {
  session_id: string;
  role: string;
  content: string;
  timestamp: string;
  tool_name: string | null;
};

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
  const [sending, setSending] = useState(false);
  const [resumeSession, setResumeSession] = useState(true);

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
    void loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, sourceFilter]);

  useEffect(() => {
    if (selectedSessionId) {
      void loadMessages(selectedSessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId]);

  const sourceOptions = useMemo(() => ['all', 'tool', 'telegram', 'cli'], []);

  async function submitMessage() {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(name)}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          sessionId: resumeSession ? (selectedSessionId ?? undefined) : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'failed to send message');
      }
      setMessage('');
      await loadSessions();
      if (selectedSessionId) {
        await loadMessages(selectedSessionId);
      }
      toast.success('Message sent');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Chat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-h-[460px] space-y-2 overflow-y-auto rounded-md border p-3">
            {loadingMessages ? (
              <Skeleton className="h-20 w-full" />
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">メッセージがありません。</p>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={`${msg.timestamp}-${idx}`}
                  className={cn(
                    'max-w-[90%] rounded-lg px-3 py-2 text-sm',
                    msg.role === 'user' && 'ml-auto bg-primary text-primary-foreground',
                    msg.role === 'assistant' && 'bg-muted',
                    msg.role === 'tool' && 'border border-dashed bg-background',
                  )}
                >
                  <div className="mb-1 text-[11px] uppercase text-muted-foreground">{msg.role}</div>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <input
              id="resume-session"
              type="checkbox"
              checked={resumeSession}
              onChange={(e) => setResumeSession(e.target.checked)}
            />
            <label htmlFor="resume-session">選択セッションを再開する</label>
          </div>

          <div className="flex gap-2">
            <Input
              aria-label="Chat message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message"
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void submitMessage();
                }
              }}
            />
            <Button onClick={() => void submitMessage()} disabled={sending || !message.trim()}>
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
