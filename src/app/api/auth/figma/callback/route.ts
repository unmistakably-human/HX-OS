import { NextResponse } from "next/server";
import { updateProduct } from "@/lib/projects";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateB64 = searchParams.get("state");

  if (!code || !stateB64) {
    return NextResponse.redirect(new URL("/?error=figma_auth_failed", req.url));
  }

  let state: { productId?: string; featureId?: string; source?: string };
  try {
    state = JSON.parse(Buffer.from(stateB64, "base64").toString());
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

  // ── Reviewer standalone flow ──
  if (state.source === "reviewer") {
    if (tokenData.error) {
      return NextResponse.redirect(new URL("/review?error=figma_token_failed", req.url));
    }
    const cookieValue = JSON.stringify({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    });
    const res = NextResponse.redirect(new URL("/review?figma=connected", req.url));
    res.cookies.set("hx_figma_reviewer", cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
  }

  // ── Product-level flow (existing) ──
  const productId = state.productId!;
  const featureId = state.featureId || null;

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

  const redirectPath = featureId
    ? `/products/${productId}/features/${featureId}/concepts?figma=connected`
    : `/products/${productId}/context?figma=connected`;

  return NextResponse.redirect(new URL(redirectPath, req.url));
}
