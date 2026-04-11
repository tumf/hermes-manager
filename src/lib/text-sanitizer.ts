export const ZERO_WIDTH_SPACE = /\u200B/g;

export function stripZeroWidthSpace(content: string): string {
  return content.replace(ZERO_WIDTH_SPACE, '');
}
