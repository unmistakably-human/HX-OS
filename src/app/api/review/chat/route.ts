import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.HUMANX_ANTHROPIC_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: { message: "Anthropic API key not configured on server" } },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return NextResponse.json(err, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: { message: msg } },
      { status: 500 }
    );
  }
}
