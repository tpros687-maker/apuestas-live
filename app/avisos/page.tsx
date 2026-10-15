"use client";
import { useEffect, useState } from "react";

export default function Avisos() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/telegram-test").then((r) => r.json()).then((d) => setEnabled(d.enabled));
  }, []);

  async function test() {
    setMsg("Enviando…");
    const d = await fetch("/api/telegram-test", { method: "POST" }).then((r) => r.json());
    setMsg(d.ok ? "Listo, fijate en Telegram." : `No se envió: ${d.error ?? "revisá el token y el chat id"}`);
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-name">TIMBA</span>
          <span className="muted small">Avisos</span>
        </div>
        <div className="stat">
          <span className="stat-k">Telegram</span>
          <span className={`stat-v ${enabled ? "win" : "red"}`}>{enabled == null ? "…" : enabled ? "Conectado" : "Sin configurar"}</span>
        </div>
      </header>
      <section className="panel" style={{ maxWidth: 680 }}>
        <div className="panel-t" style={{ marginBottom: 8 }}>Qué te avisa</div>
        <p className="muted" style={{ marginTop: 0 }}>
          Cada gol en tus partidos con el goleador, cuánto lleva tu jugador (por ejemplo 2/3 en un hat-trick), cuando arranca y termina cada partido, y si el boleto se ganó o se cayó.
        </p>
        <div className="panel-t" style={{ margin: "18px 0 8px" }}>Cómo conectarlo</div>
        <ol className="muted" style={{ paddingLeft: 18, marginTop: 0, display: "grid", gap: 6 }}>
          <li>En Telegram, hablale a @BotFather, mandá /newbot y copiá el token.</li>
          <li>Mandale cualquier mensaje a tu bot nuevo.</li>
          <li>Abrí api.telegram.org/bot&lt;TOKEN&gt;/getUpdates y copiá el número de “chat” → “id”.</li>
          <li>Cargá TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en las variables de entorno de Vercel y volvé a desplegar.</li>
        </ol>
        <button className="btn primary" onClick={test} disabled={!enabled} style={{ marginTop: 12 }}>
          Mandar mensaje de prueba
        </button>
        {msg && <p className="small">{msg}</p>}
      </section>
    </>
  );
}
