export const RECALLSWISS_DEFAULT_BASE =
  'https://www.recallswiss.admin.ch/customer-access-backend/resources/recalls';

export interface RecallSwissEntry {
  id: number;
  headerDe?: string;
  headerFr?: string;
  headerIt?: string;
  descriptionDe?: string;
  descriptionFr?: string;
  descriptionIt?: string;
  metaDe?: string;
  image?: { urlDe?: string };
  marktaufsichtsbehoerde?: { kuerzelDe?: string; nameDe?: string };
}

interface RecallSwissApiResponse {
  entries: RecallSwissEntry[];
  pages: number;
}

async function fetchPage(baseUrl: string, page: number): Promise<RecallSwissApiResponse> {
  const res = await fetch(`${baseUrl}?page=${page}`);
  if (!res.ok) {
    throw new Error(`RecallSwiss API error: ${res.status} on page ${page}`);
  }
  return res.json() as Promise<RecallSwissApiResponse>;
}

async function fetchPagesWithConcurrency(
  baseUrl: string,
  totalPages: number,
  concurrency: number,
): Promise<RecallSwissEntry[]> {
  const entries: RecallSwissEntry[] = [];
  let next = 1;

  while (next < totalPages) {
    const batch = Array.from({ length: Math.min(concurrency, totalPages - next) }, (_, i) =>
      fetchPage(baseUrl, next + i),
    );
    next += batch.length;
    const results = await Promise.all(batch);
    for (const r of results) entries.push(...r.entries);
  }

  return entries;
}

export async function fetchAllRecalls(
  baseUrl: string = RECALLSWISS_DEFAULT_BASE,
): Promise<RecallSwissEntry[]> {
  const first = await fetchPage(baseUrl, 0);
  const all: RecallSwissEntry[] = [...first.entries];

  if (first.pages > 1) {
    const rest = await fetchPagesWithConcurrency(baseUrl, first.pages, 5);
    all.push(...rest);
  }

  const seen = new Set<number>();
  return all.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}
