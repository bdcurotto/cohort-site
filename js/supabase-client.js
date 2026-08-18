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
