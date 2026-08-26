// Shared CORS allowlist for this project's Edge Functions. Previously every
// function used `Access-Control-Allow-Origin: "*"`, which is unnecessarily
// permissive — these endpoints are auth-gated (require a valid Supabase JWT)
// so a wildcard origin isn't directly exploitable by itself, but scoping it
// to known origins is still standard defense-in-depth (matters if a token
// ever leaked via another vector). Update ALLOWED_ORIGIN_PATTERNS if the app
// gets a real custom domain or a new deployment alias.
const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost:\d+$/,
  /^https:\/\/batchkeeper\.vercel\.app$/,
  // Covers every Vercel deployment URL for this specific project (both the
  // readable aliases and the per-deployment random-suffix ones), without
  // opening it to arbitrary domains.
  /^https:\/\/[a-z0-9-]+-nuel-org-s-projects\.vercel\.app$/,
];

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin));
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "https://batchkeeper.vercel.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}
