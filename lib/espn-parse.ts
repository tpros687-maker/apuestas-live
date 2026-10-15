import type { Goal, Match, MatchState, TeamRef } from "./types.ts";

// Convierte un "event" del scoreboard de ESPN a nuestro formato.
// Estructura verificada contra site.api.espn.com/apis/site/v2/sports/soccer/:league/scoreboard
/* eslint-disable @typescript-eslint/no-explicit-any */

const VOID_STATUSES = ["STATUS_POSTPONED", "STATUS_CANCELED", "STATUS_ABANDONED", "STATUS_SUSPENDED"];

function team(c: any): TeamRef {
  return {
    id: String(c?.team?.id ?? c?.id ?? ""),
    name: c?.team?.shortDisplayName ?? c?.team?.displayName ?? "?",
    abbr: c?.team?.abbreviation ?? "",
    logo: c?.team?.logo,
  };
}

export function parseEvent(ev: any, league: string): Match {
  const comp = ev?.competitions?.[0] ?? {};
  const status = comp.status ?? ev.status ?? {};
  const type = status.type ?? {};
  const competitors: any[] = comp.competitors ?? [];
  const homeC = competitors.find((c) => c.homeAway === "home") ?? competitors[0];
  const awayC = competitors.find((c) => c.homeAway === "away") ?? competitors[1];
  const home = team(homeC);
  const away = team(awayC);

  let state: MatchState = (type.state as MatchState) ?? "pre";
  if (VOID_STATUSES.includes(type.name)) state = "void";

  const goals: Goal[] = [];
  for (const d of comp.details ?? []) {
    if (!d?.scoringPlay || d?.shootout) continue;
    const athlete = d.athletesInvolved?.[0];
    const detailTeam = String(d.team?.id ?? "");
    let creditedTeam = detailTeam;
    if (d.ownGoal) {
      // En un gol en contra, el gol suma para el rival del jugador.
      const playerTeam = String(athlete?.team?.id ?? detailTeam);
      creditedTeam = playerTeam === home.id ? away.id : playerTeam === away.id ? home.id : detailTeam;
    }
    const minute = d.clock?.displayValue ?? "";
    goals.push({
      key: `${d.clock?.value ?? minute}-${creditedTeam}-${athlete?.id ?? "x"}`,
      minute,
      teamId: creditedTeam,
      scorerId: athlete?.id ? String(athlete.id) : undefined,
      scorerName: athlete?.displayName,
      ownGoal: Boolean(d.ownGoal),
      penalty: Boolean(d.penaltyKick),
    });
  }

  return {
    id: String(ev.id),
    league,
    kickoff: ev.date ?? comp.date,
    state,
    statusText: type.shortDetail ?? type.detail ?? "",
    clock: status.displayClock,
    home,
    away,
    homeScore: Number(homeC?.score ?? 0) || 0,
    awayScore: Number(awayC?.score ?? 0) || 0,
    goals,
  };
}
