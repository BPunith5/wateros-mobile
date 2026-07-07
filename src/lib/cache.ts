const store = new Map<string, { data: unknown; ts: number }>();

const DEFAULT_TTL = 60_000; // 1 minute

export function getCached<T>(key: string, ttl = DEFAULT_TTL): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttl) { store.delete(key); return null; }
  return entry.data as T;
}

export function setCached(key: string, data: unknown) {
  store.set(key, { data, ts: Date.now() });
}

export function invalidate(key: string) {
  store.delete(key);
}

export function invalidatePrefix(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
