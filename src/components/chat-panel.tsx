"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import type { ChatMessage } from "@/lib/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (msg: string) => void;
  loading: boolean;
  placeholder?: string;
  actions?: ReactNode;
  streamingText?: string;
  suggestions?: string[];
}

export function ChatPanel({
  messages,
  onSend,
  loading,
  placeholder = "Type your message...",
  actions,
  streamingText,
  suggestions,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText, autoScroll]);

  // Detect manual scroll
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setAutoScroll(isAtBottom);
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setInput("");
    setAutoScroll(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef} onScrollCapture={handleScroll}>
        <div className="p-4 space-y-4">
          {/* Quick suggestion pills when chat is empty */}
          {messages.length === 0 && !streamingText && suggestions && suggestions.length > 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <p className="text-xs text-content-muted mb-1">Quick suggestions</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-[320px]">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => onSend(s)}
                    disabled={loading}
                    className="px-3 py-1.5 text-xs text-content-secondary bg-surface-subtle border border-divider rounded-full hover:bg-surface-card hover:text-content-heading hover:border-divider-card-hover transition-colors duration-fast"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`${
                msg.role === "user"
                  ? "bg-surface-card rounded-[8px] p-4"
                  : "border-l-2 border-divider pl-4 py-2"
              }`}
            >
              <div
                className={`text-overline font-medium mb-1.5 ${
                  msg.role === "user" ? "text-content-tertiary" : "text-content-primary"
                }`}
              >
                {msg.role === "user" ? "You" : "HumanX AI"}
              </div>
              <div className="text-body-sm leading-relaxed">
                {msg.role === "assistant" ? (
                  <MarkdownRenderer content={msg.content} />
                ) : (
                  <p className="text-content-primary whitespace-pre-wrap">
                    {msg.content}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Streaming text */}
          {streamingText && (
            <div className="border-l-2 border-divider pl-4 py-2">
              <div className="text-overline font-medium mb-1.5 text-content-primary">
                HumanX AI
              </div>
              <div className="text-body-sm leading-relaxed">
                <MarkdownRenderer content={streamingText} />
              </div>
            </div>
          )}

          {/* Thinking indicator */}
          {loading && !streamingText && (
            <div className="border-l-2 border-divider pl-4 py-2">
              <div className="text-overline font-medium mb-1.5 text-content-primary">
                HumanX AI
              </div>
              <div className="flex items-center gap-1 text-body-sm text-content-muted">
                Thinking
                <span className="animate-pulse">.</span>
                <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>.</span>
                <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>.</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t border-divider bg-surface-page-alt p-3">
        {actions && <div className="mb-2 flex gap-2">{actions}</div>}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[40px] max-h-[120px] resize-none bg-surface-card text-body-sm"
            rows={1}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-3 shrink-0"
          >
            <Send className="w-4 h-4" strokeWidth={1.5} />
          </Button>
        </div>
      </div>
    </div>
  );
}
