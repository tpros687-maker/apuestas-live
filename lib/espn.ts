import { parseEvent } from "./espn-parse.ts";
import type { Match } from "./types.ts";

// API no oficial de ESPN: gratis, sin key. Puede cambiar sin aviso.
const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

async function getJson(url: string, revalidate: number) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (apuestas-live)" },
    next: { revalidate },
  } as RequestInit);
  if (!res.ok) throw new Error(`ESPN ${res.status} en ${url}`);
  return res.json();
}

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

/** Partidos de una liga entre dos fechas (YYYY-MM-DD, inclusive). */
export async function fetchMatches(
  league: string,
  from: string,
  to: string = from,
  revalidate = 20,
): Promise<Match[]> {
  const a = new Date(`${from}T00:00:00Z`);
  const b = new Date(`${to}T00:00:00Z`);
  // ESPN usa días de EE.UU.; ampliamos un día para cada lado para no perder partidos de madrugada/noche.
  a.setUTCDate(a.getUTCDate() - 1);
  b.setUTCDate(b.getUTCDate() + 1);
  // ESPN ya no acepta rangos (dates=A-B da 400): pedimos día por día, máximo 10 días.
  const days: string[] = [];
  for (const d = new Date(a); d <= b && days.length < 10; d.setUTCDate(d.getUTCDate() + 1)) days.push(ymd(d));
  const results = await Promise.allSettled(
    days.map((day) => getJson(`${BASE}/${league}/scoreboard?dates=${day}`, revalidate)),
  );
  if (results.every((r) => r.status === "rejected")) throw (results[0] as PromiseRejectedResult).reason;
  const byId = new Map<string, Match>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const ev of r.value.events ?? []) {
      const m = parseEvent(ev, league);
      byId.set(m.id, m);
    }
  }
  return [...byId.values()];
}

/** Busca partidos concretos por id, agrupando las llamadas por liga y fecha. */
export async function fetchMatchesByIds(
  wanted: { eventId: string; league: string; kickoff: string }[],
): Promise<Map<string, Match>> {
  const out = new Map<string, Match>();
  const groups = new Map<string, { league: string; from: string; to: string }>();
  for (const w of wanted) {
    const day = w.kickoff.slice(0, 10);
    const g = groups.get(w.league);
    if (!g) groups.set(w.league, { league: w.league, from: day, to: day });
    else {
      if (day < g.from) g.from = day;
      if (day > g.to) g.to = day;
    }
  }
  await Promise.all(
    [...groups.values()].map(async (g) => {
      try {
        const matches = await fetchMatches(g.league, g.from, g.to);
        for (const m of matches) out.set(m.id, m);
      } catch (e) {
        console.error(e);
      }
    }),
  );
  return out;
}

export interface RosterPlayer {
  id: string;
  name: string;
  jersey?: string;
  position?: string;
}

/** Plantel de un equipo (para apuestas de jugador). */
export async function fetchRoster(league: string, teamId: string): Promise<RosterPlayer[]> {
  const data = await getJson(`${BASE}/${league}/teams/${teamId}/roster`, 60 * 60 * 6);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data.athletes ?? []).map((a: any) => ({
    id: String(a.id),
    name: a.displayName,
    jersey: a.jersey,
    position: a.position?.abbreviation,
  }));
}
