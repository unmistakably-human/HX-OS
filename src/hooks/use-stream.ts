"use client";
import { useState, useCallback } from "react";

export function useStream() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const run = useCallback(async (url: string, body?: object) => {
    setText("");
    setLoading(true);
    setError(null);
    setDone(false);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) setText((prev) => prev + data.text);
            if (data.error) setError(data.error);
            if (data.done) setDone(true);
          } catch {
            // skip malformed SSE lines
          }
        }
      }
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  }, []);

  const reset = useCallback(() => {
    setText("");
    setLoading(false);
    setError(null);
    setDone(false);
  }, []);

  return { text, loading, error, done, run, reset };
}
