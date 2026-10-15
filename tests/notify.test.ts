import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateBet } from "../lib/evaluate.ts";
import { diff } from "../lib/notify.ts";
import type { Bet, Goal, Match } from "../lib/types.ts";

const base = (state: Match["state"], goals: Goal[]): Match => ({
  id: "e1",
  league: "uru.1",
  kickoff: "2026-10-15T22:00Z",
  state,
  statusText: "",
  home: { id: "1", name: "Nacional", abbr: "NAC" },
  away: { id: "2", name: "Peñarol", abbr: "PEN" },
  homeScore: goals.filter((g) => g.teamId === "1").length,
  awayScore: goals.filter((g) => g.teamId === "2").length,
  goals,
});
const g = (k: string, scorerId: string): Goal => ({ key: k, minute: `${k}'`, teamId: "1", scorerId, scorerName: "Goleador", ownGoal: false, penalty: false });

const bet: Bet = {
  id: "b1",
  createdAt: "2026-10-15T00:00:00Z",
  stake: 100,
  odds: 8,
  selections: [
    { id: "s1", eventId: "e1", league: "uru.1", kickoff: "", home: base("pre", []).home, away: base("pre", []).away, market: { type: "player", playerId: "9", playerName: "Goleador", teamId: "1", goals: 2 } },
  ],
};
const run = (m: Match, prev: Parameters<typeof diff>[1]) => diff([evaluateBet(bet, new Map([["e1", m]]))], prev);
const all = (r: ReturnType<typeof run>) => r.notices.map((n) => `${n.title} | ${n.body}`).join("\n");

test("primera vuelta no avisa; después avisa arranque, goles y resultado sin repetir", () => {
  const r0 = run(base("pre", []), null);
  assert.deepEqual(r0.notices, []);
  const r1 = run(base("in", []), r0.next);
  assert.match(all(r1), /Arrancó/);
  const r2 = run(base("in", [g("10", "9")]), r1.next);
  assert.equal(r2.notices.length, 1);
  assert.match(all(r2), /Gol de tu jugador Goleador[\s\S]*Lleva 1\/2/);
  const r3 = run(base("in", [g("10", "9")]), r2.next);
  assert.deepEqual(r3.notices, []);
  const r4 = run(base("in", [g("10", "9"), g("50", "9")]), r3.next);
  assert.match(all(r4), /lo cumplió! 2\/2/);
  assert.match(all(r4), /TIMBA GANADA[\s\S]*\$800/);
});

test("gol de otro jugador avisa como gol común", () => {
  const r1 = run(base("in", []), run(base("in", []), null).next);
  const r2 = run(base("in", [g("30", "7")]), r1.next);
  assert.match(all(r2), /^⚽ Gol de Nacional 30'/);
});
