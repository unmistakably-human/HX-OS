import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import { SplashHider } from "@/components/splash-hider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HumanX Labs",
  description: "AI Design Workflow Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="stylesheet" href="/splash.css" />
      </head>
      <body className="min-h-full flex flex-col bg-surface-page">
        {/* Splash screen — renders instantly before JS loads */}
        <div id="hx-splash" className="hx-splash" role="status" aria-label="Loading Human X Labs">
          <div className="hx-splash__logo">
            <span className="hx-splash__word hx-splash__word--human">Human</span>
            <img
              className="hx-splash__x"
              src="/humanx-x.svg"
              alt="X"
              width="744"
              height="787"
            />
            <span className="hx-splash__word hx-splash__word--labs">Labs</span>
          </div>
          <div className="hx-splash__tag">loading workspace</div>
          <div className="hx-splash__bar"><div className="hx-splash__bar-fill"></div></div>
        </div>
        <Script src="/splash.js" strategy="beforeInteractive" />

        <TooltipProvider>{children}</TooltipProvider>
        <SplashHider />
      </body>
    </html>
  );
}
