import { fetchMatchesByIds } from "./espn";
import { evaluateBet, type EvaluatedBet } from "./evaluate";
import type { Bet, Match } from "./types";

/** Trae de ESPN todos los partidos de estas apuestas (una sola vez) y las evalúa. */
export async function evaluateBets(bets: Bet[], cache?: Map<string, Match>): Promise<EvaluatedBet[]> {
  const matches = cache ?? (await fetchMatchesByIds(bets.flatMap((b) => b.selections)));
  return bets.map((b) => evaluateBet(b, matches));
}
