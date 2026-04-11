export function parseSseChunk(buffer: string): { events: string[]; rest: string } {
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
