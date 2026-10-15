"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { EvaluatedBet } from "@/lib/evaluate";
import { hora, minuteNum, money } from "@/lib/format";
import type { Match, Selection } from "@/lib/types";
import { IconBall, IconFlag, IconPlus, IconTrash } from "./icons";
import MatchCard from "./MatchCard";
import StateChip, { pipClass } from "./StateChip";

const REFRESH_MS = 20_000;
const FINAL = ["won", "lost", "void"];
const betTitle = (b: EvaluatedBet) => b.name || (b.selections.length > 1 ? `Combinada x${b.selections.length}` : "Simple");

export default function Dashboard() {
  const [bets, setBets] = useState<EvaluatedBet[] | null>(null);
  const [at, setAt] = useState<string>("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/bets", { cache: "no-store" });
      if (res.status === 401) {
        location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setBets(data.bets);
      setAt(data.at);
      setError("");
    } catch (e) {
      setError(`No se pudo actualizar (${String(e)}). Reintento en 20 s.`);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const visible = useMemo(
    () => (bets ?? []).filter((b) => filter === "all" || !FINAL.includes(b.state)),
    [bets, filter],
  );
  const current = visible.find((b) => b.id === selected) ?? visible[0];

  // Métricas de la barra superior
  const stats = useMemo(() => {
    const all = bets ?? [];
    const open = all.filter((b) => !FINAL.includes(b.state));
    const liveMatches = new Set(all.flatMap((b) => Object.values(b.matches).filter((m) => m.state === "in").map((m) => m.id)));
    const won = all.filter((b) => b.state === "won").length;
    const potential = open.reduce((acc, b) => acc + (b.stake && b.odds ? b.stake * b.odds : 0), 0);
    return { open: open.length, live: liveMatches.size, won, potential };
  }, [bets]);

  async function remove(id: string) {
    if (!confirm("¿Borrar este boleto? No se puede deshacer.")) return;
    await fetch(`/api/bets/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-name">TIMBA</span>
          <span className="live-tag">
            <span className="live-dot" /> LIVE
          </span>
        </div>
        <div className="stat">
          <span className="stat-k">Boletos abiertos</span>
          <span className="stat-v">{stats.open}</span>
        </div>
        <div className="stat">
          <span className="stat-k">Partidos en juego</span>
          <span className="stat-v red">{stats.live}</span>
        </div>
        <div className="stat">
          <span className="stat-k">Ganados</span>
          <span className="stat-v win">{stats.won}</span>
        </div>
        <div className="stat">
          <span className="stat-k">Cobro posible</span>
          <span className="stat-v">{money(stats.potential)}</span>
        </div>
        <div className="topbar-end">
          <span className="muted small">{at ? `Actualizado ${hora(at)}` : "Cargando…"}</span>
          <Link href="/nueva" className="btn primary">
            <IconPlus size={16} /> Nueva apuesta
          </Link>
        </div>
      </header>
      {error && <p className="error">{error}</p>}

      {bets && bets.length === 0 ? (
        <section className="panel empty">
          <h2>Todavía no cargaste ninguna timba</h2>
          <p className="muted">Armá tu boleto con los partidos que jugaste y acá vas a ver cómo va cada uno, minuto a minuto.</p>
          <Link href="/nueva" className="btn primary">
            <IconPlus size={16} /> Cargar mi primera apuesta
          </Link>
        </section>
      ) : (
        <div className="grid">
          {/* ---- Lista de boletos ---- */}
          <section className="panel">
            <div className="panel-h">
              <span className="panel-t">Mis boletos</span>
              <div className="seg" role="group" aria-label="Filtrar boletos">
                <button aria-pressed={filter === "open"} onClick={() => setFilter("open")}>Abiertos</button>
                <button aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Todos</button>
              </div>
            </div>
            {!bets && <p className="muted small">Cargando…</p>}
            {bets && visible.length === 0 && <p className="muted small">No tenés boletos abiertos. Mirá “Todos” para ver los cerrados.</p>}
            {visible.map((b, i) => (
              <button key={b.id} className="ticket" aria-pressed={b.id === current?.id} onClick={() => setSelected(b.id)}>
                <span className="ticket-n">{i + 1}</span>
                <span style={{ minWidth: 0 }}>
                  <span className="ticket-name" style={{ display: "block" }}>{betTitle(b)}</span>
                  <span className="ticket-sub">
                    {b.selections.length} {b.selections.length === 1 ? "selección" : "selecciones"}
                    {b.odds ? ` · cuota ${b.odds}` : ""}
                  </span>
                </span>
                <span className="pips" aria-hidden="true">
                  {b.selections.map((s) => (
                    <span key={s.id} className={`pip ${pipClass(b.evals[s.id]?.state ?? "pending")}`} />
                  ))}
                </span>
              </button>
            ))}
          </section>

          {/* ---- Boleto seleccionado ---- */}
          <section className="panel">
            {current ? <BetDetail bet={current} onRemove={() => remove(current.id)} /> : <p className="muted">Elegí un boleto.</p>}
          </section>

          {/* ---- Feed de eventos ---- */}
          <section className="panel col-feed">
            <div className="panel-h">
              <span className="panel-t">Lo que pasó</span>
              <span className="live-tag"><span className="live-dot" /> en vivo</span>
            </div>
            <Feed bets={bets ?? []} />
          </section>
        </div>
      )}
    </>
  );
}

function BetDetail({ bet, onRemove }: { bet: EvaluatedBet; onRemove: () => void }) {
  // Agrupamos selecciones por partido (ej. "gana Nacional" + "Suárez marca" en el mismo partido).
  const groups = new Map<string, Selection[]>();
  for (const s of bet.selections) groups.set(s.eventId, [...(groups.get(s.eventId) ?? []), s]);
  const settled = bet.selections.filter((s) => ["won", "lost", "void"].includes(bet.evals[s.id]?.state)).length;

  return (
    <>
      <div className="hero">
        <div>
          <div className="row" style={{ alignItems: "baseline", gap: 14 }}>
            <span className="hero-n">
              {settled}/{bet.selections.length}
            </span>
            <span className="hero-name">{betTitle(bet)}</span>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <StateChip state={bet.state} />
            <span className="muted small">resueltas</span>
          </div>
        </div>
        <div className="hero-pay">
          {bet.stake && bet.odds ? (
            <>
              <div className="stat-k">{bet.state === "won" ? "Cobrás" : "Cobro si sale"}</div>
              <div className={`stat-v ${bet.state === "lost" ? "" : "red"}`}>{money(bet.stake * bet.odds)}</div>
              <div className="muted small">
                {money(bet.stake)} × {bet.odds}
              </div>
            </>
          ) : null}
          <button className="btn ghost" style={{ marginTop: 8 }} onClick={onRemove} aria-label="Borrar boleto">
            <IconTrash /> Borrar
          </button>
        </div>
      </div>
      {[...groups.entries()].map(([eventId, sels]) => (
        <MatchCard key={eventId} match={bet.matches[eventId]} selections={sels} evals={bet.evals} />
      ))}
    </>
  );
}

function Feed({ bets }: { bets: EvaluatedBet[] }) {
  const items = useMemo(() => {
    const matches = new Map<string, Match>();
    const mine = new Set<string>();
    for (const b of bets) {
      for (const m of Object.values(b.matches)) matches.set(m.id, m);
      for (const s of b.selections) if (s.market.type === "player") mine.add(s.market.playerId);
    }
    type Item = { key: string; t: number; text: string; meta: string; kind: "goal" | "end"; mine: boolean };
    const out: Item[] = [];
    for (const m of matches.values()) {
      const k0 = new Date(m.kickoff).getTime();
      const vs = `${m.home.name} ${m.homeScore}-${m.awayScore} ${m.away.name}`;
      for (const g of m.goals) {
        const min = minuteNum(g.minute) ?? 0;
        const team = g.teamId === m.home.id ? m.home.name : m.away.name;
        out.push({
          key: m.id + g.key,
          // aproximamos la hora real sumando el entretiempo a los goles del segundo tiempo
          t: k0 + (min + (min > 45 ? 15 : 0)) * 60_000,
          text: `Gol de ${team}${g.scorerName ? ` — ${g.scorerName}` : ""}${g.ownGoal ? " (en contra)" : g.penalty ? " (penal)" : ""}`,
          meta: `${g.minute} · ${m.home.abbr || m.home.name} vs ${m.away.abbr || m.away.name}`,
          kind: "goal",
          mine: Boolean(g.scorerId && mine.has(g.scorerId) && !g.ownGoal),
        });
      }
      if (m.state === "post")
        out.push({ key: m.id + "end", t: k0 + 115 * 60_000, text: `Final: ${vs}`, meta: "Terminó", kind: "end", mine: false });
    }
    return out.sort((a, b) => b.t - a.t).slice(0, 30);
  }, [bets]);

  if (!items.length) return <p className="muted small">Cuando haya goles en tus partidos, aparecen acá.</p>;
  return (
    <div>
      {items.map((it) => (
        <div className="feed-item" key={it.key}>
          <span className={`feed-ic${it.mine ? " mine" : ""}`}>{it.kind === "goal" ? <IconBall /> : <IconFlag />}</span>
          <div>
            <div className="feed-meta">{it.meta}</div>
            <div className="feed-text">{it.mine ? <b>{it.text} · ¡tu jugador!</b> : it.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
