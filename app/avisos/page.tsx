"use client";
import { useEffect, useState } from "react";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function b64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type Status = "loading" | "unsupported" | "ios-install" | "off" | "denied" | "on";

export default function Avisos() {
  const [status, setStatus] = useState<Status>("loading");
  const [serverOk, setServerOk] = useState(true);
  const [devices, setDevices] = useState(0);
  const [msg, setMsg] = useState("");
  const [invite, setInvite] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    const d = await fetch("/api/push").then((r) => r.json()).catch(() => ({}));
    setServerOk(Boolean(d.enabled));
    setDevices(d.devices ?? 0);
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus(ios && !standalone ? "ios-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") return setStatus("denied");
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    setStatus(sub ? "on" : "off");
  }

  useEffect(() => {
    refresh();
    fetch("/api/me").then((r) => r.json()).then((d) => setInvite(d.inviteCode ?? null)).catch(() => {});
  }, []);

  async function enable() {
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return refresh();
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID) });
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await refresh();
      setMsg("Listo. Mandá una prueba para confirmar.");
    } catch (e) {
      setMsg(`No se pudo activar: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function disable() {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setMsg("Ya no te llegan avisos en este dispositivo.");
    refresh();
  }

  async function test() {
    setMsg("Enviando…");
    const d = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ test: true }) }).then((r) => r.json());
    setMsg(d.ok ? "Enviada. Debería aparecerte en unos segundos." : "No se envió. Probá desactivar y volver a activar.");
  }

  const inviteLink = invite && typeof location !== "undefined" ? `${location.origin}/login?invite=${encodeURIComponent(invite)}` : "";

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-name">TIMBA</span>
          <span className="muted small">Avisos y amigos</span>
        </div>
        <div className="stat">
          <span className="stat-k">Este dispositivo</span>
          <span className={`stat-v ${status === "on" ? "win" : "red"}`}>{status === "on" ? "Avisos activados" : status === "loading" ? "…" : "Sin avisos"}</span>
        </div>
        <div className="stat">
          <span className="stat-k">Tus dispositivos</span>
          <span className="stat-v">{devices}</span>
        </div>
      </header>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <section className="panel">
          <div className="panel-t" style={{ marginBottom: 8 }}>Notificaciones en este dispositivo</div>
          <p className="muted small" style={{ marginTop: 0 }}>
            Te avisa cada gol de tus partidos con el goleador, cuánto lleva tu jugador, cuándo arranca y termina cada partido, y si el boleto se ganó o se cayó. Llegan aunque tengas la app cerrada.
          </p>

          {!serverOk && <p className="error">Las notificaciones todavía no están configuradas en el servidor (faltan las claves VAPID).</p>}
          {status === "ios-install" && (
            <p className="small">
              En iPhone primero agregá TIMBA a la pantalla de inicio: tocá <b>Compartir</b> y después <b>Agregar a inicio</b>. Abrila desde ese ícono y volvé a esta pantalla.
            </p>
          )}
          {status === "unsupported" && <p className="small">Este navegador no soporta notificaciones. Probá con Chrome.</p>}
          {status === "denied" && (
            <p className="small">Bloqueaste las notificaciones para este sitio. Habilitalas desde el candado al lado de la dirección y recargá.</p>
          )}

          <div className="row" style={{ marginTop: 12 }}>
            {status === "off" && (
              <button className="btn primary" onClick={enable} disabled={!serverOk}>
                Activar avisos
              </button>
            )}
            {status === "on" && (
              <>
                <button className="btn primary" onClick={test}>Mandar prueba</button>
                <button className="btn ghost" onClick={disable}>Desactivar aquí</button>
              </>
            )}
          </div>
          {msg && <p className="small">{msg}</p>}
        </section>

        <section className="panel">
          <div className="panel-t" style={{ marginBottom: 8 }}>Invitar amigos</div>
          {invite ? (
            <>
              <p className="muted small" style={{ marginTop: 0 }}>
                Pasales este link. Entran, crean su usuario y cada uno ve solo sus apuestas y recibe sus propios avisos.
              </p>
              <input className="input" readOnly value={inviteLink} onFocus={(e) => e.target.select()} aria-label="Link de invitación" />
              <div className="row" style={{ marginTop: 10 }}>
                <button
                  className="btn primary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(inviteLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? "Copiado" : "Copiar link"}
                </button>
                <a className="btn ghost" href={`https://wa.me/?text=${encodeURIComponent(`Sumate a TIMBA para seguir tus apuestas en vivo: ${inviteLink}`)}`} target="_blank" rel="noreferrer">
                  Mandar por WhatsApp
                </a>
              </div>
            </>
          ) : (
            <p className="muted small" style={{ marginTop: 0 }}>
              Para invitar amigos, cargá la variable <b>INVITE_CODE</b> en Vercel con el código que quieras y volvé a publicar.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
