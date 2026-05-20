// Final step of the multi-call discovery flow. The client posts the
// merged v4 deck (after Acts 1–4 streamed) and we save it + fan out
// knowledge entries. Tiny endpoint — fits well inside any function
// timeout.

import { getProduct, saveDiscovery } from "@/lib/projects";
import { extractFromDiscoveryV4 } from "@/lib/knowledge";
import { isCompleteV4 } from "@/lib/discovery-acts";
import type { DiscoveryDeckV4 } from "@/lib/discovery-types";

export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    await getProduct(id);
  } catch {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  let deck: Partial<DiscoveryDeckV4>;
  try {
    const body = await request.json();
    deck = body?.deck as Partial<DiscoveryDeckV4>;
  } catch {
    return Response.json({ error: "Missing deck in request body" }, { status: 400 });
  }
  if (!deck || typeof deck !== "object") {
    return Response.json({ error: "Missing deck in request body" }, { status: 400 });
  }

  // Stamp the version so the renderer auto-selects DeckV4 on next load.
  deck.version = "v4";

  if (!isCompleteV4(deck)) {
    return Response.json(
      { error: "Deck is missing required v4 sections — cannot save." },
      { status: 400 },
    );
  }

  await saveDiscovery(id, deck);
  // Fire-and-forget knowledge extraction — same pattern as the v3 route.
  extractFromDiscoveryV4(id, deck as unknown as Record<string, unknown>).catch(console.error);

  return Response.json({ ok: true, deck });
}
