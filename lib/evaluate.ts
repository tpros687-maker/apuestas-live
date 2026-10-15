import type { Bet, BetState, Market, Match, Selection, SelectionEval, SelState } from "./types.ts";

const settle = (m: Match, ok: boolean, liveOk = ok): SelState =>
  m.state === "post" ? (ok ? "won" : "lost") : liveOk ? "winning" : "losing";

export function marketLabel(sel: Pick<Selection, "home" | "away" | "market">): string {
  const { home, away, market: mk } = sel;
  switch (mk.type) {
    case "result":
      return mk.pick === "home" ? `Gana ${home.name}` : mk.pick === "away" ? `Gana ${away.name}` : "Empate";
    case "double":
      return mk.pick === "1X"
        ? `${home.name} o empate`
        : mk.pick === "X2"
          ? `${away.name} o empate`
          : `${home.name} o ${away.name}`;
    case "total":
      return `${mk.side === "over" ? "Más" : "Menos"} de ${mk.line} goles`;
    case "btts":
      return mk.pick === "yes" ? "Ambos marcan" : "No marcan ambos";
    case "player":
      return mk.goals === 1
        ? `${mk.playerName} marca`
        : mk.goals === 2
          ? `${mk.playerName} doblete`
          : mk.goals === 3
            ? `${mk.playerName} hat-trick`
            : `${mk.playerName} ${mk.goals}+ goles`;
  }
}

/** Goles de un jugador (sin contar goles en contra). Matchea por id y, si falta, por nombre. */
export function playerGoals(m: Match, mk: Extract<Market, { type: "player" }>): number {
  const norm = (s?: string) => (s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return m.goals.filter(
    (g) => !g.ownGoal && (g.scorerId ? g.scorerId === mk.playerId : norm(g.scorerName) === norm(mk.playerName)),
  ).length;
}

export function evaluateSelection(sel: Selection, m: Match | undefined): SelectionEval {
  if (!m) return { state: "pending", detail: "Sin datos del partido todavía" };
  if (m.state === "void") return { state: "void", detail: "Partido suspendido / postergado" };
  if (m.state === "pre") return { state: "pending", detail: "No empezó" };

  const h = m.homeScore;
  const a = m.awayScore;
  const total = h + a;
  const mk = sel.market;

  switch (mk.type) {
    case "result": {
      const cur = h > a ? "home" : h < a ? "away" : "draw";
      return { state: settle(m, cur === mk.pick), detail: `${h}-${a}` };
    }
    case "double": {
      const cur = h > a ? "1" : h < a ? "2" : "X";
      return { state: settle(m, mk.pick.includes(cur)), detail: `${h}-${a}` };
    }
    case "total": {
      const over = total > mk.line;
      if (mk.side === "over") {
        // Una vez superada la línea, ya está ganada aunque el partido siga.
        if (over) return { state: "won", detail: `${total} goles ✓` };
        const faltan = Math.floor(mk.line) + 1 - total;
        return { state: settle(m, false), detail: `${total} goles · faltan ${faltan}` };
      }
      if (over) return { state: "lost", detail: `${total} goles ✗` };
      return { state: settle(m, true), detail: `${total} goles` };
    }
    case "btts": {
      const both = h > 0 && a > 0;
      if (mk.pick === "yes") {
        if (both) return { state: "won", detail: `${h}-${a} ✓` };
        return { state: settle(m, false), detail: h === 0 && a === 0 ? "Ninguno marcó" : `Falta que marque ${h === 0 ? sel.home.name : sel.away.name}` };
      }
      if (both) return { state: "lost", detail: `${h}-${a} ✗` };
      return { state: settle(m, true), detail: `${h}-${a}` };
    }
    case "player": {
      const n = playerGoals(m, mk);
      if (n >= mk.goals) return { state: "won", detail: `${mk.playerName} ${n}/${mk.goals} ✓` };
      return { state: settle(m, false), detail: `${mk.playerName} ${n}/${mk.goals}` };
    }
  }
}

export function betState(evals: SelectionEval[]): BetState {
  const live = evals.filter((e) => e.state !== "void");
  if (live.length === 0) return evals.length ? "void" : "pending";
  if (live.some((e) => e.state === "lost")) return "lost";
  if (live.every((e) => e.state === "won")) return "won";
  if (live.every((e) => e.state === "pending")) return "pending";
  if (live.some((e) => e.state === "losing")) return "live-losing";
  return "live-winning";
}

export interface EvaluatedBet extends Bet {
  state: BetState;
  evals: Record<string, SelectionEval>;
  matches: Record<string, Match>;
}

export function evaluateBet(bet: Bet, matches: Map<string, Match>): EvaluatedBet {
  const evals: Record<string, SelectionEval> = {};
  const used: Record<string, Match> = {};
  for (const s of bet.selections) {
    const m = matches.get(s.eventId);
    if (m) used[s.eventId] = m;
    evals[s.id] = evaluateSelection(s, m);
  }
  return { ...bet, state: betState(Object.values(evals)), evals, matches: used };
}
