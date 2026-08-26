// Sends a Web Push notification to every subscribed device for a business.
// Called by the client (via supabase.functions.invoke) right after a
// mutation that should notify the owner — e.g. a material crossing its
// reorder point during logBatch. The caller's own session is what scopes
// which subscriptions can even be read: we query push_subscriptions with a
// client built from the caller's JWT (not the service role), so Postgres RLS
// naturally restricts results to businesses that caller actually owns — no
// manual ownership check needed here.
//
// VAPID_PRIVATE_KEY/VAPID_PUBLIC_KEY/VAPID_SUBJECT are Supabase secrets
// (`supabase secrets set ...`), auto-injected into this function's env —
// never passed by the caller, never stored client-side.
//
// Deploy with: supabase functions deploy send-push

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { corsHeadersFor } from "../_shared/cors.ts";

interface SendPushBody {
  businessId: string;
  title: string;
  body: string;
  url?: string;
}

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

  let payload: SendPushBody;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!payload.businessId || !payload.title || !payload.body) {
    return json({ error: "businessId, title, and body are required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const vapidSubject = Deno.env.get("VAPID_SUBJECT")!;

  // Scoped to the caller's own JWT — RLS on push_subscriptions means this
  // can only ever see rows for businesses the caller owns.
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

  const { data: subscriptions, error: subError } = await callerClient
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("business_id", payload.businessId);

  if (subError) {
    return json({ error: subError.message }, 500);
  }
  if (!subscriptions || subscriptions.length === 0) {
    return json({ sent: 0, failed: 0, message: "No subscriptions for this business" });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
  });

  let sent = 0;
  let failed = 0;
  const deadSubscriptionIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notificationPayload,
        );
        sent++;
      } catch (err) {
        failed++;
        // 404/410 means the subscription is dead (browser unsubscribed,
        // uninstalled the PWA, etc.) — clean it up rather than retrying
        // forever.
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          deadSubscriptionIds.push(sub.id);
        }
      }
    }),
  );

  if (deadSubscriptionIds.length > 0) {
    await callerClient.from("push_subscriptions").delete().in("id", deadSubscriptionIds);
  }

  return json({ sent, failed, removed: deadSubscriptionIds.length });
});
