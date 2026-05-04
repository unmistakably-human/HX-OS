import type Anthropic from "@anthropic-ai/sdk";

// File extensions any document-upload UX in the app should accept. Centralised
// so the dropzone copy and the backend stay in sync.
export const ACCEPTED_DOC_EXTS = [".txt", ".md", ".pdf", ".docx", ".doc"] as const;
export const ACCEPTED_DOC_ACCEPT = ACCEPTED_DOC_EXTS.join(",");
export const ACCEPTED_DOC_LABEL = "TXT, MD, PDF, DOCX";

/**
 * A document the user uploaded, ready to be sent to Anthropic. We hand PDFs
 * straight to Claude as a native `document` content block (no PDF library
 * needed); everything else is normalised to plain text so the system prompt
 * downstream can stay simple.
 */
export type DocPart =
  | { kind: "text"; text: string }
  | { kind: "pdf"; base64: string; mediaType: "application/pdf" };

export class UnsupportedDocError extends Error {
  constructor(filename: string) {
    super(`Unsupported document type: ${filename}. Allowed: ${ACCEPTED_DOC_LABEL}.`);
  }
}

/**
 * Read a server-side `File` (from a multipart/form-data upload) into a form
 * we can pass to Claude. PDFs go through Anthropic's native PDF support so
 * the model reads layout/structure directly. DOCX goes through `mammoth`.
 * Plain-text formats are read as-is.
 */
export async function extractDocPart(file: File): Promise<DocPart> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const buf = Buffer.from(await file.arrayBuffer());
    return { kind: "pdf", base64: buf.toString("base64"), mediaType: "application/pdf" };
  }
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
    const mammoth = await import("mammoth");
    const buf = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.extractRawText({ buffer: buf });
    return { kind: "text", text: (result.value || "").trim() };
  }
  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    return { kind: "text", text: (await file.text()).trim() };
  }
  throw new UnsupportedDocError(file.name);
}

/**
 * Build a single user-message ready to send to Anthropic. Combines the
 * document part with a system-style prompt so the system prompt itself
 * stays focused on the extraction task, not on file plumbing.
 */
export function userMessageWithDoc(part: DocPart, prompt: string): Anthropic.MessageParam {
  if (part.kind === "pdf") {
    return {
      role: "user",
      content: [
        { type: "document", source: { type: "base64", media_type: part.mediaType, data: part.base64 } },
        { type: "text", text: prompt },
      ],
    };
  }
  return { role: "user", content: `${prompt}\n\n${part.text}` };
}
