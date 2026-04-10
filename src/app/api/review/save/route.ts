import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { data, error } = await supabase.from("reviews").insert({
      project_name: body.project_name,
      project_brand: body.project_brand || null,
      flow_name: body.flow_name || null,
      review_type: body.review_type,
      overall_score: body.overall_score || null,
      summary: body.summary || null,
      dimensions: body.dimensions || null,
      strengths: body.strengths || null,
      issues: body.issues || null,
      ideas: body.ideas || null,
      raw_response: body.raw_response || null,
      frames_count: body.frames_count || 0,
    }).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");

  const { data, error } = await supabase
    .from("reviews")
    .select("id, project_name, project_brand, flow_name, review_type, overall_score, summary, frames_count, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reviews: data });
}
