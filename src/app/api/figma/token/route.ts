import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("hx_figma_reviewer")?.value;
  if (!cookie) {
    return NextResponse.json({ connected: false, token: null });
  }

  let data: { access_token: string; refresh_token: string; expires_at: string };
  try {
    data = JSON.parse(cookie);
  } catch {
    return NextResponse.json({ connected: false, token: null });
  }

  const expiresAt = new Date(data.expires_at).getTime();
  // Refresh if within 5 minutes of expiry
  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    try {
      const res = await fetch("https://api.figma.com/v1/oauth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.FIGMA_CLIENT_ID!,
          client_secret: process.env.FIGMA_CLIENT_SECRET!,
          refresh_token: data.refresh_token,
        }),
      });
      const refreshed = await res.json();
      if (refreshed.error) {
        // Token expired and refresh failed — clear cookie
        const resp = NextResponse.json({ connected: false, token: null });
        resp.cookies.delete("hx_figma_reviewer");
        return resp;
      }

      data.access_token = refreshed.access_token;
      data.refresh_token = refreshed.refresh_token || data.refresh_token;
      data.expires_at = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

      const resp = NextResponse.json({ connected: true, token: data.access_token });
      resp.cookies.set("hx_figma_reviewer", JSON.stringify(data), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
      return resp;
    } catch {
      return NextResponse.json({ connected: false, token: null });
    }
  }

  return NextResponse.json({ connected: true, token: data.access_token });
}
