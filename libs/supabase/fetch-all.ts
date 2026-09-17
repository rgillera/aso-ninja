// PostgREST caps every unranged .select() at supabase/config.toml's max_rows
// (1000) — silently truncating any table/result set that has grown past it.
// Use this instead of a bare .select() wherever the query has no LIMIT of
// its own, paging with .range() until a page comes back short.
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000
): Promise<{ data: T[]; error: { message: string } | null }> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) return { data: rows, error };
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return { data: rows, error: null };
}
