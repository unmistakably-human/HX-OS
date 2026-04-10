import { NextRequest } from "next/server";
import { getProduct, getFeature } from "@/lib/projects";
import { streamClaude } from "@/lib/claude";
import { getKnowledgeForContext } from "@/lib/knowledge";
import { buildProductContext, buildFeatureContext } from "@/lib/context-utils";
import type { Concept } from "@/lib/types";

const CHAT_SYSTEM = `You are a senior product designer at HumanX. You're discussing concept variations with the designer.

You have access to the full product context, discovery insights, feature brief, and generated concepts.

Rules:
- Be opinionated. If a designer's choice has a clear flaw, say so and suggest an alternative.
- When discussing specific concepts, reference them by name.
- If asked to refine a concept, describe the changes clearly — you cannot regenerate wireframes in chat.
- If the designer wants to select a concept, confirm the choice and note any hybrid elements.
- Keep responses concise — 2-4 paragraphs max unless asked for detail.
- Ask ONE question at a time when gathering context.`;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; fid: string }> }
) {
  const { id, fid } = await ctx.params;

  try {
    const { messages } = await req.json();
    const [product, feature] = await Promise.all([getProduct(id), getFeature(fid)]);

    // Concepts are stored in the feature JSONB
    const concepts: Concept[] = Array.isArray(feature.concepts) ? feature.concepts : [];

    // Use knowledge base with semantic search based on user's message
    const lastMsg = messages[messages.length - 1];
    const knowledge = await getKnowledgeForContext(id, {
      query: lastMsg?.content || feature.name,
      limit: 20,
    });

    // Build cached context combining product + feature + knowledge + concepts
    const cachedParts: string[] = [];
    cachedParts.push(buildProductContext(product));
    cachedParts.push(buildFeatureContext(feature));

    if (knowledge) {
      cachedParts.push("## Knowledge Base (key insights & research)\n" + knowledge);
    }

    if (concepts.length > 0) {
      const conceptLines: string[] = ["## Generated Concepts"];
      for (const c of concepts) {
        conceptLines.push(
          `\n### ${c.name} (Track ${c.track})`,
          `Core idea: ${c.coreIdea}`,
          `Principles: ${c.principles.join("; ")}`,
          `Pros: ${c.pros.join("; ")}`,
          `Cons: ${c.cons.join("; ")}`,
          `Delight: ${c.delightMoment}`
        );
      }

      if (feature.chosen_concept) {
        conceptLines.push(`\n## Selected Concept: ${feature.chosen_concept}`);
      }
      cachedParts.push(conceptLines.join("\n"));
    }

    const cachedContext = cachedParts.join("\n\n");

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      return Response.json({ error: "No user message" }, { status: 400 });
    }

    const stream = await streamClaude({
      system: CHAT_SYSTEM,
      userMessage: lastMessage.content,
      maxTokens: 4000,
      cachedContext,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const data = JSON.stringify({ text: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Stream error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`)
          );
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Chat error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Chat failed" },
      { status: 500 }
    );
  }
}
