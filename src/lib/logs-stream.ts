import fs from 'node:fs';

export async function pollFileFromOffset(
  filePath: string,
  startPos: number,
): Promise<{ chunk: string; newOffset: number } | { chunk: ''; newOffset: number }> {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > startPos) {
      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(stat.size - startPos);
      fs.readSync(fd, buf, 0, buf.length, startPos);
      fs.closeSync(fd);
      return { chunk: buf.toString('utf8'), newOffset: stat.size };
    }
    return { chunk: '', newOffset: startPos };
  } catch {
    return { chunk: '', newOffset: startPos };
  }
}
