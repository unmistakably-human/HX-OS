import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const state = JSON.stringify({ productId });

  const authUrl = new URL("https://www.figma.com/oauth");
  authUrl.searchParams.set("client_id", process.env.FIGMA_CLIENT_ID!);
  authUrl.searchParams.set("redirect_uri", process.env.FIGMA_REDIRECT_URI!);
  authUrl.searchParams.set("scope", "file_content:read file_dev_resources:write");
  authUrl.searchParams.set("state", Buffer.from(state).toString("base64"));
  authUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authUrl.toString());
}
