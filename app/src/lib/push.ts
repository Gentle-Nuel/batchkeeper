// Web Push subscription helpers — request permission, subscribe this
// device/browser via the service worker's PushManager, and store/remove the
// subscription row in Supabase. The actual sending happens server-side (see
// supabase/functions/send-push); this file only ever touches the public
// VAPID key, never the private one.
import { supabase } from "./supabaseClient";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// PushManager wants the VAPID public key as a raw Uint8Array backed by a
// plain ArrayBuffer, but it's handed to us base64url-encoded. (Built via an
// explicit `new ArrayBuffer` + `.set()`, not `Uint8Array.from()` — recent
// DOM/TS lib defs want `Uint8Array<ArrayBuffer>` specifically, which
// `.from()`'s inferred `ArrayBufferLike` backing doesn't satisfy.)
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush(businessId: string): Promise<{ error?: string }> {
  if (!pushSupported()) return { error: "Push notifications aren't supported on this device/browser." };
  if (!VAPID_PUBLIC_KEY) return { error: "Push isn't configured (missing VAPID public key)." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { error: permission === "denied" ? "Notification permission was denied." : "Permission dismissed." };
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const raw = subscription.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      business_id: businessId,
      endpoint: raw.endpoint!,
      p256dh: raw.keys!.p256dh,
      auth: raw.keys!.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) return { error: error.message };
  return {};
}

export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
