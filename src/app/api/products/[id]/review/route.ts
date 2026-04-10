import { NextRequest } from "next/server";
import { getProduct, getFeature } from "@/lib/projects";
import { callClaude } from "@/lib/claude";
import { getKnowledgeForContext } from "@/lib/knowledge";
import type { ReviewResult, ReviewIssue, ReviewDimension } from "@/lib/types";

// ═══ Review type definitions ═══

type ReviewType =
  | "audit"
  | "ux"
  | "accessibility"
  | "copy"
  | "ideas"
  | "edge"
  | "quickds";

interface ReviewConfig {
  label: string;
  focus: string;
  dimensions: string[];
}

const REVIEW_CONFIGS: Record<ReviewType, ReviewConfig> = {
  audit: {
    label: "Visual Design Audit",
    focus:
      "Visual design quality: layout, typography, color usage, spacing, visual hierarchy, and brand consistency.",
    dimensions: [
      "Brand Compliance",
      "Visual Hierarchy",
      "Accessibility",
      "Consistency",
      "Delight",
    ],
  },
  ux: {
    label: "UX Review",
    focus:
      "User experience quality: task flows, cognitive load, information architecture, learnability, and error prevention.",
    dimensions: [
      "Task Efficiency",
      "Learnability",
      "Error Prevention",
      "Information Architecture",
      "Brand Alignment",
    ],
  },
  accessibility: {
    label: "Accessibility Review",
    focus:
      "WCAG 2.1 AA compliance: color contrast ratios, touch target sizes (minimum 44x44px), text readability, semantic structure, and inclusive design patterns.",
    dimensions: [
      "Color Contrast",
      "Touch Targets",
      "Readability",
      "Semantic Structure",
      "Inclusive Design",
    ],
  },
  copy: {
    label: "Copy & Microcopy Review",
    focus:
      "Microcopy quality: CTA effectiveness, error message clarity, label consistency, brand voice alignment, and scannability of text content.",
    dimensions: [
      "Clarity",
      "Tone",
      "CTA Effectiveness",
      "Error Text",
      "Scannability",
    ],
  },
  ideas: {
    label: "Innovation & Delight Review",
    focus:
      "Innovation potential: opportunities for delight moments, engagement hooks, memorable interactions, differentiation from competitors, and creative use of patterns.",
    dimensions: [
      "Innovation",
      "Engagement",
      "Memorability",
      "Delight",
      "Differentiation",
    ],
  },
  edge: {
    label: "Edge Cases Review",
    focus:
      "Edge case handling: empty states, error states, loading states, content extremes (very long/short text, missing images, zero-data), and consistency across states.",
    dimensions: [
      "Empty States",
      "Error Handling",
      "Loading",
      "Content Extremes",
      "Consistency",
    ],
  },
  quickds: {
    label: "Design System Compliance",
    focus:
      "Design system compliance ONLY: typography scale adherence, color token usage, logo usage guidelines, spacing grid consistency, and component library usage.",
    dimensions: [
      "Typography",
      "Color",
      "Logo Usage",
      "Spacing",
      "Components",
    ],
  },
};

// ═══ Prompt builders ═══

function buildSystemPrompt(reviewType: ReviewType): string {
  const config = REVIEW_CONFIGS[reviewType];

  return `You are a world-class ${config.label} expert at HumanX (HXOS), a design intelligence platform. You review product designs with the precision of a senior design director and the empathy of a user researcher.

REVIEW FOCUS: ${config.focus}

SCORING DIMENSIONS (score each out of 10):
${config.dimensions.map((d, i) => `${i + 1}. ${d}`).join("\n")}

You must respond in EXACTLY this format:

### Strengths
Five specific wins. Be precise and reference actual elements you see in the frames.

### Issues
Numbered (up to 10). Each issue MUST follow this exact format on a single line:
**[HIGH]** | problem description | why this matters for users | specific fix recommendation
or **[MEDIUM]** or **[LOW]** severity.

### Score
- **Overall**: X/10
- ${config.dimensions[0]}: X/10
- ${config.dimensions[1]}: X/10
- ${config.dimensions[2]}: X/10
- ${config.dimensions[3]}: X/10
- ${config.dimensions[4]}: X/10
One sentence summary of the design's current state.

### Redesign Ideas
2-3 actionable improvement ideas that go beyond fixing issues -- think bigger.

RULES:
- Be specific, not generic. Reference actual UI elements, colors, copy, or patterns you observe.
- Every issue needs a concrete fix, not just "improve this".
- Scores should be honest -- 7/10 is good, 5/10 is mediocre, 9/10 is exceptional.
- If reviewing multiple frames, compare consistency across them.
- Consider the product context and brand when scoring.`;
}

function buildUserContent(
  product: {
    enriched_pcd: string | null;
    product_context: Record<string, unknown> | null;
    name: string;
    company: string | null;
  },
  feature: {
    name: string;
    problem: string | null;
    must_have: string | null;
    not_be: string | null;
    additional_context: string | null;
  } | null,
  knowledgeContext: string,
  frames: { name: string; base64: string; width: number; height: number }[],
  reviewType: ReviewType
): Anthropic.MessageParam["content"] {
  const config = REVIEW_CONFIGS[reviewType];
  const contentArray: Anthropic.ContentBlockParam[] = [];

  // Brand & product context
  const contextParts: string[] = [];

  if (product.enriched_pcd) {
    contextParts.push(
      `## Product Context (Enriched PCD)\n${product.enriched_pcd.slice(0, 3000)}`
    );
  }

  const pc = product.product_context;
  if (pc) {
    const designParts: string[] = [];
    if (pc.colors) designParts.push(`Colors: ${pc.colors}`);
    if (pc.fonts) designParts.push(`Fonts: ${pc.fonts}`);
    if (pc.designTokens) {
      const tokens = pc.designTokens as {
        brandColors?: { name: string; hex: string }[];
        neutrals?: { name: string; hex: string }[];
        typography?: { level: string; font: string; size: string }[];
      };
      if (tokens.brandColors?.length) {
        designParts.push(
          `Brand Colors: ${tokens.brandColors.map((c) => `${c.name} ${c.hex}`).join(", ")}`
        );
      }
      if (tokens.neutrals?.length) {
        designParts.push(
          `Neutrals: ${tokens.neutrals.map((c) => `${c.name} ${c.hex}`).join(", ")}`
        );
      }
      if (tokens.typography?.length) {
        designParts.push(
          `Typography: ${tokens.typography.map((t) => `${t.level}: ${t.font} ${t.size}`).join(", ")}`
        );
      }
    }
    if (designParts.length) {
      contextParts.push(`## Design Tokens\n${designParts.join("\n")}`);
    }
  }

  if (knowledgeContext) {
    contextParts.push(`## Knowledge Base\n${knowledgeContext.slice(0, 2000)}`);
  }

  if (contextParts.length) {
    contentArray.push({
      type: "text",
      text: contextParts.join("\n\n"),
    });
  }

  // Feature context
  if (feature) {
    const featureParts = [
      `## Feature: ${feature.name}`,
      feature.problem && `Problem: ${feature.problem}`,
      feature.must_have && `Must have: ${feature.must_have}`,
      feature.not_be && `Must NOT be: ${feature.not_be}`,
      feature.additional_context &&
        `Design intent: ${feature.additional_context}`,
    ]
      .filter(Boolean)
      .join("\n");

    contentArray.push({ type: "text", text: featureParts });
  }

  // Frame images
  for (const frame of frames) {
    contentArray.push({
      type: "text",
      text: `--- Frame: "${frame.name}" (${frame.width}x${frame.height}) ---`,
    });
    contentArray.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: frame.base64,
      },
    });
  }

  // Review instruction
  contentArray.push({
    type: "text",
    text: `Now perform a ${config.label} of the ${frames.length} frame(s) above. Score each of the 5 dimensions (${config.dimensions.join(", ")}) out of 10 and provide an overall score. Be thorough and specific.`,
  });

  return contentArray;
}

// We need the Anthropic namespace for content block types
import type Anthropic from "@anthropic-ai/sdk";

// ═══ Response parser ═══

function parseReviewResponse(
  raw: string,
  reviewType: ReviewType
): Omit<ReviewResult, "raw" | "type" | "timestamp"> {
  const config = REVIEW_CONFIGS[reviewType];

  // Parse overall score
  const overallMatch = raw.match(/\*\*Overall\*\*:\s*(\d+(?:\.\d+)?)\s*\/\s*10/);
  const overallScore = overallMatch ? parseFloat(overallMatch[1]) : 5;

  // Parse dimension scores
  const dimensions: ReviewDimension[] = config.dimensions.map((dim) => {
    const escaped = dim.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const dimMatch = raw.match(
      new RegExp(`${escaped}:\\s*(\\d+(?:\\.\\d+)?)\\s*/\\s*10`)
    );
    return {
      name: dim,
      score: dimMatch ? parseFloat(dimMatch[1]) : 5,
    };
  });

  // Parse strengths
  const strengthsSection = raw.match(
    /###\s*(?:.*?)Strengths([\s\S]*?)(?=###|$)/i
  );
  const strengths: string[] = [];
  if (strengthsSection) {
    const lines = strengthsSection[1].trim().split("\n");
    for (const line of lines) {
      const cleaned = line.replace(/^[\s\-*\d.]+/, "").trim();
      if (cleaned.length > 5) strengths.push(cleaned);
    }
  }

  // Parse issues
  const issuesSection = raw.match(
    /###\s*(?:.*?)Issues([\s\S]*?)(?=###|$)/i
  );
  const issues: ReviewIssue[] = [];
  if (issuesSection) {
    const lines = issuesSection[1].trim().split("\n");
    for (const line of lines) {
      const severityMatch = line.match(
        /\*\*\[(HIGH|MEDIUM|LOW)\]\*\*/i
      );
      if (severityMatch) {
        const severity = severityMatch[1].toUpperCase() as
          | "HIGH"
          | "MEDIUM"
          | "LOW";
        // Split by | delimiter after severity
        const afterSeverity = line
          .slice(line.indexOf(severityMatch[0]) + severityMatch[0].length)
          .trim();
        const parts = afterSeverity
          .split("|")
          .map((p) => p.trim())
          .filter(Boolean);
        // Also handle the dot-separated format: problem . why . fix
        const dotParts =
          parts.length < 3
            ? afterSeverity
                .split(/\s*[.]\s*/)
                .map((p) => p.trim())
                .filter(Boolean)
            : parts;
        const finalParts = parts.length >= 3 ? parts : dotParts;

        issues.push({
          severity,
          problem: finalParts[0] || "Issue identified",
          why: finalParts[1] || "",
          fix: finalParts[2] || "",
        });
      }
    }
  }

  // Parse redesign ideas
  const ideasSection = raw.match(
    /###\s*(?:.*?)Redesign Ideas([\s\S]*?)(?=###|$)/i
  );
  const ideas: string[] = [];
  if (ideasSection) {
    const lines = ideasSection[1].trim().split("\n");
    for (const line of lines) {
      const cleaned = line.replace(/^[\s\-*\d.]+/, "").trim();
      if (cleaned.length > 5) ideas.push(cleaned);
    }
  }

  // Parse summary (the line after scores in the Score section)
  const scoreSection = raw.match(
    /###\s*(?:.*?)Score([\s\S]*?)(?=###|$)/i
  );
  let summary = "";
  if (scoreSection) {
    const lines = scoreSection[1].trim().split("\n");
    // Summary is typically the last non-empty line that doesn't contain a score
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line && !line.match(/^\s*-?\s*\*?\*?[\w\s]+\*?\*?:\s*\d/) && line.length > 10) {
        summary = line;
        break;
      }
    }
  }

  return {
    overallScore,
    summary,
    dimensions,
    strengths: strengths.slice(0, 10),
    issues: issues.slice(0, 10),
    ideas: ideas.slice(0, 5),
  };
}

// ═══ POST handler ═══

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await ctx.params;

  try {
    const body = await req.json();
    const {
      frames,
      reviewType,
      featureId,
    }: {
      frames: { name: string; base64: string; width: number; height: number }[];
      reviewType: string;
      featureId?: string;
    } = body;

    if (!frames?.length) {
      return Response.json(
        { error: "At least one frame is required" },
        { status: 400 }
      );
    }

    const validTypes: ReviewType[] = [
      "audit",
      "ux",
      "accessibility",
      "copy",
      "ideas",
      "edge",
      "quickds",
    ];
    const type = validTypes.includes(reviewType as ReviewType)
      ? (reviewType as ReviewType)
      : "audit";

    // Fetch product, optional feature, and knowledge in parallel
    const [product, feature, knowledgeContext] = await Promise.all([
      getProduct(productId),
      featureId ? getFeature(featureId).catch(() => null) : Promise.resolve(null),
      getKnowledgeForContext(productId, {
        query: "design review",
        limit: 10,
      }).catch(() => ""),
    ]);

    const systemPrompt = buildSystemPrompt(type);
    const userContent = buildUserContent(
      product as {
        enriched_pcd: string | null;
        product_context: Record<string, unknown> | null;
        name: string;
        company: string | null;
      },
      feature
        ? {
            name: feature.name,
            problem: feature.problem,
            must_have: feature.must_have,
            not_be: feature.not_be,
            additional_context: feature.additional_context,
          }
        : null,
      knowledgeContext,
      frames,
      type
    );

    const raw = await callClaude({
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
      maxTokens: 4000,
    });

    const parsed = parseReviewResponse(raw, type);

    const result: ReviewResult = {
      ...parsed,
      raw,
      type,
      timestamp: Date.now(),
    };

    return Response.json(result);
  } catch (err) {
    console.error("Design review error:", err);
    const message =
      err instanceof Error ? err.message : "Design review failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
