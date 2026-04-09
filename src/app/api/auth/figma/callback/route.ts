import { NextResponse } from "next/server";
import { updateProduct } from "@/lib/projects";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateB64 = searchParams.get("state");

  if (!code || !stateB64) {
    return NextResponse.redirect(new URL("/?error=figma_auth_failed", req.url));
  }

  let productId: string;
  try {
    const state = JSON.parse(Buffer.from(stateB64, "base64").toString());
    productId = state.productId;
  } catch {
    return NextResponse.redirect(new URL("/?error=figma_auth_failed", req.url));
  }

  const tokenRes = await fetch("https://api.figma.com/v1/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.FIGMA_CLIENT_ID!,
      client_secret: process.env.FIGMA_CLIENT_SECRET!,
      redirect_uri: process.env.FIGMA_REDIRECT_URI!,
      code,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();
  if (tokenData.error) {
    return NextResponse.redirect(
      new URL(`/products/${productId}/context?error=figma_token_failed`, req.url)
    );
  }

  await updateProduct(productId, {
    figma_access_token: tokenData.access_token,
    figma_refresh_token: tokenData.refresh_token,
    figma_token_expires_at: new Date(
      Date.now() + tokenData.expires_in * 1000
    ).toISOString(),
  });

  return NextResponse.redirect(
    new URL(`/products/${productId}/context?figma=connected`, req.url)
  );
}
