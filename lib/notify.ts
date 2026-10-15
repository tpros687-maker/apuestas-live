import { marketLabel, playerGoals, type EvaluatedBet } from "./evaluate.ts";
import type { BetState, Match, SelState } from "./types.ts";

export interface Snapshot {
  matches: Record<string, { state: string; goals: string[] }>;
  sels: Record<string, SelState>;
  bets: Record<string, BetState>;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const score = (m: Match) => `${esc(m.home.name)} <b>${m.homeScore}-${m.awayScore}</b> ${esc(m.away.name)}`;
const betName = (b: EvaluatedBet) =>
  esc(b.name || (b.selections.length > 1 ? `Combinada x${b.selections.length}` : "Simple"));

/**
 * Compara el estado actual con el de la vuelta anterior y arma los avisos.
 * La primera vez que ve un partido/apuesta solo guarda la base (no spamea lo que ya pasó).
 */
export function diff(bets: EvaluatedBet[], prev: Snapshot | null): { messages: string[]; next: Snapshot } {
  const next: Snapshot = { matches: {}, sels: {}, bets: {} };
  const messages: string[] = [];
  const allMatches = new Map<string, Match>();
  for (const b of bets) for (const m of Object.values(b.matches)) allMatches.set(m.id, m);

  // --- Eventos de partido (una vez por partido, aunque esté en varias apuestas) ---
  for (const m of allMatches.values()) {
    const before = prev?.matches[m.id];
    next.matches[m.id] = { state: m.state, goals: m.goals.map((g) => g.key) };
    if (!before) continue;

    if (before.state === "pre" && m.state === "in") messages.push(`🟢 <b>Arrancó</b> ${score(m)}`);

    for (const g of m.goals) {
      if (before.goals.includes(g.key)) continue;
      const team = g.teamId === m.home.id ? m.home.name : m.away.name;
      const who = g.scorerName ? ` — ${esc(g.scorerName)}${g.ownGoal ? " (en contra)" : g.penalty ? " (penal)" : ""}` : "";
      const lines = [`⚽ <b>GOL de ${esc(team)}</b> ${esc(g.minute)}${who}`, score(m)];
      // ¿Afecta a alguna apuesta de jugador?
      for (const b of bets)
        for (const s of b.selections) {
          if (s.eventId !== m.id || s.market.type !== "player") continue;
          if (g.ownGoal || g.scorerId !== s.market.playerId) continue;
          const n = playerGoals(m, s.market);
          lines.push(
            n >= s.market.goals
              ? `🔥 <b>¡${esc(s.market.playerName)} lo cumplió! ${n}/${s.market.goals}</b>`
              : `🎯 Tu jugador ${esc(s.market.playerName)} lleva <b>${n}/${s.market.goals}</b>`,
          );
        }
      messages.push(lines.join("\n"));
    }

    if (before.state === "in" && m.state === "post") messages.push(`🏁 <b>Final</b> ${score(m)}`);
  }

  // --- Selecciones y boletos ---
  for (const b of bets) {
    next.bets[b.id] = b.state;
    const prevBet = prev?.bets[b.id];
    for (const s of b.selections) {
      const st = b.evals[s.id].state;
      next.sels[s.id] = st;
      const was = prev?.sels[s.id];
      if (!was || was === st) continue;
      if (b.selections.length > 1 && (st === "won" || st === "lost") && b.state !== "lost")
        messages.push(`${st === "won" ? "✅" : "❌"} ${esc(marketLabel(s))} <i>(${esc(s.home.name)} vs ${esc(s.away.name)})</i>`);
    }
    if (!prevBet || prevBet === b.state) continue;
    if (b.state === "won") {
      const pay = b.stake && b.odds ? `\n💰 Cobrás <b>$${(b.stake * b.odds).toFixed(0)}</b>` : "";
      messages.push(`🏆 <b>¡TIMBA GANADA!</b> ${betName(b)}${pay}`);
    } else if (b.state === "lost") {
      const failed = b.selections.filter((s) => b.evals[s.id].state === "lost").map((s) => esc(marketLabel(s)));
      messages.push(`💀 <b>Se cayó</b> ${betName(b)}\nFalló: ${failed.join(", ")}`);
    }
  }

  return { messages, next };
}
