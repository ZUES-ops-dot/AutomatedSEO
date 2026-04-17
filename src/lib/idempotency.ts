type Entry = { status: number; body: unknown; storedAt: number };

const store = new Map<string, Entry>();
const TTL_MS = 86_400_000;

function prune() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.storedAt > TTL_MS) {
      store.delete(key);
    }
  }
}

export function takeIdempotentResponse(key: string | null | undefined): Entry | null {
  if (!key?.trim()) {
    return null;
  }
  prune();
  const entry = store.get(key.trim());
  if (!entry || Date.now() - entry.storedAt > TTL_MS) {
    return null;
  }
  return entry;
}

export function rememberIdempotentResponse(key: string | null | undefined, status: number, body: unknown) {
  if (!key?.trim()) {
    return;
  }
  prune();
  store.set(key.trim(), { status, body, storedAt: Date.now() });
}
