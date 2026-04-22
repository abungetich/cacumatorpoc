export const mentorConsentVariables = [
  { token: "{{mentor_name}}", label: "Mentor name", description: "Full mentor name" },
  { token: "{{mentor_email}}", label: "Mentor email", description: "Current mentor email" },
  { token: "{{signed_date}}", label: "Signed date", description: "Current recorded date" },
  { token: "{{platform_name}}", label: "Platform name", description: "Current platform branding name" },
  { token: "{{document_version}}", label: "Document version", description: "Consent version on file" },
] as const;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeRichTextSource(html: string | null | undefined) {
  if (typeof html !== "string") {
    return "";
  }

  const trimmed = html.trim();
  if (!trimmed) return "";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed;
  }

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function applyTemplateVariables(
  html: string | null | undefined,
  variables: Record<string, string | number | boolean | null | undefined>,
) {
  let output = normalizeRichTextSource(html);
  for (const [token, value] of Object.entries(variables)) {
    const normalizedValue =
      typeof value === "string" ? value.trim() : value === null || value === undefined ? "" : String(value);
    output = output.replace(new RegExp(escapeRegExp(token), "g"), normalizedValue);
  }
  return output;
}

export function sanitizeRichHtml(html: string | null | undefined) {
  const source = typeof html === "string" ? html : "";
  return html
    ? source
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<(iframe|object|embed|meta|link)[^>]*?>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(iframe|object|embed|meta|link)([^>]*)\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, ' $1="#"')
    : "";
}

export function renderRichDocumentHtml(
  html: string | null | undefined,
  variables: Record<string, string | number | boolean | null | undefined>,
) {
  return sanitizeRichHtml(applyTemplateVariables(html, variables));
}
