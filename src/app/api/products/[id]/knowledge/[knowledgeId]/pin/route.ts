import { togglePin } from "@/lib/knowledge";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; knowledgeId: string }> }
) {
  const { knowledgeId } = await params;
  try {
    const isPinned = await togglePin(knowledgeId);
    return Response.json({ isPinned });
  } catch {
    return Response.json({ error: "Failed to toggle pin" }, { status: 500 });
  }
}
