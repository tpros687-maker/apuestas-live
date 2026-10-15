import { marketLabel, playerGoals, type EvaluatedBet } from "./evaluate.ts";
import type { BetState, Match, SelState } from "./types.ts";

export interface Snapshot {
  matches: Record<string, { state: string; goals: string[] }>;
  sels: Record<string, SelState>;
  bets: Record<string, BetState>;
}

export interface Notice {
  title: string;
  body: string;
  tag?: string; // agrupa avisos del mismo partido
}

const score = (m: Match) => `${m.home.name} ${m.homeScore}-${m.awayScore} ${m.away.name}`;
const betName = (b: EvaluatedBet) => b.name || (b.selections.length > 1 ? `Combinada x${b.selections.length}` : "Simple");
const money = (n: number) => `$${Math.round(n).toLocaleString("es-UY")}`;

/**
 * Compara el estado actual con el de la vuelta anterior y arma los avisos de un usuario.
 * La primera vez que ve un partido o apuesta solo guarda la base (no avisa lo que ya pasó).
 */
export function diff(bets: EvaluatedBet[], prev: Snapshot | null): { notices: Notice[]; next: Snapshot } {
  const next: Snapshot = { matches: {}, sels: {}, bets: {} };
  const notices: Notice[] = [];
  const allMatches = new Map<string, Match>();
  for (const b of bets) for (const m of Object.values(b.matches)) allMatches.set(m.id, m);

  // --- Eventos de partido (una vez por partido, aunque esté en varias apuestas) ---
  for (const m of allMatches.values()) {
    const before = prev?.matches[m.id];
    next.matches[m.id] = { state: m.state, goals: m.goals.map((g) => g.key) };
    if (!before) continue;

    if (before.state === "pre" && m.state === "in")
      notices.push({ title: "🟢 Arrancó", body: `${m.home.name} vs ${m.away.name}`, tag: m.id });

    for (const g of m.goals) {
      if (before.goals.includes(g.key)) continue;
      const team = g.teamId === m.home.id ? m.home.name : m.away.name;
      const who = g.scorerName ? ` · ${g.scorerName}${g.ownGoal ? " (en contra)" : g.penalty ? " (penal)" : ""}` : "";
      let title = `⚽ Gol de ${team} ${g.minute}`;
      const lines = [`${score(m)}${who}`];
      // ¿Afecta a alguna apuesta de jugador?
      for (const b of bets)
        for (const s of b.selections) {
          if (s.eventId !== m.id || s.market.type !== "player") continue;
          if (g.ownGoal || g.scorerId !== s.market.playerId) continue;
          const n = playerGoals(m, s.market);
          if (n >= s.market.goals) {
            title = `🔥 ¡${s.market.playerName} lo cumplió! ${n}/${s.market.goals}`;
          } else {
            title = `🎯 Gol de tu jugador ${s.market.playerName}`;
            lines.push(`Lleva ${n}/${s.market.goals}`);
          }
        }
      notices.push({ title, body: lines.join("\n"), tag: `${m.id}-${g.key}` });
    }

    if (before.state === "in" && m.state === "post") notices.push({ title: "🏁 Final", body: score(m), tag: m.id });
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
        notices.push({
          title: `${st === "won" ? "✅ Salió" : "❌ No salió"}: ${marketLabel(s)}`,
          body: `${s.home.name} vs ${s.away.name} · ${betName(b)}`,
        });
    }
    if (!prevBet || prevBet === b.state) continue;
    if (b.state === "won") {
      notices.push({
        title: "🏆 ¡TIMBA GANADA!",
        body: `${betName(b)}${b.stake && b.odds ? ` · Cobrás ${money(b.stake * b.odds)}` : ""}`,
        tag: b.id,
      });
    } else if (b.state === "lost") {
      const failed = b.selections.filter((s) => b.evals[s.id].state === "lost").map((s) => marketLabel(s));
      notices.push({ title: `💀 Se cayó ${betName(b)}`, body: `Falló: ${failed.join(", ")}`, tag: b.id });
    }
  }

  return { notices, next };
}
