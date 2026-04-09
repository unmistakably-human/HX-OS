"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface MarkdownRendererProps {
  content: string;
}

function preprocessBadges(text: string): string {
  return text
    .replace(
      /\[VERIFY\]/g,
      '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-feedback-warning-bg text-feedback-warning-text border border-feedback-warning-border">VERIFY</span>'
    )
    .replace(
      /\[GENERATED\]/g,
      '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-feedback-info-bg text-feedback-info-text border border-feedback-info-border">GENERATED</span>'
    );
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-h2 font-bold text-content-heading mt-6 mb-3 pb-2 border-b border-divider">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-h3 font-bold text-content-heading mt-5 mb-2 pb-1.5 border-b border-divider-light">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-h3 font-semibold text-content-heading mt-4 mb-2">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-content-secondary mt-3 mb-1.5">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="text-sm text-content-secondary leading-relaxed mb-3">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="pl-5 mb-3 space-y-1 list-disc marker:text-content-muted">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="pl-5 mb-3 space-y-1 list-decimal marker:text-content-muted">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-sm text-content-secondary leading-relaxed">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-content-heading">{children}</strong>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4 rounded-[8px] border border-divider">
      <table className="w-full text-body-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-surface-subtle border-b border-divider">
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-content-secondary">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-content-secondary border-t border-divider-light">
      {children}
    </td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-feedback-info-border bg-feedback-info-bg rounded-r-md px-4 py-3 mb-3 text-body-sm text-feedback-info-text">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <pre className="bg-surface-tooltip text-content-on-dark rounded-[8px] p-4 mb-3 overflow-x-auto text-body-sm font-mono">
          <code>{children}</code>
        </pre>
      );
    }
    return (
      <code className="bg-surface-code text-content-secondary rounded px-1.5 py-0.5 text-body-sm font-mono">
        {children}
      </code>
    );
  },
  hr: () => <hr className="my-4 border-divider" />,
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const processed = preprocessBadges(content);
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        // Allow the VERIFY/GENERATED badge HTML through
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...({ allowDangerousHtml: true } as any)}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
