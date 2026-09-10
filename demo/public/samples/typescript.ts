type Result<T> = { ok: true; value: T } | { ok: false; error: string };

async function fetchJson<T>(url: string): Promise<Result<T>> {
  const res = await fetch(url);
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  return { ok: true, value: (await res.json()) as T };
}

const _r = await fetchJson<{ id: number }>("/api/user/42");
