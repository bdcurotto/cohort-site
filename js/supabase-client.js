// Shared Supabase client for the advertiser portal (business signup, login,
// dashboard, campaign submission). Same Supabase project the iOS app uses
// (see Plans/Config.swift) -- this is the "anon"/publishable key, safe to
// ship in client-side code by design, since every table it can touch is
// locked down by Postgres row-level security, not by keeping this key
// secret. See SUPABASE_SCHEMA_TODO.md §190 for the RLS policies that
// scope a business's access to only their own `businesses`/
// `campaign_submissions` rows.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://mslfhrtaybiiclwhrstr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zbGZocnRheWJpaWNsd2hyc3RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMDk5NzUsImV4cCI6MjA5OTg4NTk3NX0.G__EouXFF6fW9bK4BYLTPi6o6utVesZQqCPXFCQ5NiE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// Resolves a page-relative path against the current page's URL, so links
// keep working whether the site is served from a domain root or from a
// GitHub Pages subpath like /cohort-site/.
export function siteURL(path) {
  return new URL(path, window.location.href).href;
}

// Redirects to the login page unless a session already exists. Returns the
// session so callers don't need a second getSession() round trip.
export async function requireBusinessSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = siteURL("advertise-login.html");
    return null;
  }
  return session;
}

// Looks up the `businesses` row for the signed-in account. Returns null
// (rather than throwing) if this auth user somehow isn't a business --
// e.g. a stale session -- so callers can bounce back to login cleanly.
export async function fetchOwnBusiness(session) {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("auth_user_id", session.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function signOutBusiness() {
  await supabase.auth.signOut();
  window.location.href = siteURL("advertise-login.html");
}

// Same shape as requireBusinessSession/fetchOwnBusiness above, but for the
// staff-only admin review pages (admin-login.html/admin-review.html) --
// separate helpers rather than a shared parameterized one so each stays
// obviously readable at the call site about which account type it expects.
export async function requireStaffSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = siteURL("admin-login.html");
    return null;
  }
  return session;
}

// Looks up the `staff_users` row for the signed-in account. Returns null if
// this auth user isn't staff (e.g. a business or student account, or a
// stale session) -- staff_users has no auth.uid()-scoped policy for
// non-owners, so a non-staff caller just gets zero rows back here rather
// than an RLS error.
export async function fetchOwnStaff(session) {
  const { data, error } = await supabase
    .from("staff_users")
    .select("*")
    .eq("auth_user_id", session.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function signOutStaff() {
  await supabase.auth.signOut();
  window.location.href = siteURL("admin-login.html");
}

// Wires up every "show/hide password" button on the page in one call.
// Markup contract: an `.password-toggle` <button> with `data-target` set
// to the id of the password <input> it controls, both wrapped in a
// `.password-field` div (see advertiser.css for the positioning). Toggling
// flips the input's type between "password" and "text" and swaps the icon
// + aria-label to match -- shared here rather than duplicated per page
// since every page with a password field (signup, login, profile, reset)
// needs the exact same behavior.
const EYE_ICON =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF_ICON =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.94 4.06M6.1 6.1A18.6 18.6 0 0 0 1 12s4 8 11 8a9.26 9.26 0 0 0 5.9-2.1M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>';

export function setupPasswordToggles() {
  document.querySelectorAll(".password-toggle").forEach((btn) => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    btn.innerHTML = EYE_ICON;
    btn.setAttribute("aria-label", "Show password");
    btn.addEventListener("click", () => {
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      btn.innerHTML = showing ? EYE_ICON : EYE_OFF_ICON;
      btn.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    });
  });
}
