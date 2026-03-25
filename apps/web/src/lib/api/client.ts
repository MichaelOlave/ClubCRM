export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  return fetch(url, {
    ...init,
    headers,
  });
}
