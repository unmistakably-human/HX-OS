import { NextResponse } from "next/server";

export async function GET() {
  const state = JSON.stringify({ source: "reviewer" });

  const authUrl = new URL("https://www.figma.com/oauth");
  authUrl.searchParams.set("client_id", process.env.FIGMA_CLIENT_ID!);
  authUrl.searchParams.set("redirect_uri", process.env.FIGMA_REDIRECT_URI!);
  authUrl.searchParams.set("scope", "file_content:read");
  authUrl.searchParams.set("state", Buffer.from(state).toString("base64"));
  authUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authUrl.toString());
}
