import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth";
import { fetchRoster } from "@/lib/espn";

// GET /api/roster?league=uru.1&team=123
export async function GET(req: Request) {
  if (!(await currentUser())) return unauthorized();
  const url = new URL(req.url);
  const league = url.searchParams.get("league");
  const team = url.searchParams.get("team");
  if (!league || !team || !/^[a-z0-9._]+$/.test(league) || !/^\d+$/.test(team))
    return NextResponse.json({ error: "Falta league o team" }, { status: 400 });
  try {
    return NextResponse.json({ players: await fetchRoster(league, team) });
  } catch (e) {
    return NextResponse.json({ error: String(e), players: [] }, { status: 502 });
  }
}
