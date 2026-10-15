import { NextResponse } from "next/server";
import { fetchMatches } from "@/lib/espn";

export const dynamic = "force-dynamic";
const TZ = "America/Montevideo";
const localDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });

// GET /api/matches?league=uru.1&date=2026-10-15  → partidos de ese día (hora de Uruguay)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const league = url.searchParams.get("league");
  const date = url.searchParams.get("date") ?? localDay(new Date().toISOString());
  if (!league) return NextResponse.json({ error: "Falta league" }, { status: 400 });
  try {
    const all = await fetchMatches(league, date, date, 30);
    const matches = all.filter((m) => localDay(m.kickoff) === date).sort((a, b) => a.kickoff.localeCompare(b.kickoff));
    return NextResponse.json({ matches });
  } catch (e) {
    return NextResponse.json({ error: String(e), matches: [] }, { status: 502 });
  }
}
