// ---------- Datos de partido (normalizados desde ESPN) ----------

export type MatchState = "pre" | "in" | "post" | "void";

export interface TeamRef {
  id: string;
  name: string;
  abbr: string;
  logo?: string;
}

export interface Goal {
  key: string; // identificador estable del gol, para no notificarlo dos veces
  minute: string; // "23'" / "90'+2'"
  teamId: string; // equipo al que se le suma el gol
  scorerId?: string;
  scorerName?: string;
  ownGoal: boolean;
  penalty: boolean;
}

export interface Match {
  id: string;
  league: string;
  kickoff: string; // ISO
  state: MatchState;
  statusText: string; // "FT", "45'+1'", "HT", "19:00"
  clock?: string;
  home: TeamRef;
  away: TeamRef;
  homeScore: number;
  awayScore: number;
  goals: Goal[];
}

// ---------- Apuestas ----------

export type Market =
  | { type: "result"; pick: "home" | "draw" | "away" }
  | { type: "double"; pick: "1X" | "12" | "X2" }
  | { type: "total"; side: "over" | "under"; line: number }
  | { type: "btts"; pick: "yes" | "no" }
  | { type: "player"; playerId: string; playerName: string; teamId: string; goals: number };

export interface Selection {
  id: string;
  eventId: string;
  league: string;
  kickoff: string;
  home: TeamRef;
  away: TeamRef;
  market: Market;
}

export interface Bet {
  id: string;
  createdAt: string;
  name?: string;
  stake?: number;
  odds?: number;
  selections: Selection[];
}

// ---------- Resultado de evaluar ----------

export type SelState = "pending" | "winning" | "losing" | "won" | "lost" | "void";

export interface SelectionEval {
  state: SelState;
  detail: string; // "Suárez 2/3", "Van 3 goles (necesitás +2.5) ✓"
}

export type BetState = "pending" | "live-winning" | "live-losing" | "won" | "lost" | "void";
