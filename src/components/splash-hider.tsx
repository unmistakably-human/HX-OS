"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    hxSplash?: { hide: (opts?: { minDisplayMs?: number }) => void };
  }
}

/**
 * Client component that hides the splash screen after the app mounts.
 * Placed at the bottom of the root layout so it fires after children render.
 */
export function SplashHider() {
  useEffect(() => {
    window.hxSplash?.hide();
  }, []);

  return null;
}
