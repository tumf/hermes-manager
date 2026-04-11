'use client';

import { Bot, ChevronRight, Menu, MessageSquare, Plus, Terminal, Wrench, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import { useLocale } from '@/src/components/locale-provider';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Textarea } from '@/src/components/ui/textarea';
import { useChatFlow } from '@/src/hooks/use-chat-flow';
import { cn } from '@/src/lib/utils';

function sourceIcon(source: string | null) {
  if (source === 'telegram') return MessageSquare;
  if (source === 'cli') return Terminal;
  if (source === 'tool') return Wrench;
  return Bot;
}

export function ChatTab({ name }: { name: string }) {
  const { t } = useLocale();
  const {
    sourceFilter,
    setSourceFilter,
    sessions,
    loadingSessions,
    selectedSessionId,
    setSelectedSessionId,
    visibleMessages,
    loadingMessages,
    message,
    setMessage,
    status,
    lastUserMessage,
    apiServerStatus,
    apiServerStatusReason,
    isAutoScrollEnabled,
    setIsAutoScrollEnabled,
    isMobileSessionsOpen,
    setIsMobileSessionsOpen,
    collapsedTools,
    sourceOptions,
    toggleToolCollapse,
    startNewChat,
    submitMessage,
    stopStreaming,
    messages,
  } = useChatFlow(name);

  const [messagesViewportHeight, setMessagesViewportHeight] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const inputComposerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isAutoScrollEnabled) return;
    const node = scrollContainerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, isAutoScrollEnabled]);

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
              onClick={startNewChat}
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
