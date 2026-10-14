import "server-only";

import webpush from "web-push";

import { createServiceRoleClient } from "@/lib/supabase/admin";

export type PushPayload = {
  title: string;
  body: string;
  /** App path opened when the notification is clicked. */
  url: string;
  /** Notifications with the same tag replace each other on the device. */
  tag?: string;
};

let configured: boolean | null = null;

/** Web push needs a VAPID key pair; without one, pushes are skipped (in-app alerts still work). */
export function isPushConfigured() {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return (configured = false);
  const subject = process.env.VAPID_SUBJECT?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || "mailto:admin@localhost";
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return (configured = true);
}

/**
 * Sends a push to every browser the users subscribed from. Dead subscriptions are removed.
 * Returns false when a delivery failed for a reason worth retrying (e.g. network error).
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (userIds.length === 0 || !isPushConfigured()) return true;
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  const subscriptions = (data ?? []) as { id: string; endpoint: string; p256dh: string; auth: string }[];

  const body = JSON.stringify(payload);
  const gone: string[] = [];
  let delivered = true;
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          { TTL: 60 * 60 * 24 },
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(sub.id);
        else {
          delivered = false;
          console.error("[push] delivery failed", status ?? error);
        }
      }
    }),
  );
  if (gone.length > 0) await admin.from("push_subscriptions").delete().in("id", gone);
  return delivered;
}
