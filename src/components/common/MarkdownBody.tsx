"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownBody({ value, className = "" }: { value: string; className?: string }) {
  return (
    <div className={`markdown-body text-[var(--text-muted)] ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {value}
      </ReactMarkdown>
    </div>
  );
}
