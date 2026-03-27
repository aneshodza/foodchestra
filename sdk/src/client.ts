export function makeHttpHelpers(baseUrl: string) {
  async function get<T>(path: string, options?: { cache?: RequestCache }): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, { cache: options?.cache });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`);
    return res.json() as Promise<T>;
  }

  async function post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`);
    return res.json() as Promise<T>;
  }

  return { get, post };
}
