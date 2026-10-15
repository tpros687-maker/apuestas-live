import { fetchMatchesByIds } from "./espn";
import { evaluateBet, type EvaluatedBet } from "./evaluate";
import type { Bet } from "./types";

/** Trae de ESPN todos los partidos de estas apuestas y las evalúa. */
export async function evaluateBets(bets: Bet[]): Promise<EvaluatedBet[]> {
  const wanted = bets.flatMap((b) => b.selections);
  const matches = await fetchMatchesByIds(wanted);
  return bets.map((b) => evaluateBet(b, matches));
}
