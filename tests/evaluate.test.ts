import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEvent } from "../lib/espn-parse.ts";
import { betState, evaluateSelection } from "../lib/evaluate.ts";
import type { Market, Match, Selection } from "../lib/types.ts";

// Recorte fiel de un evento real de ESPN (España 4-1 Croacia, 29/09/2026).
const goal = (min: number, team: string, id: string, name: string, extra = {}) => ({
  type: { text: "Goal" },
  clock: { value: min * 60, displayValue: `${min}'` },
  team: { id: team },
  scoringPlay: true,
  ownGoal: false,
  penaltyKick: false,
  shootout: false,
  athletesInvolved: [{ id, displayName: name, team: { id: team } }],
  ...extra,
});
const espnEvent = (state: "pre" | "in" | "post", details: unknown[], score: [string, string]) => ({
  id: "401861084",
  date: "2026-09-29T18:45Z",
  competitions: [
    {
      status: { displayClock: "90'+2'", type: { name: state === "post" ? "STATUS_FULL_TIME" : "STATUS_FIRST_HALF", state, shortDetail: state === "post" ? "FT" : "63'" } },
      competitors: [
        { homeAway: "home", score: score[0], team: { id: "164", shortDisplayName: "Spain", abbreviation: "ESP" } },
        { homeAway: "away", score: score[1], team: { id: "477", shortDisplayName: "Croatia", abbreviation: "CRO" } },
      ],
      details: [
        goal(2, "164", "362150", "Lamine Yamal"),
        { type: { text: "Yellow Card" }, scoringPlay: false, team: { id: "477" }, clock: { value: 1059, displayValue: "18'" } },
        goal(28, "477", "306647", "Dion Drena Beljo"),
        goal(31, "164", "332613", "Marc Pubill"),
        goal(63, "164", "362150", "Lamine Yamal"),
        ...details,
      ],
    },
  ],
});

const sel = (market: Market, m: Match): Selection => ({
  id: "s1",
  eventId: m.id,
  league: "fifa.friendly",
  kickoff: m.kickoff,
  home: m.home,
  away: m.away,
  market,
});

test("parsea goles, ignora tarjetas", () => {
  const m = parseEvent(espnEvent("in", [], ["3", "1"]), "x");
  assert.equal(m.goals.length, 4);
  assert.equal(m.home.name, "Spain");
  assert.equal(m.homeScore, 3);
  assert.equal(m.goals[0].scorerName, "Lamine Yamal");
});

test("gol en contra suma al rival del jugador", () => {
  const og = goal(70, "477", "999", "Defensor Croata", { ownGoal: true });
  const m = parseEvent(espnEvent("in", [og], ["4", "1"]), "x");
  assert.equal(m.goals.at(-1)!.teamId, "164");
});

test("hat-trick en vivo: 2/3 va perdiendo, al final se pierde", () => {
  const mk: Market = { type: "player", playerId: "362150", playerName: "Lamine Yamal", teamId: "164", goals: 3 };
  const live = parseEvent(espnEvent("in", [], ["3", "1"]), "x");
  assert.deepEqual(evaluateSelection(sel(mk, live), live), { state: "losing", detail: "Lamine Yamal 2/3" });
  const fin = parseEvent(espnEvent("post", [goal(89, "164", "312146", "Nico Williams")], ["4", "1"]), "x");
  assert.equal(evaluateSelection(sel(mk, fin), fin).state, "lost");
});

test("doblete se gana apenas llega al segundo gol", () => {
  const mk: Market = { type: "player", playerId: "362150", playerName: "Lamine Yamal", teamId: "164", goals: 2 };
  const live = parseEvent(espnEvent("in", [], ["3", "1"]), "x");
  assert.equal(evaluateSelection(sel(mk, live), live).state, "won");
});

test("un gol en contra no cuenta para el jugador", () => {
  const mk: Market = { type: "player", playerId: "999", playerName: "Defensor Croata", teamId: "477", goals: 1 };
  const og = goal(70, "477", "999", "Defensor Croata", { ownGoal: true });
  const m = parseEvent(espnEvent("post", [og], ["4", "1"]), "x");
  assert.equal(evaluateSelection(sel(mk, m), m).state, "lost");
});

test("resultado, más/menos y ambos marcan", () => {
  const live = parseEvent(espnEvent("in", [], ["3", "1"]), "x");
  assert.equal(evaluateSelection(sel({ type: "result", pick: "home" }, live), live).state, "winning");
  assert.equal(evaluateSelection(sel({ type: "result", pick: "draw" }, live), live).state, "losing");
  assert.equal(evaluateSelection(sel({ type: "total", side: "over", line: 2.5 }, live), live).state, "won");
  assert.equal(evaluateSelection(sel({ type: "total", side: "under", line: 4.5 }, live), live).state, "winning");
  assert.equal(evaluateSelection(sel({ type: "total", side: "under", line: 3.5 }, live), live).state, "lost");
  assert.equal(evaluateSelection(sel({ type: "btts", pick: "yes" }, live), live).state, "won");
  assert.equal(evaluateSelection(sel({ type: "double", pick: "X2" }, live), live).state, "losing");
  const fin = parseEvent(espnEvent("post", [], ["3", "1"]), "x");
  assert.equal(evaluateSelection(sel({ type: "result", pick: "home" }, fin), fin).state, "won");
});

test("partido sin empezar y combinadas", () => {
  const pre = parseEvent(espnEvent("pre", [], ["0", "0"]), "x");
  pre.goals = [];
  assert.equal(evaluateSelection(sel({ type: "result", pick: "home" }, pre), pre).state, "pending");
  const e = (state: any) => ({ state, detail: "" });
  assert.equal(betState([e("won"), e("lost"), e("winning")]), "lost");
  assert.equal(betState([e("won"), e("won"), e("void")]), "won");
  assert.equal(betState([e("won"), e("winning"), e("pending")]), "live-winning");
  assert.equal(betState([e("won"), e("losing")]), "live-losing");
});
