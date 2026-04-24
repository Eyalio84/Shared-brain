import fs from "node:fs";

type CacheEntry = { mtimeMs: number; value: unknown };

const cache = new Map<string, CacheEntry>();

/**
 * Parse a file and cache the result keyed by absolute path.
 * Re-parses only when the file's mtime changes. Missing files return the
 * parser's output for the empty string (lets callers express "no file = no data").
 *
 * Process-scoped (module-level Map). Survives across requests in the same
 * Next.js server process; reset when the dev server restarts or prod server
 * reloads.
 */
export function cachedFileParse<T>(filePath: string, parser: (content: string) => T): T {
  let mtimeMs = -1;
  if (fs.existsSync(filePath)) {
    mtimeMs = fs.statSync(filePath).mtimeMs;
  }
  const entry = cache.get(filePath);
  if (entry && entry.mtimeMs === mtimeMs) {
    return entry.value as T;
  }
  const content = mtimeMs >= 0 ? fs.readFileSync(filePath, "utf-8") : "";
  const value = parser(content);
  cache.set(filePath, { mtimeMs, value });
  return value;
}
