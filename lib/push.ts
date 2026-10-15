import webpush from "web-push";
import type { Notice } from "./notify";
import { listSubs, removeSub } from "./store";

const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
export const pushEnabled = () => Boolean(PUBLIC && PRIVATE);

if (pushEnabled()) webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:timba@example.com", PUBLIC!, PRIVATE!);

/** Manda el aviso a todos los dispositivos del usuario. Borra los que ya no existen. */
export async function pushToUser(userId: string, n: Notice): Promise<number> {
  if (!pushEnabled()) {
    console.log("[push desactivado]", userId, n.title, n.body);
    return 0;
  }
  const subs = await listSubs(userId);
  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, JSON.stringify({ ...n, url: "/" }), { TTL: 60 * 30, urgency: "high" });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await removeSub(userId, sub.endpoint);
        else console.error("push", code, e);
      }
    }),
  );
  return sent;
}
