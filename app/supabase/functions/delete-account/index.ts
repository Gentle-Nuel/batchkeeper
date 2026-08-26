// Deletes the calling user's own auth.users row (and, via `businesses.owner_id
// references auth.users(id) on delete cascade`, every business/material/
// product/batch/sale they own). This is the one operation the client can't
// do itself — Supabase only exposes auth.admin.deleteUser() to a service-role
// key, which must never be shipped to the browser. This function is the
// boundary: it runs server-side, and Supabase auto-injects
// SUPABASE_SERVICE_ROLE_KEY into its environment — no secret is ever typed,
// stored, or passed by the caller.
//
// Deploy with: supabase functions deploy delete-account
// (requires the CLI to be linked to THIS project — see DEVLOG/handoff notes)

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing authorization header" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Identify the caller from their own JWT — never trust a client-supplied id.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser();

  if (userError || !user) {
    return json({ error: "Invalid or expired session" }, 401);
  }

  // Service-role client — only ever constructed here, server-side.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return json({ error: deleteError.message }, 500);
  }

  return json({ ok: true });
});
