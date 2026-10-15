"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { marketLabel } from "@/lib/evaluate";
import { hora, hoyLocal, money, statusLine } from "@/lib/format";
import { LEAGUES, leagueName } from "@/lib/leagues";
import type { Market, Match, Selection } from "@/lib/types";

type Draft = Omit<Selection, "id"> & { key: string };
interface Player { id: string; name: string; jersey?: string; position?: string }

const LINES = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5];
const PLAYER_GOALS = [
  { n: 1, label: "Marca" },
  { n: 2, label: "Doblete" },
  { n: 3, label: "Hat-trick" },
];

export default function Builder() {
  const router = useRouter();
  const [league, setLeague] = useState(LEAGUES[0].code);
  const [date, setDate] = useState(hoyLocal());
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [match, setMatch] = useState<Match | null>(null);
  const [slip, setSlip] = useState<Draft[]>([]);
  const [name, setName] = useState("");
  const [stake, setStake] = useState("");
  const [odds, setOdds] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let alive = true;
    setMatches(null);
    setMatch(null);
    setLoadError("");
    fetch(`/api/matches?league=${league}&date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setMatches(d.matches ?? []);
        if (d.error) setLoadError("ESPN no respondió. Probá de nuevo en un rato.");
      })
      .catch(() => alive && (setMatches([]), setLoadError("No se pudo conectar con ESPN.")));
    return () => {
      alive = false;
    };
  }, [league, date]);

  function add(m: Match, market: Market) {
    const key = `${m.id}:${JSON.stringify(market)}`;
    if (slip.some((s) => s.key === key)) return;
    setSlip((prev) => [
      ...prev,
      { key, eventId: m.id, league: m.league, kickoff: m.kickoff, home: m.home, away: m.away, market },
    ]);
  }

  const payout = Number(stake) > 0 && Number(odds) > 1 ? Number(stake) * Number(odds) : 0;

  async function save() {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, stake: Number(stake) || undefined, odds: Number(odds) || undefined, selections: slip }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `Error ${res.status}`);
      router.push("/");
    } catch (e) {
      setSaveError(`No se guardó: ${e instanceof Error ? e.message : e}`);
      setSaving(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-name">TIMBA</span>
          <span className="muted small">Nueva apuesta</span>
        </div>
        <div className="stat">
          <span className="stat-k">Selecciones</span>
          <span className="stat-v">{slip.length}</span>
        </div>
        <div className="stat">
          <span className="stat-k">Cobro si sale</span>
          <span className="stat-v red">{payout ? money(payout) : "—"}</span>
        </div>
      </header>

      <div className="grid">
        {/* ---- Liga y fecha ---- */}
        <section className="panel">
          <div className="field" style={{ marginBottom: 14 }}>
            <label htmlFor="date">Fecha</label>
            <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="panel-t" style={{ marginBottom: 8 }}>Liga</div>
          <div className="league-list">
            {LEAGUES.map((l) => (
              <button key={l.code} className="ticket" aria-pressed={league === l.code} onClick={() => setLeague(l.code)} style={{ gridTemplateColumns: "1fr" }}>
                <span className="ticket-name">{l.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ---- Partidos y mercados ---- */}
        <section className="panel">
          <div className="panel-h">
            <span className="panel-t">{leagueName(league)}</span>
            {match && (
              <button className="btn ghost" onClick={() => setMatch(null)}>
                Ver todos los partidos
              </button>
            )}
          </div>
          {loadError && <p className="error">{loadError}</p>}
          {!matches && <p className="muted small">Buscando partidos…</p>}
          {matches && matches.length === 0 && !loadError && (
            <p className="muted small">No hay partidos de esta liga ese día. Probá otra fecha o liga.</p>
          )}
          {!match &&
            matches?.map((m) => (
              <button key={m.id} className="match-btn" onClick={() => setMatch(m)}>
                <span className="match-time">{m.state === "pre" ? hora(m.kickoff) : m.state === "in" ? "●" : "FT"}</span>
                <span>
                  <span style={{ display: "block", fontWeight: 600 }}>
                    {m.home.name} {m.state !== "pre" ? `${m.homeScore}-${m.awayScore}` : "vs"} {m.away.name}
                  </span>
                  <span className="muted small">{statusLine(m)}</span>
                </span>
              </button>
            ))}
          {match && <Markets m={match} onAdd={(mk) => add(match, mk)} slip={slip} />}
        </section>

        {/* ---- Boleto ---- */}
        <section className="panel col-feed">
          <div className="panel-h">
            <span className="panel-t">Tu boleto</span>
            {slip.length > 1 && <span className="chip">Combinada x{slip.length}</span>}
          </div>
          {slip.length === 0 && <p className="muted small">Elegí un partido y tocá lo que jugaste. Podés sumar partidos de distintas ligas.</p>}
          {slip.map((s) => (
            <div className="slip-item" key={s.key}>
              <div>
                <div style={{ fontWeight: 600 }}>{marketLabel(s)}</div>
                <div className="muted small">
                  {s.home.name} vs {s.away.name} · {hora(s.kickoff)}
                </div>
              </div>
              <button className="x" aria-label="Quitar" onClick={() => setSlip((p) => p.filter((x) => x.key !== s.key))}>
                ×
              </button>
            </div>
          ))}
          {slip.length > 0 && (
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <div className="field">
                <label htmlFor="name">Nombre (opcional)</label>
                <input id="name" className="input" placeholder="La del sábado" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="row" style={{ flexWrap: "nowrap" }}>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="stake">Monto</label>
                  <input id="stake" className="input" inputMode="decimal" placeholder="500" value={stake} onChange={(e) => setStake(e.target.value)} />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="odds">Cuota total</label>
                  <input id="odds" className="input" inputMode="decimal" placeholder="8.50" value={odds} onChange={(e) => setOdds(e.target.value.replace(",", "."))} />
                </div>
              </div>
              <button className="btn primary" onClick={save} disabled={saving}>
                {saving ? "Guardando…" : "Guardar y seguir en vivo"}
              </button>
              {saveError && <p className="error">{saveError}</p>}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Markets({ m, onAdd, slip }: { m: Match; onAdd: (mk: Market) => void; slip: Draft[] }) {
  const [line, setLine] = useState(2.5);
  const inSlip = (mk: Market) => slip.some((s) => s.key === `${m.id}:${JSON.stringify(mk)}`);
  const P = ({ mk, children }: { mk: Market; children: React.ReactNode }) => (
    <button className="pick" aria-pressed={inSlip(mk)} onClick={() => onAdd(mk)}>
      {children}
    </button>
  );

  return (
    <div>
      <div className="match" style={{ marginBottom: 6 }}>
        <div className="match-top">
          <div className="team home">
            {m.home.logo && <img src={m.home.logo} alt="" />}
            <span>{m.home.name}</span>
          </div>
          <div className="score">
            <div className="score-n">{m.state === "pre" ? hora(m.kickoff) : `${m.homeScore} - ${m.awayScore}`}</div>
            <div className="score-s">{statusLine(m)}</div>
          </div>
          <div className="team away">
            <span>{m.away.name}</span>
            {m.away.logo && <img src={m.away.logo} alt="" />}
          </div>
        </div>
      </div>

      <div className="group-t">Resultado</div>
      <div className="pick-grid">
        <P mk={{ type: "result", pick: "home" }}>Gana {m.home.name}</P>
        <P mk={{ type: "result", pick: "draw" }}>Empate</P>
        <P mk={{ type: "result", pick: "away" }}>Gana {m.away.name}</P>
      </div>

      <div className="group-t">Doble oportunidad</div>
      <div className="pick-grid">
        <P mk={{ type: "double", pick: "1X" }}>{m.home.name} o empate</P>
        <P mk={{ type: "double", pick: "12" }}>Cualquiera gana</P>
        <P mk={{ type: "double", pick: "X2" }}>{m.away.name} o empate</P>
      </div>

      <div className="group-t">Goles totales</div>
      <div className="seg" role="group" aria-label="Línea de goles" style={{ marginTop: 6, flexWrap: "wrap" }}>
        {LINES.map((l) => (
          <button key={l} aria-pressed={line === l} onClick={() => setLine(l)}>
            {l}
          </button>
        ))}
      </div>
      <div className="pick-grid">
        <P mk={{ type: "total", side: "over", line }}>Más de {line}</P>
        <P mk={{ type: "total", side: "under", line }}>Menos de {line}</P>
      </div>

      <div className="group-t">Ambos marcan</div>
      <div className="pick-grid">
        <P mk={{ type: "btts", pick: "yes" }}>Sí</P>
        <P mk={{ type: "btts", pick: "no" }}>No</P>
      </div>

      <PlayerPicker m={m} onAdd={onAdd} />
    </div>
  );
}

function PlayerPicker({ m, onAdd }: { m: Match; onAdd: (mk: Market) => void }) {
  const [side, setSide] = useState<"home" | "away">("home");
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [q, setQ] = useState("");
  const [player, setPlayer] = useState<Player | null>(null);
  const [goals, setGoals] = useState(1);
  const team = side === "home" ? m.home : m.away;

  useEffect(() => {
    setPlayers(null);
    setPlayer(null);
    fetch(`/api/roster?league=${m.league}&team=${team.id}`)
      .then((r) => r.json())
      .then((d) => setPlayers(d.players ?? []))
      .catch(() => setPlayers([]));
  }, [m.league, team.id]);

  const list = useMemo(() => {
    const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const order = (p?: string) => (p === "F" ? 0 : p === "M" ? 1 : p === "D" ? 2 : 3);
    return (players ?? [])
      .filter((p) => norm(p.name).includes(norm(q)))
      .sort((a, b) => order(a.position) - order(b.position));
  }, [players, q]);

  return (
    <>
      <div className="group-t">Goles de un jugador</div>
      <div className="row" style={{ marginTop: 6 }}>
        <div className="seg" role="group" aria-label="Equipo">
          <button aria-pressed={side === "home"} onClick={() => setSide("home")}>{m.home.name}</button>
          <button aria-pressed={side === "away"} onClick={() => setSide("away")}>{m.away.name}</button>
        </div>
        <div className="seg" role="group" aria-label="Cantidad de goles">
          {PLAYER_GOALS.map((g) => (
            <button key={g.n} aria-pressed={goals === g.n} onClick={() => setGoals(g.n)}>
              {g.label}
            </button>
          ))}
        </div>
      </div>
      <input className="input" style={{ marginTop: 10 }} placeholder={`Buscar jugador de ${team.name}`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar jugador" />
      <div className="player-list">
        {!players && <span className="muted small">Cargando plantel…</span>}
        {players && players.length === 0 && <span className="muted small">ESPN no tiene el plantel de este equipo.</span>}
        {list.map((p) => (
          <button key={p.id} className="player" aria-pressed={player?.id === p.id} onClick={() => setPlayer(p)}>
            <span>
              {p.jersey ? <span className="muted">{p.jersey} </span> : null}
              {p.name}
            </span>
            <span className="muted small">{p.position}</span>
          </button>
        ))}
      </div>
      <button
        className="btn primary"
        style={{ marginTop: 10 }}
        disabled={!player}
        onClick={() => player && onAdd({ type: "player", playerId: player.id, playerName: player.name, teamId: team.id, goals })}
      >
        {player ? `Agregar: ${player.name} ${PLAYER_GOALS.find((g) => g.n === goals)!.label.toLowerCase()}` : "Elegí un jugador"}
      </button>
    </>
  );
}
