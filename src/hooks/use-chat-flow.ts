'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useLocale } from '@/src/components/locale-provider';
import { parseSseChunk } from '@/src/lib/parse-sse-chunk';

type Session = {
  id: string;
  source: string | null;
  title: string | null;
  started_at: string;
  message_count: number;
};

export type SearchResult = {
  sessionId: string;
  source: string | null;
  title: string | null;
  messageCount: number;
  startedAt: string;
  match: {
    messageId: number;
    role: string;
    timestamp: string;
    snippet: string;
  };
};

export type Message = {
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

export type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error';

export function useChatFlow(name: string) {
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
  const [isMobileSessionsOpen, setIsMobileSessionsOpen] = useState(false);
  const [collapsedTools, setCollapsedTools] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  const selectedSessionIdRef = useRef(selectedSessionId);
  selectedSessionIdRef.current = selectedSessionId;

  const visibleMessages = useMemo(
    () => messages.filter((msg) => !(msg.role === 'assistant' && !msg.content.trim())),
    [messages],
  );

  const sourceOptions = useMemo(() => ['all', 'tool', 'telegram', 'cli'], []);

  const loadAgentMeta = useCallback(async () => {
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
  }, [name]);

  const loadSessions = useCallback(async () => {
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
      if (data.length > 0 && !selectedSessionIdRef.current) {
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
  }, [name, sourceFilter, t.chat.failedToLoadSessions]);

  const loadMessages = useCallback(
    async (sessionId: string) => {
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
    },
    [name, t.chat.failedToLoadMessages],
  );

  const toggleToolCollapse = useCallback((idx: number) => {
    setCollapsedTools((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const startNewChat = useCallback(() => {
    setSelectedSessionId(null);
    setMessages([]);
    setStatus('ready');
    setIsMobileSessionsOpen(false);
  }, []);

  const performSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

      if (query.trim().length < 2) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }

      setSearchLoading(true);
      searchDebounceRef.current = setTimeout(async () => {
        try {
          const params = new URLSearchParams({ q: query.trim() });
          if (sourceFilter !== 'all') params.set('source', sourceFilter);
          const res = await fetch(
            `/api/agents/${encodeURIComponent(name)}/sessions/search?${params.toString()}`,
          );
          if (!res.ok) throw new Error('search failed');
          const data: SearchResult[] = await res.json();
          setSearchResults(data);
        } catch {
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      }, 300);
    },
    [name, sourceFilter],
  );

  const clearSearch = useCallback(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setSearchQuery('');
    setSearchResults([]);
    setSearchLoading(false);
  }, []);

  const selectSearchResult = useCallback(
    (result: SearchResult) => {
      clearSearch();
      setSelectedSessionId(result.sessionId);
      setIsMobileSessionsOpen(false);
    },
    [clearSearch],
  );

  const submitMessage = useCallback(
    async (messageToSend?: string) => {
      const text = (messageToSend ?? message).trim();
      if (!text || status === 'submitted' || status === 'streaming') return;

      setStatus('submitted');
      setLastUserMessage(text);

      const optimisticUser: Message = { role: 'user', content: text, optimistic: true };
      const optimisticAssistant: Message = { role: 'assistant', content: '', optimistic: true };

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
              const sid = selectedSessionIdRef.current;
              if (sid) {
                await loadMessages(sid);
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
                next[lastIndex] = { ...last, content: `${last.content}${delta}` };
                return next;
              });
            } catch {
              // ignore non-JSON SSE lines
            }
          }
        }

        setStatus('ready');
        await loadSessions();
        const sid = selectedSessionIdRef.current;
        if (sid) {
          await loadMessages(sid);
        }
      } catch (e) {
        if (abortController.signal.aborted) {
          setStatus('ready');
          return;
        }
        setStatus('error');
        toast.error(e instanceof Error ? e.message : t.chat.failedToSendMessage);
      }
    },
    [message, status, name, loadSessions, loadMessages, t.chat.failedToSendMessage],
  );

  const stopStreaming = useCallback(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setStatus('ready');
  }, []);

  useEffect(() => {
    void Promise.all([loadAgentMeta(), loadSessions()]);
  }, [loadAgentMeta, loadSessions]);

  useEffect(() => {
    if (selectedSessionId) {
      void loadMessages(selectedSessionId);
      setIsMobileSessionsOpen(false);
    }
  }, [selectedSessionId, loadMessages]);

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  return {
    sourceFilter,
    setSourceFilter,
    sessions,
    loadingSessions,
    selectedSessionId,
    setSelectedSessionId,
    messages,
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
    searchQuery,
    searchResults,
    searchLoading,
    performSearch,
    clearSearch,
    selectSearchResult,
  };
}
