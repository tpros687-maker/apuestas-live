import type { Match } from "./types";

export const TZ = "America/Montevideo";

export const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

export const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-UY", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });

export const hoyLocal = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });

/** "45'+2'" → 47 ; "HT" → 45 */
export function minuteNum(s?: string): number | null {
  if (!s) return null;
  if (/^HT|half/i.test(s)) return 45;
  const m = s.match(/(\d+)'?(?:\s*\+\s*(\d+))?/);
  if (!m) return null;
  return Number(m[1]) + (m[2] ? Number(m[2]) : 0);
}

/** Minuto actual del partido para dibujar la pista. */
export function currentMinute(m: Match): number {
  if (m.state === "post") return 90;
  if (m.state !== "in") return 0;
  return minuteNum(m.statusText) ?? minuteNum(m.clock) ?? 0;
}

export function statusLine(m: Match): string {
  if (m.state === "pre") return `${fecha(m.kickoff)} · ${hora(m.kickoff)}`;
  if (m.state === "void") return "Suspendido";
  if (m.state === "post") return "Final";
  if (/HT/i.test(m.statusText)) return "Entretiempo";
  return m.statusText || m.clock || "En juego";
}

export const money = (n: number) => `$${Math.round(n).toLocaleString("es-UY")}`;
