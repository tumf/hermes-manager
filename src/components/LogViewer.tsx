'use client';

import { ArrowDown, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/src/components/ui/tabs';

const LOG_FILES = ['gateway.log', 'gateway.error.log', 'errors.log'] as const;

interface LogViewerProps {
  agentName: string;
}

export function LogViewer({ agentName }: LogViewerProps) {
  const [activeFile, setActiveFile] = useState<string>(LOG_FILES[0]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const preRef = useRef<HTMLPreElement>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/logs?agent=${encodeURIComponent(agentName)}&file=${encodeURIComponent(activeFile)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setContent(typeof data === 'string' ? data : (data.content ?? ''));
      } else {
        setContent('Failed to load logs.');
      }
    } catch {
      setContent('Failed to load logs.');
    } finally {
      setLoading(false);
    }
  }, [agentName, activeFile]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (autoScroll && preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [content, autoScroll]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">Logs</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant={autoScroll ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setAutoScroll(!autoScroll)}
            aria-label="Toggle auto-scroll"
          >
            <ArrowDown className="mr-1 h-3 w-3" />
            Auto-scroll
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
            aria-label="Refresh logs"
          >
            <RefreshCw className={`mr-1 h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeFile} onValueChange={setActiveFile}>
          <TabsList>
            {LOG_FILES.map((file) => (
              <TabsTrigger key={file} value={file} className="text-xs">
                {file}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <pre
          ref={preRef}
          className="max-h-96 overflow-y-scroll rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed"
        >
          {content || (loading ? 'Loading...' : 'No log content.')}
        </pre>
      </CardContent>
    </Card>
  );
}
