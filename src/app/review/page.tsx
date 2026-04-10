"use client";

import { useEffect, useRef } from "react";

export default function ReviewPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/reviewer.html")
      .then((r) => r.text())
      .then((html) => {
        const container = containerRef.current;
        if (!container) return;

        // Extract body content and styles
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Inject styles
        const styles = doc.querySelectorAll("style");
        styles.forEach((s) => {
          const style = document.createElement("style");
          style.textContent = s.textContent;
          document.head.appendChild(style);
        });

        // Inject Google Fonts link
        const links = doc.querySelectorAll('link[href*="fonts.googleapis"]');
        links.forEach((l) => {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = (l as HTMLLinkElement).href;
          document.head.appendChild(link);
        });

        // Set body content
        container.innerHTML = doc.body.innerHTML;

        // Execute scripts
        const scripts = doc.querySelectorAll("script");
        scripts.forEach((s) => {
          const script = document.createElement("script");
          script.textContent = s.textContent;
          container.appendChild(script);
        });
      });

    return () => {
      // Cleanup injected styles on unmount
      document.querySelectorAll("style").forEach((s) => {
        if (s.textContent?.includes("--hx-red")) s.remove();
      });
    };
  }, []);

  return <div ref={containerRef} className="fixed inset-0 z-50 overflow-hidden" />;
}
