/**
 * Pure helpers for the notification sweeps: page through large result sets
 * and chunk large `.in(...)` lookups, without ever silently dropping rows.
 */

export const PAGE_SIZE = 1000;
export const IN_CHUNK_SIZE = 100;

export function chunk<T>(arr: readonly T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunk size must be > 0");
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

/**
 * Fetch every page via `fetchPage(from, to)` (inclusive range, like
 * PostgREST `.range`). Stops on a short page. Returns `error` if any page
 * fails — callers must treat the result as incomplete.
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize: number = PAGE_SIZE,
): Promise<{ rows: T[]; error: { message: string } | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) return { rows, error };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return { rows, error: null };
  }
}

/**
 * Run `fetchChunk(ids)` for each chunk of at most `size` ids. A failing chunk
 * is reported in `failedIds` so the caller can skip those parents for this
 * run instead of acting without their data.
 */
export async function fetchInChunks<T>(
  ids: readonly string[],
  fetchChunk: (ids: string[]) => PromiseLike<PageResult<T>>,
  size: number = IN_CHUNK_SIZE,
): Promise<{ rows: T[]; failedIds: Set<string>; errors: string[] }> {
  const rows: T[] = [];
  const failedIds = new Set<string>();
  const errors: string[] = [];
  for (const c of chunk(ids, size)) {
    const { data, error } = await fetchChunk(c);
    if (error) {
      errors.push(error.message);
      for (const id of c) failedIds.add(id);
      continue;
    }
    rows.push(...(data ?? []));
  }
  return { rows, failedIds, errors };
}
