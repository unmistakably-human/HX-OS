# Access Management — Roles & Permissions

Simplified model (2026-05-12). Use this doc for internal review.

---

## 1. Roles

Three global roles, on `profiles.role`. A user's role applies **across all
projects** they touch — there is no per-project role anymore.

| Role | Created by | Default password | What they can do |
|---|---|---|---|
| `admin` | seeded in `allowlist` migration | `HumanX@Welcome2026` (first login forced) | Manages users · sees and edits every project |
| `product_lead` | Admin via `/admin/users` | `HumanX@Welcome2026` | Creates projects · sees + edits only their own and ones shared with them · invites teammates |
| `designer` | Admin via `/admin/users` | `HumanX@Welcome2026` | Works inside projects they're invited to · cannot create projects, delete projects, or delete features |

**Seeded admins:** `jay.k@humanx.io`, `rishabh@juicelabs.ai`, `design@humanx.io`, `krupali@humanx.io`.

> `project_manager` is gone — merged into `product_lead`.
> `Owner` is **not** a role — it's a flag on `project_members.role_in_project='owner'` that marks the project creator so they can't be removed from their own project. Permissions are governed by global role.

---

## 2. What each role can do (system + project level)

| Action | admin | product_lead | designer |
|---|:---:|:---:|:---:|
| Create users (`/admin/users`) | ✓ | | |
| Manage allowlist | ✓ | | |
| Reset another user's password | ✓ | | |
| Deactivate / reactivate a user | ✓ | | |
| See **all** projects on `/` | ✓ | | |
| See **only assigned + own** projects on `/` |  | ✓ | ✓ |
| Create a new project | ✓ | ✓ | |
| Invite people to a project (Share modal) | ✓ | ✓ | |
| Remove people from a project | ✓ | ✓ | |
| Edit Product Context | ✓ | ✓ | ✓ (only if it isn't complete yet) |
| Edit Discovery | ✓ | ✓ | ✓ (only if it isn't complete yet) |
| Add new feature | ✓ | ✓ | ✓ |
| Edit / refine existing feature | ✓ | ✓ | ✓ |
| Delete a feature | ✓ | ✓ | |
| Delete the project | ✓ | ✓ (only the creator) | |
| Use AI / Claude features | ✓ | ✓ | ✓ |
| Remove themselves from their own project | | | |
| Sign in / sign out | ✓ | ✓ | ✓ |

---

## 3. Where each rule is enforced

| Concern | DB (Supabase RLS) | Proxy | Server action | UI |
|---|:---:|:---:|:---:|:---:|
| Must be logged in to do anything | ✓ (denies anon writes) | ✓ redirects to `/login` | | |
| Email allowlist check on signup | ✓ trigger | | | |
| Admin-only routes | ✓ via `is_admin()` | | ✓ `requireAdmin()` | ✓ button hidden |
| Project visibility | ✓ `is_project_member()` + `is_admin()` | | | ✓ filtered on `/` |
| Project creation (admin / product_lead only) | ✓ `products_create` policy | | ✓ `createProjectAction` (service-role) | ✓ "New Product" button |
| Project membership writes | ✓ `pm_managers_write` + admin all | | | ✓ Share modal |
| Feature delete restricted to admin / product_lead | ✓ `features_lead_delete` policy | | | (UI follow-up: hide delete for designer) |
| Designer can write Context / Discovery only while incomplete | (not yet RLS) | | (follow-up: server-side guard) | ✓ disable save once `phase_complete` |
| Creator can't be self-removed | (filter in UI for now) | | | ✓ trash hidden on creator row |

---

## 4. Database tables

| Table | Stores | RLS summary |
|---|---|---|
| `auth.users` | Supabase Auth users (managed) | Supabase-managed |
| `public.profiles` | App profile (role, name, must_change_password, deactivated) | Self-read + admin-read/write |
| `public.allowlist` | Emails allowed to sign up, with default role | Admin-only |
| `public.project_members` | Project ↔ user membership. `role_in_project='owner'` marks the creator | Member-read + admin/lead-write |
| `public.products` (existing) | Projects | Admin-all + member-read/write + role-gated insert |
| `public.features` (existing) | Features inside projects | Admin-all + member read/write/insert + lead-only delete |
| `public.knowledge` (existing) | Research entries inside projects | Inherits product membership |
| `public.reviews` (existing) | Saved AI reviews | Authenticated users (no project FK yet — follow-up) |

---

## 5. Schema migrations (run in order)

Idempotent. Apply via Supabase SQL Editor.

| # | File | What it does |
|---|---|---|
| 1 | `20260506154017_auth_and_rbac.sql` | Initial schema + RLS + allowlist seed |
| 2 | `20260506165000_auto_owner.sql` | Auto-owner trigger (later removed in #6) |
| 3 | `20260506180000_phase_access.sql` | Adds `phase_access` (later removed in #6) |
| 4 | `20260506190000_first_owner_policy.sql` | First-owner RLS workaround |
| 5 | `20260506200000_rename_current_role.sql` | Renames helper to `app_role()` |
| 6 | `20260512120000_simplify_access.sql` | **Latest**: merges PM into product_lead, drops phase_access, refines feature RLS, drops auto-owner trigger in favour of a service-role server action |

---

## 6. Default credentials

| Account | Default password |
|---|---|
| Any admin-created user | `HumanX@Welcome2026` (forced change on first login) |
| Seeded admins | `HumanX@Welcome2026` |

Change `DEFAULT_PASSWORD` in `src/app/admin/users/actions.ts` and `scripts/seed-admins.ts` to rotate.

---

## 7. UI surfaces

| Surface | File | What it does |
|---|---|---|
| `/login` | `src/app/login/*` | Email + password sign-in; first-login redirect |
| `/setup-password` | `src/app/setup-password/*` | Forced first-login password change |
| `/admin/users` | `src/app/admin/users/*` | Admin user create / deactivate / reset-password |
| Homepage **Admin** button | `src/app/page.tsx` | Visible only when `profiles.role='admin'` |
| Project sidebar **Share project** | `src/components/share-project-dialog.tsx` | Invite by email (no role select, no tickboxes); creator badge; trash hidden on creator |
| User menu (avatar) | `src/components/user-menu.tsx` | Shows email + Sign out |
| Auth gate | `src/proxy.ts` + `src/lib/supabase-middleware.ts` | Redirects unauthenticated requests to `/login` |

---

## 8. Known follow-ups

| Item | Severity | Where |
|---|---|---|
| Designer write-on-empty Context/Discovery — UI gating, not RLS-level | 🟡 follow-up | server actions for context/discovery save |
| Hide feature delete button for designers in UI | 🟡 follow-up | feature list / detail pages |
| API routes (`/api/**`) still use browser Supabase client | 🟡 follow-up | replace with `@/lib/supabase-server` |
| Reviews table has no `project_id` FK; currently authenticated-only | 🟢 nice-to-have | tighten once column added |
| Live Vercel still has temp open-RW policies (legacy app workaround) | 🟢 cleanup post-merge | drop policies after Vercel redeploys this branch |
