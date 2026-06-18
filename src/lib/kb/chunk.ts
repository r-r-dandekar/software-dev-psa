/**
 * Text chunking for embeddings — pure (no I/O). Groups paragraphs into chunks
 * up to a max size, hard-splitting any oversized paragraph. Unit-tested.
 */
export function chunkText(text: string, maxChars = 1200): string[] {
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    const t = current.trim();
    if (t) chunks.push(t);
    current = "";
  };

  for (const para of paras) {
    if (para.length > maxChars) {
      flush();
      for (let i = 0; i < para.length; i += maxChars) {
        chunks.push(para.slice(i, i + maxChars).trim());
      }
      continue;
    }
    if (current.length + para.length + 2 > maxChars) flush();
    current = current ? `${current}\n\n${para}` : para;
  }
  flush();

  return chunks;
}
