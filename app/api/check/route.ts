import { NextResponse } from "next/server";
import { evaluateBets } from "@/lib/live";
import { diff, type Snapshot } from "@/lib/notify";
import { getKv, listBets, setKv } from "@/lib/store";
import { sendTelegram } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const FINAL = ["won", "lost", "void"];

/**
 * Lo llama un cron cada minuto (cron-job.org, gratis):
 *   GET /api/check?secret=TU_CRON_SECRET
 * Revisa las apuestas abiertas, compara con la vuelta anterior y manda los avisos a Telegram.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const prev = await getKv<Snapshot>("snapshot");
  const all = await listBets();
  const open = all.filter((b) => !FINAL.includes(prev?.bets[b.id] ?? ""));

  // Solo consultamos ESPN si hay algún partido empezado o por empezar en 15 min.
  const soon = Date.now() + 15 * 60 * 1000;
  const due = open.filter((b) => b.selections.some((s) => new Date(s.kickoff).getTime() <= soon));
  if (!due.length) return NextResponse.json({ ok: true, checked: 0, open: open.length });

  const evaluated = await evaluateBets(due);
  const { messages, next } = diff(evaluated, prev);

  // Conservamos lo que no se evaluó esta vuelta (apuestas cerradas o futuras).
  const merged: Snapshot = {
    matches: { ...prev?.matches, ...next.matches },
    sels: { ...prev?.sels, ...next.sels },
    bets: { ...prev?.bets, ...next.bets },
  };
  // Limpiamos apuestas borradas.
  const ids = new Set(all.map((b) => b.id));
  for (const id of Object.keys(merged.bets)) if (!ids.has(id)) delete merged.bets[id];
  await setKv("snapshot", merged);

  for (const m of messages.slice(0, 20)) await sendTelegram(m);
  return NextResponse.json({ ok: true, checked: due.length, sent: messages.length });
}
