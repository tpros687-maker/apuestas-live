"use client";
import { useEffect, useState } from "react";
import { Logo } from "@/components/icons";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [first, setFirst] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // El link de invitación puede traer el código: /login?invite=XXXX
    const code = new URLSearchParams(location.search).get("invite");
    if (code) {
      setInvite(code);
      setMode("register");
    }
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => {
        setFirst(d.first);
        if (d.first) setMode("register");
      })
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, invite }),
    }).catch(() => null);
    if (res?.ok) {
      location.href = "/";
      return;
    }
    const d = await res?.json().catch(() => ({}));
    setError(d?.error ?? "No se pudo conectar. Probá de nuevo.");
    setBusy(false);
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <Logo size={52} />
          <div>
            <div className="brand-name" style={{ fontSize: 34 }}>TIMBA</div>
            <span className="live-tag">
              <span className="live-dot" /> tus apuestas en vivo
            </span>
          </div>
        </div>

        {first ? (
          <p className="muted small">Sos el primero en entrar: creá tu cuenta. Después vas a poder invitar a tus amigos.</p>
        ) : (
          <div className="seg" role="group" aria-label="Entrar o crear cuenta" style={{ alignSelf: "flex-start" }}>
            <button type="button" aria-pressed={mode === "login"} onClick={() => setMode("login")}>Entrar</button>
            <button type="button" aria-pressed={mode === "register"} onClick={() => setMode("register")}>Crear cuenta</button>
          </div>
        )}

        <div className="field">
          <label htmlFor="u">Usuario</label>
          <input id="u" className="input" autoComplete="username" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="p">Contraseña</label>
          <input id="p" className="input" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "register" ? 6 : undefined} />
        </div>
        {mode === "register" && !first && (
          <div className="field">
            <label htmlFor="i">Código de invitación</label>
            <input id="i" className="input" value={invite} onChange={(e) => setInvite(e.target.value)} required />
          </div>
        )}

        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary" type="submit" disabled={busy} style={{ marginTop: 4 }}>
          {busy ? "Un segundo…" : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
}
