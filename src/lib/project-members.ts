import { supabase } from "./supabase";

export type ProjectRole = "owner" | "lead" | "manager" | "designer";

export type PhaseKey = "context" | "discovery" | "features";

export interface PhaseAccess {
  context: boolean;
  discovery: boolean;
  features: boolean;
}

export const PHASE_LABELS: Record<PhaseKey, string> = {
  context: "Product Context",
  discovery: "Discovery",
  features: "Features",
};

export const FULL_ACCESS: PhaseAccess = { context: true, discovery: true, features: true };

export interface ProjectMember {
  user_id: string;
  email: string;
  full_name: string | null;
  role_in_project: ProjectRole;
  phase_access: PhaseAccess;
  added_at: string;
}

export interface InviteResult {
  invited: { email: string; role: ProjectRole }[];
  notFound: string[];
  alreadyMember: string[];
  error?: string;
}

export async function listProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data, error } = await supabase
    .from("project_members")
    .select(
      "user_id, role_in_project, phase_access, added_at, profiles:profiles!project_members_user_id_fkey!inner(email, full_name)"
    )
    .eq("project_id", projectId)
    .order("added_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const profile = row.profiles as unknown as { email: string; full_name: string | null };
    return {
      user_id: row.user_id,
      email: profile.email,
      full_name: profile.full_name,
      role_in_project: row.role_in_project as ProjectRole,
      phase_access: (row.phase_access as PhaseAccess) ?? FULL_ACCESS,
      added_at: row.added_at,
    };
  });
}

/**
 * Invite users by email. Looks up profiles, inserts project_members.
 * Skips emails not on profiles (no auto-signup) and existing members.
 */
export async function inviteMembersByEmail(
  projectId: string,
  emails: string[],
  role: ProjectRole = "designer",
  phaseAccess: PhaseAccess = FULL_ACCESS
): Promise<InviteResult> {
  const normalized = Array.from(
    new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))
  );
  if (normalized.length === 0) return { invited: [], notFound: [], alreadyMember: [] };

  const { data: profiles, error: profileErr } = await supabase
    .from("profiles")
    .select("id, email")
    .in("email", normalized);
  if (profileErr) return { invited: [], notFound: [], alreadyMember: [], error: profileErr.message };

  const foundEmails = new Set((profiles ?? []).map((p) => p.email.toLowerCase()));
  const notFound = normalized.filter((e) => !foundEmails.has(e));

  if (!profiles || profiles.length === 0) {
    return { invited: [], notFound, alreadyMember: [] };
  }

  const userIds = profiles.map((p) => p.id);
  const { data: existing } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId)
    .in("user_id", userIds);
  const existingIds = new Set((existing ?? []).map((m) => m.user_id));

  const toInsert = profiles.filter((p) => !existingIds.has(p.id));
  const alreadyMember = profiles
    .filter((p) => existingIds.has(p.id))
    .map((p) => p.email.toLowerCase());

  if (toInsert.length === 0) {
    return { invited: [], notFound, alreadyMember };
  }

  const { error: insertErr } = await supabase.from("project_members").insert(
    toInsert.map((p) => ({
      project_id: projectId,
      user_id: p.id,
      role_in_project: role,
      phase_access: phaseAccess,
    }))
  );
  if (insertErr) {
    return { invited: [], notFound, alreadyMember, error: insertErr.message };
  }

  return {
    invited: toInsert.map((p) => ({ email: p.email.toLowerCase(), role })),
    notFound,
    alreadyMember,
  };
}

export async function removeMember(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function changeMemberRole(
  projectId: string,
  userId: string,
  role: ProjectRole
): Promise<void> {
  const { error } = await supabase
    .from("project_members")
    .update({ role_in_project: role })
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function updatePhaseAccess(
  projectId: string,
  userId: string,
  phaseAccess: PhaseAccess
): Promise<void> {
  const { error } = await supabase
    .from("project_members")
    .update({ phase_access: phaseAccess })
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) throw error;
}

export function accessSummary(p: PhaseAccess): string {
  const granted = (Object.keys(p) as PhaseKey[]).filter((k) => p[k]);
  if (granted.length === 3) return "Full access";
  if (granted.length === 0) return "No access";
  return granted.map((k) => PHASE_LABELS[k]).join(" + ");
}
