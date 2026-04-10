import Anthropic from "@anthropic-ai/sdk";

function getClient() {
  const key = process.env.HUMANX_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Set HUMANX_ANTHROPIC_KEY in .env.local");
  return new Anthropic({ apiKey: key });
}

export async function streamClaude({
  system,
  userMessage,
  useSearch = false,
  maxTokens = 8000,
  cachedContext,
}: {
  system: string;
  userMessage: string;
  useSearch?: boolean;
  maxTokens?: number;
  cachedContext?: string;
}) {
  const systemBlocks: Anthropic.TextBlockParam[] = [
    { type: "text", text: system, cache_control: { type: "ephemeral" } },
  ];
  if (cachedContext) {
    systemBlocks.push({
      type: "text",
      text: cachedContext,
      cache_control: { type: "ephemeral" },
    });
  }

  const params: Anthropic.MessageCreateParams = {
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system: systemBlocks,
    messages: [{ role: "user", content: userMessage }],
    stream: true,
  };

  if (useSearch) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (params as any).tools = [
      { type: "web_search_20250305", name: "web_search" },
    ];
  }

  return getClient().messages.stream(params);
}

export async function callClaude({
  system,
  messages,
  useSearch = false,
  maxTokens = 8000,
  model = "claude-sonnet-4-6",
  cachedContext,
}: {
  system: string;
  messages: Anthropic.MessageParam[];
  useSearch?: boolean;
  maxTokens?: number;
  model?: string;
  cachedContext?: string;
}) {
  const systemBlocks: Anthropic.TextBlockParam[] = [
    { type: "text", text: system, cache_control: { type: "ephemeral" } },
  ];
  if (cachedContext) {
    systemBlocks.push({
      type: "text",
      text: cachedContext,
      cache_control: { type: "ephemeral" },
    });
  }

  const params: Anthropic.MessageCreateParams = {
    model,
    max_tokens: maxTokens,
    system: systemBlocks,
    messages,
  };

  if (useSearch) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (params as any).tools = [
      { type: "web_search_20250305", name: "web_search" },
    ];
  }

  const response = await getClient().messages.create(params);
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}
