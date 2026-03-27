import fs from 'node:fs/promises';

/**
 * Reads new bytes from a file starting at the given byte offset.
 * Returns the new lines found and the updated offset.
 * If the file does not exist yet, returns empty chunk and offset 0.
 */
export async function pollFileFromOffset(
  filePath: string,
  offset: number,
): Promise<{ chunk: string; newOffset: number }> {
  let stat: { size: number };
  try {
    stat = await fs.stat(filePath);
  } catch {
    return { chunk: '', newOffset: offset };
  }

  const fileSize = stat.size;
  if (fileSize <= offset) {
    return { chunk: '', newOffset: offset };
  }

  const fileHandle = await fs.open(filePath, 'r');
  try {
    const readSize = fileSize - offset;
    const buf = Buffer.alloc(readSize);
    await fileHandle.read(buf, 0, readSize, offset);
    return { chunk: buf.toString('utf8'), newOffset: fileSize };
  } finally {
    await fileHandle.close();
  }
}
