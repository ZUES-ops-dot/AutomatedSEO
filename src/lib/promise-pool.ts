/**
 * Run async work with a fixed concurrency limit. Results align with input order (like Promise.allSettled).
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  if (items.length === 0) {
    return [];
  }
  const results = new Array<PromiseSettledResult<R>>(items.length);
  let nextIndex = 0;
  const pool = Math.min(Math.max(1, concurrency), items.length);

  async function worker() {
    while (true) {
      const i = nextIndex;
      nextIndex += 1;
      if (i >= items.length) {
        break;
      }
      try {
        const value = await fn(items[i]!, i);
        results[i] = { status: "fulfilled", value };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(Array.from({ length: pool }, () => worker()));
  return results;
}
