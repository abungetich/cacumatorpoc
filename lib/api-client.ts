export async function apiFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    const text = await response.text();
    const looksLikeHtml = /^\s*<!doctype html/i.test(text);
    const suffix = looksLikeHtml ? "Server returned HTML instead of JSON." : "Server returned a non-JSON response.";
    throw new Error(`Request failed (${response.status}): ${suffix}`);
  }

  let body: ({ message?: string } & T) | null = null;
  try {
    body = (await response.json()) as { message?: string } & T;
  } catch {
    throw new Error(`Request failed (${response.status}): Invalid JSON response.`);
  }

  if (!response.ok) {
    throw new Error(body?.message ?? `Request failed (${response.status})`);
  }

  return body as T;
}
