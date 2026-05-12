"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Trash2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  listProjectMembers,
  inviteMembersByEmail,
  removeMember,
  type ProjectMember,
} from "@/lib/project-members";

interface Props {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVATAR_PALETTE = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-fuchsia-500",
  "bg-teal-500",
];

function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

// Global-role badge styling. The role comes from profiles.role and is the
// only thing that governs project capabilities under the simplified model.
const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  admin:        { label: "Admin",        cls: "bg-violet-100 text-violet-900" },
  product_lead: { label: "Product Lead", cls: "bg-emerald-100 text-emerald-900" },
  designer:     { label: "Designer",     cls: "bg-slate-100 text-slate-900" },
};

export function ShareProjectDialog({ projectId, open, onOpenChange }: Props) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [inviting, setInviting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "warn" | "error"; text: string } | null>(null);
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  async function refresh() {
    setLoading(true);
    try {
      const m = await listProjectMembers(projectId);
      setMembers(m);
    } catch (e) {
      setFeedback({ kind: "error", text: e instanceof Error ? e.message : "Failed to load members" });
    } finally {
      setLoading(false);
    }
  }
  refreshRef.current = refresh;

  useEffect(() => {
    if (open) {
      setFeedback(null);
      setEmailInput("");
      refreshRef.current();
    }
  }, [open, projectId]);

  async function handleInvite() {
    const emails = emailInput.split(",").map((s) => s.trim()).filter(Boolean);
    if (emails.length === 0) return;
    setInviting(true);
    setFeedback(null);
    try {
      const result = await inviteMembersByEmail(projectId, emails);
      const parts: string[] = [];
      if (result.invited.length > 0)        parts.push(`Added ${result.invited.length}`);
      if (result.alreadyMember.length > 0)  parts.push(`Already members: ${result.alreadyMember.join(", ")}`);
      if (result.notFound.length > 0)       parts.push(`No account: ${result.notFound.join(", ")}`);

      if (result.error) {
        setFeedback({ kind: "error", text: result.error });
      } else if (result.invited.length > 0) {
        setFeedback({ kind: "ok", text: parts.join(" · ") });
        setEmailInput("");
        await refresh();
      } else {
        setFeedback({ kind: "warn", text: parts.join(" · ") || "No one to invite" });
      }
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(userId: string) {
    try {
      await removeMember(projectId, userId);
      await refresh();
    } catch (e) {
      setFeedback({ kind: "error", text: e instanceof Error ? e.message : "Failed to remove" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[640px] sm:rounded-2xl">
        <DialogHeader className="space-y-1.5 px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Share this project
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            Invite teammates by email. They must already have an account — admins create accounts.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6">
          <div className="flex items-center gap-2">
            <Input
              placeholder="email@humanx.io, another@humanx.io"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleInvite();
                }
              }}
              disabled={inviting}
              className="h-11 flex-1 rounded-lg text-sm"
            />
            <Button
              onClick={handleInvite}
              disabled={inviting || emailInput.trim().length === 0}
              className="h-11 shrink-0 rounded-lg px-5"
            >
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
            </Button>
          </div>

          {feedback && (
            <p
              className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                feedback.kind === "ok"
                  ? "bg-green-50 text-green-700"
                  : feedback.kind === "warn"
                  ? "bg-amber-50 text-amber-800"
                  : "bg-red-50 text-red-700"
              }`}
              role="status"
            >
              {feedback.text}
            </p>
          )}
        </div>

        <div className="mt-6 border-t border-border bg-muted/20 px-6 py-4">
          <div className="mb-3 flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Who has access
            </Label>
            {!loading && members.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {members.length} {members.length === 1 ? "person" : "people"}
              </span>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto rounded-xl border border-border bg-card">
            {loading ? (
              <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading members…
              </div>
            ) : members.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No members yet — invite someone above.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {members.map((m) => {
                  const isCreator = m.role_in_project === "owner";
                  const badge = ROLE_BADGE[m.global_role] ?? { label: m.global_role, cls: "bg-slate-100 text-slate-900" };
                  return (
                    <li
                      key={m.user_id}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor(
                          m.email
                        )}`}
                      >
                        {(m.full_name || m.email).slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {m.full_name || m.email.split("@")[0]}
                          </span>
                          {isCreator && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                              <Crown className="h-3 w-3" /> Creator
                            </span>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                      </div>
                      <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                      {!isCreator && (
                        <button
                          type="button"
                          onClick={() => handleRemove(m.user_id)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label={`Remove ${m.email}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
