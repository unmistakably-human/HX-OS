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
      '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">VERIFY</span>'
    )
    .replace(
      /\[GENERATED\]/g,
      '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 border border-blue-200">GENERATED</span>'
    );
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-[#111827] mt-6 mb-3 pb-2 border-b border-[#e5e7eb]">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-bold text-[#111827] mt-5 mb-2 pb-1.5 border-b border-[#f3f4f6]">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[15px] font-semibold text-[#111827] mt-4 mb-2">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-[14px] font-semibold text-[#374151] mt-3 mb-1.5">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="text-[14px] text-[#374151] leading-relaxed mb-3">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="pl-5 mb-3 space-y-1 list-disc marker:text-[#9ca3af]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="pl-5 mb-3 space-y-1 list-decimal marker:text-[#9ca3af]">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-[14px] text-[#374151] leading-relaxed">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-[#111827]">{children}</strong>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4 rounded-lg border border-[#e5e7eb]">
      <table className="w-full text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[#f9fafb] border-b border-[#e5e7eb]">
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-[#374151]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-[#4b5563] border-t border-[#f3f4f6]">
      {children}
    </td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#93c5fd] bg-[#eff6ff] rounded-r-md px-4 py-3 mb-3 text-[13px] text-[#1d4ed8]">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <pre className="bg-[#1e1e1e] text-[#d4d4d4] rounded-lg p-4 mb-3 overflow-x-auto text-[13px]">
          <code>{children}</code>
        </pre>
      );
    }
    return (
      <code className="bg-[#f3f4f6] text-[#c2410c] rounded px-1.5 py-0.5 text-[13px]">
        {children}
      </code>
    );
  },
  hr: () => <hr className="my-4 border-[#e5e7eb]" />,
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
