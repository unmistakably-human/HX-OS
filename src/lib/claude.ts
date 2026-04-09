import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function streamClaude({
  system,
  userMessage,
  useSearch = false,
  maxTokens = 8000,
}: {
  system: string;
  userMessage: string;
  useSearch?: boolean;
  maxTokens?: number;
}) {
  const params: Anthropic.MessageCreateParams = {
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system: [
      { type: "text", text: system, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userMessage }],
    stream: true,
  };

  if (useSearch) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (params as any).tools = [
      { type: "web_search_20250305", name: "web_search" },
    ];
  }

  return client.messages.stream(params);
}

export async function callClaude({
  system,
  messages,
  useSearch = false,
  maxTokens = 8000,
}: {
  system: string;
  messages: Anthropic.MessageParam[];
  useSearch?: boolean;
  maxTokens?: number;
}) {
  const params: Anthropic.MessageCreateParams = {
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system: [
      { type: "text", text: system, cache_control: { type: "ephemeral" } },
    ],
    messages,
  };

  if (useSearch) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (params as any).tools = [
      { type: "web_search_20250305", name: "web_search" },
    ];
  }

  const response = await client.messages.create(params);
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}
