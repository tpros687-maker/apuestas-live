import { NextResponse } from "next/server";
import { fetchMatchesByIds } from "@/lib/espn";
import { evaluateBets } from "@/lib/live";
import { diff, type Snapshot } from "@/lib/notify";
import { pushToUser } from "@/lib/push";
import { getKv, listBets, listUsers, setKv } from "@/lib/store";
import type { Bet } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const FINAL = ["won", "lost", "void"];

/**
 * Lo llama cron-job.org cada minuto:  GET /api/check?secret=TU_CRON_SECRET
 * Para cada usuario revisa sus apuestas abiertas, compara con la vuelta anterior y le manda sus avisos.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const soon = Date.now() + 15 * 60 * 1000;
  const users = await listUsers();

  // 1) Juntamos lo que hay que revisar de todos, para pedirle a ESPN cada liga una sola vez.
  const work: { userId: string; all: Bet[]; due: Bet[]; prev: Snapshot | null }[] = [];
  for (const u of users) {
    const prev = await getKv<Snapshot>(`snapshot:${u.id}`);
    const all = await listBets(u.id);
    const open = all.filter((b) => !FINAL.includes(prev?.bets[b.id] ?? ""));
    // Solo partidos empezados o que arrancan en los próximos 15 minutos.
    const due = open.filter((b) => b.selections.some((s) => new Date(s.kickoff).getTime() <= soon));
    if (due.length) work.push({ userId: u.id, all, due, prev });
  }
  if (!work.length) return NextResponse.json({ ok: true, users: users.length, checked: 0 });

  const matches = await fetchMatchesByIds(work.flatMap((w) => w.due.flatMap((b) => b.selections)));

  // 2) Evaluamos y avisamos a cada uno lo suyo.
  let sent = 0;
  for (const w of work) {
    const evaluated = await evaluateBets(w.due, matches);
    const { notices, next } = diff(evaluated, w.prev);
    const merged: Snapshot = {
      matches: { ...w.prev?.matches, ...next.matches },
      sels: { ...w.prev?.sels, ...next.sels },
      bets: { ...w.prev?.bets, ...next.bets },
    };
    const ids = new Set(w.all.map((b) => b.id));
    for (const id of Object.keys(merged.bets)) if (!ids.has(id)) delete merged.bets[id];
    await setKv(`snapshot:${w.userId}`, merged);
    for (const n of notices.slice(0, 15)) sent += await pushToUser(w.userId, n);
  }
  return NextResponse.json({ ok: true, users: users.length, checked: work.length, sent });
}
