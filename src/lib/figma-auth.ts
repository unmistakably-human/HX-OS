import { updateProduct, getProduct } from "./projects";

export async function getValidFigmaToken(productId: string): Promise<string | null> {
  const product = await getProduct(productId);
  if (!product.figma_access_token) return null;

  if (product.figma_token_expires_at) {
    const expiresAt = new Date(product.figma_token_expires_at).getTime();
    // Refresh if within 5 minutes of expiry
    if (Date.now() > expiresAt - 5 * 60 * 1000) {
      return await refreshFigmaToken(productId, product.figma_refresh_token!);
    }
  }

  return product.figma_access_token;
}

async function refreshFigmaToken(
  productId: string,
  refreshToken: string
): Promise<string | null> {
  try {
    const res = await fetch("https://api.figma.com/v1/oauth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.FIGMA_CLIENT_ID!,
        client_secret: process.env.FIGMA_CLIENT_SECRET!,
        refresh_token: refreshToken,
      }),
    });

    const data = await res.json();
    if (data.error) return null;

    await updateProduct(productId, {
      figma_access_token: data.access_token,
      figma_refresh_token: data.refresh_token || refreshToken,
      figma_token_expires_at: new Date(
        Date.now() + data.expires_in * 1000
      ).toISOString(),
    });

    return data.access_token;
  } catch {
    return null;
  }
}
