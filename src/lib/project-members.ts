import { supabase } from "./supabase";

export type AppRole = "admin" | "product_lead" | "designer";

// role_in_project is no longer used for permissions. The value 'owner'
// just marks the project creator (used to prevent self-removal).
export type ProjectRole = "owner" | "lead" | "manager" | "designer";

export interface ProjectMember {
  user_id: string;
  email: string;
  full_name: string | null;
  role_in_project: ProjectRole;   // 'owner' = creator; other values legacy
  global_role: AppRole;           // from profiles.role — the real permission gate
  added_at: string;
}

export interface InviteResult {
  invited: string[];        // emails actually added
  notFound: string[];       // emails with no profile
  alreadyMember: string[];  // emails already in the project
  error?: string;
}

export async function listProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data, error } = await supabase
    .from("project_members")
    .select(
      "user_id, role_in_project, added_at, profiles:profiles!project_members_user_id_fkey!inner(email, full_name, role)"
    )
    .eq("project_id", projectId)
    .order("added_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const profile = row.profiles as unknown as {
      email: string;
      full_name: string | null;
      role: AppRole;
    };
    return {
      user_id: row.user_id,
      email: profile.email,
      full_name: profile.full_name,
      role_in_project: row.role_in_project as ProjectRole,
      global_role: profile.role,
      added_at: row.added_at,
    };
  });
}

/**
 * Invite users by email. Looks up profiles, inserts project_members rows
 * with role_in_project='designer' (legacy column — permissions are governed
 * by global role, not this).
 */
export async function inviteMembersByEmail(
  projectId: string,
  emails: string[]
): Promise<InviteResult> {
  const normalized = Array.from(
    new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))
  );
  if (normalized.length === 0) {
    return { invited: [], notFound: [], alreadyMember: [] };
  }

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
  const alreadyMember = profiles.filter((p) => existingIds.has(p.id)).map((p) => p.email.toLowerCase());

  if (toInsert.length === 0) {
    return { invited: [], notFound, alreadyMember };
  }

  const { error: insertErr } = await supabase.from("project_members").insert(
    toInsert.map((p) => ({
      project_id: projectId,
      user_id: p.id,
      role_in_project: "designer",  // legacy column — value doesn't gate permissions
    }))
  );
  if (insertErr) {
    return { invited: [], notFound, alreadyMember, error: insertErr.message };
  }

  return {
    invited: toInsert.map((p) => p.email.toLowerCase()),
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
