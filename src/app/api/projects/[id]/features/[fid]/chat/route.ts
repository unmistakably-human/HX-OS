import { NextRequest } from "next/server";
import { getProject, getFeature } from "@/lib/projects";
import { streamClaude } from "@/lib/claude";
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
  ctx: RouteContext<"/api/projects/[id]/features/[fid]/chat">
) {
  const { id, fid } = await ctx.params;

  try {
    const { messages } = await req.json();
    const project = await getProject(id);
    const feature = await getFeature(id, fid);

    // Load concepts if they exist
    let concepts: Concept[] = [];
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const conceptsPath = path.join(
        process.cwd(),
        "data",
        "projects",
        id,
        `concepts-${fid}.json`
      );
      const raw = await fs.readFile(conceptsPath, "utf-8");
      concepts = JSON.parse(raw);
    } catch {
      // no concepts yet
    }

    // Build the full system prompt with context
    const contextParts = [
      CHAT_SYSTEM,
      "\n\n## Product Context",
      project.enrichedPcd || "No enriched PCD available.",
      "\n\n## Discovery Insights",
      project.discoveryInsights || "No discovery insights available.",
      `\n\n## Feature Brief`,
      `- Feature: ${feature.name}`,
      `- Type: ${feature.type}`,
      `- Problem: ${feature.problem}`,
      `- Must-haves: ${feature.mustHave}`,
      `- Not-be: ${feature.notBe || "None"}`,
    ];

    if (concepts.length > 0) {
      contextParts.push("\n\n## Generated Concepts");
      for (const c of concepts) {
        contextParts.push(
          `\n### ${c.name} (Track ${c.track})`,
          `Core idea: ${c.coreIdea}`,
          `Principles: ${c.principles.join("; ")}`,
          `Pros: ${c.pros.join("; ")}`,
          `Cons: ${c.cons.join("; ")}`,
          `Delight: ${c.delightMoment}`
        );
      }

      if (feature.chosenConcept) {
        contextParts.push(
          `\n\n## Selected Concept: ${feature.chosenConcept}`
        );
      }
    }

    const systemPrompt = contextParts.join("\n");

    // Build the user message from the last message
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      return Response.json({ error: "No user message" }, { status: 400 });
    }

    // Stream the response as SSE
    const stream = await streamClaude({
      system: systemPrompt,
      userMessage: lastMessage.content,
      maxTokens: 4000,
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
              controller.enqueue(
                encoder.encode(`data: ${data}\n\n`)
              );
            }
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
        } catch (err) {
          const errMsg =
            err instanceof Error ? err.message : "Stream error";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: errMsg })}\n\n`
            )
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
