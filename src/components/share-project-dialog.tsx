"use client";

import { useEffect, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  listProjectMembers,
  inviteMembersByEmail,
  removeMember,
  changeMemberRole,
  updatePhaseAccess,
  accessSummary,
  PHASE_LABELS,
  FULL_ACCESS,
  type ProjectMember,
  type ProjectRole,
  type PhaseAccess,
  type PhaseKey,
} from "@/lib/project-members";

interface Props {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_OPTIONS: { value: ProjectRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "lead", label: "Lead" },
  { value: "manager", label: "Manager" },
  { value: "designer", label: "Designer" },
];

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

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function ShareProjectDialog({ projectId, open, onOpenChange }: Props) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectRole>("designer");
  const [inviteAccess, setInviteAccess] = useState<PhaseAccess>(FULL_ACCESS);
  const [inviting, setInviting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "warn" | "error"; text: string } | null>(null);

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

  useEffect(() => {
    if (open) {
      setFeedback(null);
      setEmailInput("");
      setInviteAccess(FULL_ACCESS);
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  async function handleInvite() {
    const emails = emailInput.split(",").map((s) => s.trim()).filter(Boolean);
    if (emails.length === 0) return;
    setInviting(true);
    setFeedback(null);
    try {
      const result = await inviteMembersByEmail(projectId, emails, inviteRole, inviteAccess);
      const parts: string[] = [];
      if (result.invited.length > 0) parts.push(`Added ${result.invited.length}`);
      if (result.alreadyMember.length > 0) parts.push(`Already members: ${result.alreadyMember.join(", ")}`);
      if (result.notFound.length > 0) parts.push(`No account: ${result.notFound.join(", ")}`);

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

  async function handleRoleChange(userId: string, role: ProjectRole) {
    try {
      await changeMemberRole(projectId, userId, role);
      await refresh();
    } catch (e) {
      setFeedback({ kind: "error", text: e instanceof Error ? e.message : "Failed to update role" });
    }
  }

  async function handleToggleAccess(member: ProjectMember, key: PhaseKey, value: boolean) {
    if (member.role_in_project === "owner") return;
    const next: PhaseAccess = { ...member.phase_access, [key]: value };
    // Optimistic update so the tickbox feels instant
    setMembers((cur) =>
      cur.map((m) => (m.user_id === member.user_id ? { ...m, phase_access: next } : m))
    );
    try {
      await updatePhaseAccess(projectId, member.user_id, next);
    } catch (e) {
      setFeedback({ kind: "error", text: e instanceof Error ? e.message : "Failed to update access" });
      await refresh();
    }
  }

  const PHASE_ORDER: PhaseKey[] = ["context", "discovery", "features"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[640px] sm:rounded-2xl">
        <DialogHeader className="space-y-1.5 px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Share this project
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            Invite teammates by email. They must already have an account — admins can create one.
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
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as ProjectRole)}>
              <SelectTrigger className="!h-11 w-[124px] shrink-0 rounded-lg text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {ROLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleInvite}
              disabled={inviting || emailInput.trim().length === 0}
              className="h-11 shrink-0 rounded-lg px-5"
            >
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Access
            </span>
            {PHASE_ORDER.map((k) => (
              <label
                key={k}
                className="flex cursor-pointer items-center gap-2 select-none"
              >
                <Checkbox
                  checked={inviteAccess[k]}
                  onCheckedChange={(v) =>
                    setInviteAccess({ ...inviteAccess, [k]: !!v })
                  }
                />
                <span className="text-sm">{PHASE_LABELS[k]}</span>
              </label>
            ))}
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
                {members.map((m) => (
                  <li
                    key={m.user_id}
                    className="px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor(
                          m.email
                        )}`}
                      >
                        {(m.full_name || m.email).slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {m.full_name || m.email.split("@")[0]}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                      </div>
                      {m.role_in_project === "owner" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
                          <Crown className="h-3 w-3" /> Owner
                        </span>
                      ) : (
                        <Select
                          value={m.role_in_project}
                          onValueChange={(v) => handleRoleChange(m.user_id, v as ProjectRole)}
                        >
                          <SelectTrigger className="!h-9 w-[120px] rounded-lg text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.filter((o) => o.value !== "owner").map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {m.role_in_project !== "owner" && (
                        <button
                          type="button"
                          onClick={() => handleRemove(m.user_id)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label={`Remove ${m.email}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-12 text-xs">
                      {PHASE_ORDER.map((k) => {
                        const checked = m.role_in_project === "owner" ? true : m.phase_access[k];
                        const disabled = m.role_in_project === "owner";
                        return (
                          <label
                            key={k}
                            className={`flex items-center gap-1.5 ${
                              disabled ? "opacity-60" : "cursor-pointer"
                            }`}
                          >
                            <Checkbox
                              checked={checked}
                              disabled={disabled}
                              onCheckedChange={(v) => handleToggleAccess(m, k, !!v)}
                            />
                            <span>{PHASE_LABELS[k]}</span>
                          </label>
                        );
                      })}
                      <span className="ml-auto text-muted-foreground">
                        {accessSummary(
                          m.role_in_project === "owner" ? FULL_ACCESS : m.phase_access
                        )}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
