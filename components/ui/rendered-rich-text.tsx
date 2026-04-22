"use client";

import { renderRichDocumentHtml } from "@/lib/rich-documents";
import { cn } from "@/lib/utils";

export function RenderedRichText({
  html,
  variables,
  className,
}: {
  html: string | null | undefined;
  variables?: Record<string, string | null | undefined>;
  className?: string;
}) {
  const rendered = renderRichDocumentHtml(html, variables ?? {});

  return <div className={cn("rich-document", className)} dangerouslySetInnerHTML={{ __html: rendered }} />;
}
