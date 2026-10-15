import { marketLabel } from "@/lib/evaluate";
import { currentMinute, minuteNum, statusLine } from "@/lib/format";
import type { Match, Selection, SelectionEval, TeamRef } from "@/lib/types";
import StateChip from "./StateChip";

const lastName = (n?: string) => (n ? n.split(" ").slice(-1)[0] : "?");
const SCALE = 96; // 90' + un poco de descuento

function Team({ t, side }: { t: TeamRef; side: "home" | "away" }) {
  return (
    <div className={`team ${side}`}>
      {side === "away" && <span>{t.name}</span>}
      {t.logo ? <img src={t.logo} alt="" /> : null}
      {side === "home" && <span>{t.name}</span>}
    </div>
  );
}

/** La pista: línea luminosa del 0' al 90' con los goles como nodos. */
export function MinuteTrack({ m, mine }: { m: Match; mine: Set<string> }) {
  const now = currentMinute(m);
  const pos = (min: number) => `${(Math.min(min, SCALE) / SCALE) * 100}%`;
  return (
    <div className="track" role="img" aria-label={`Minuto ${now}. ${m.goals.length} goles.`}>
      <div className="track-base" />
      {m.state !== "pre" && <div className="track-fill" style={{ width: pos(now) }} />}
      {m.state === "in" && <div className="track-head" style={{ left: pos(now) }} />}
      {[0, 45, 90].map((t) => (
        <div key={t} className="track-tick" style={{ left: pos(t) }}>
          {t}&apos;
        </div>
      ))}
      {m.goals.map((g) => {
        const side = g.teamId === m.home.id ? "home" : "away";
        const isMine = Boolean(g.scorerId && mine.has(g.scorerId) && !g.ownGoal);
        return (
          <div key={g.key} className={`goal-node ${side}${isMine ? " mine" : ""}`} style={{ left: pos(minuteNum(g.minute) ?? 0) }}>
            <span className="dot" />
            <span className="lbl">
              {lastName(g.scorerName)} {g.minute}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function MatchCard({
  match,
  selections,
  evals,
}: {
  match?: Match;
  selections: Selection[];
  evals: Record<string, SelectionEval>;
}) {
  const s0 = selections[0];
  const m: Match =
    match ??
    ({ id: s0.eventId, league: s0.league, kickoff: s0.kickoff, state: "pre", statusText: "", home: s0.home, away: s0.away, homeScore: 0, awayScore: 0, goals: [] } as Match);
  const mine = new Set(selections.flatMap((s) => (s.market.type === "player" ? [s.market.playerId] : [])));
  const homeGoals = m.goals.filter((g) => g.teamId === m.home.id);
  const awayGoals = m.goals.filter((g) => g.teamId === m.away.id);
  const fmt = (g: Match["goals"][number]) => (
    <div key={g.key}>
      <b>{g.scorerName ?? "?"}</b> {g.minute}
      {g.penalty ? " (p)" : g.ownGoal ? " (e.c.)" : ""}
    </div>
  );

  return (
    <article className="match">
      <div className="match-top">
        <Team t={m.home} side="home" />
        <div className="score">
          <div className="score-n">{m.state === "pre" ? "vs" : `${m.homeScore} - ${m.awayScore}`}</div>
          <div className={`score-s${m.state === "in" ? " live" : ""}`}>{statusLine(m)}</div>
        </div>
        <Team t={m.away} side="away" />
      </div>

      <MinuteTrack m={m} mine={mine} />

      {m.goals.length > 0 && (
        <div className="scorers">
          <div>{homeGoals.length ? homeGoals.map(fmt) : <span className="muted">Sin goles</span>}</div>
          <div className="away">{awayGoals.length ? awayGoals.map(fmt) : <span className="muted">Sin goles</span>}</div>
        </div>
      )}

      {selections.map((s) => (
        <div className="sel-row" key={s.id}>
          <div>
            <div className="sel-label">{marketLabel(s)}</div>
            <div className="sel-detail">{evals[s.id]?.detail}</div>
          </div>
          <StateChip state={evals[s.id]?.state ?? "pending"} />
        </div>
      ))}
    </article>
  );
}
