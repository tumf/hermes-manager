import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { db, schema } from '@/src/lib/db';
import { ALLOWED_LOG_FILES, readLastNLines, resolveLogPath } from '@/src/lib/logs';
import { pollFileFromOffset } from '@/src/lib/logs-stream';

const StreamQuerySchema = z.object({
  agent: z.string().min(1),
  file: ALLOWED_LOG_FILES,
});

const POLL_INTERVAL_MS = 2000;
const KEEPALIVE_INTERVAL_MS = 15000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const result = StreamQuerySchema.safeParse({
    agent: searchParams.get('agent'),
    file: searchParams.get('file'),
  });

  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error.errors[0].message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { agent: agentName, file } = result.data;

  const [agent] = await db.select().from(schema.agents).where(eq(schema.agents.agentId, agentName));

  if (!agent) {
    return new Response(JSON.stringify({ error: 'agent not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const logPath = resolveLogPath(agent.home, file);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(data: string) {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }

      function keepalive() {
        controller.enqueue(encoder.encode(': keepalive\n\n'));
      }

      // Send last 50 lines on connect
      const { lines: initialLines, totalBytes: initialOffset } = await readLastNLines(logPath, 50);
      let offset = initialOffset;
      for (const line of initialLines) {
        send(line);
      }

      let lastKeepalive = Date.now();

      // Poll for new content
      const abortSignal = request.signal;
      while (!abortSignal.aborted) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

        if (abortSignal.aborted) break;

        try {
          const { chunk, newOffset } = await pollFileFromOffset(logPath, offset);
          if (chunk) {
            offset = newOffset;
            const newLines = chunk.split('\n');
            // Remove trailing empty string from final newline
            if (newLines[newLines.length - 1] === '') newLines.pop();
            for (const line of newLines) {
              send(line);
            }
          }

          const now = Date.now();
          if (now - lastKeepalive >= KEEPALIVE_INTERVAL_MS) {
            keepalive();
            lastKeepalive = now;
          }
        } catch {
          // File may be temporarily unavailable; continue polling
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
