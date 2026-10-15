import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth";
import { pushEnabled, pushToUser } from "@/lib/push";
import { addSub, listSubs, removeSub, type PushSub } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET: ¿está configurado el push y cuántos dispositivos tiene este usuario?
export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  return NextResponse.json({ enabled: pushEnabled(), devices: (await listSubs(user.id)).length });
}

// POST { subscription } → guarda este dispositivo.  POST { test: true } → manda un aviso de prueba.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));
  if (body.test) {
    const sent = await pushToUser(user.id, { title: "🎰 TIMBA", body: `Listo ${user.displayName}, te aviso acá cuando haya goles en tus partidos.` });
    return NextResponse.json({ ok: sent > 0, sent });
  }
  const sub = body.subscription as PushSub | undefined;
  if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth)
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  await addSub(user.id, { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
  return NextResponse.json({ ok: true });
}

// DELETE { endpoint } → deja de avisar en este dispositivo.
export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { endpoint } = await req.json().catch(() => ({}));
  if (endpoint) await removeSub(user.id, String(endpoint));
  return NextResponse.json({ ok: true });
}
