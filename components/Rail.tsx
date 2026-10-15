"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconBell, IconLive, IconPlus, Logo } from "./icons";

const items = [
  { href: "/", label: "En vivo", icon: <IconLive /> },
  { href: "/nueva", label: "Nueva apuesta", icon: <IconPlus /> },
  { href: "/avisos", label: "Avisos y amigos", icon: <IconBell /> },
];

export default function Rail() {
  const path = usePathname();
  const [name, setName] = useState("");

  useEffect(() => {
    if (path === "/login") return;
    fetch("/api/me")
      .then((r) => (r.status === 401 ? (location.href = "/login", null) : r.json()))
      .then((d) => d?.user && setName(d.user.displayName))
      .catch(() => {});
  }, [path]);

  if (path === "/login") return null;

  async function logout() {
    if (!confirm(`¿Cerrar la sesión de ${name}?`)) return;
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/login";
  }

  return (
    <nav className="rail" aria-label="Principal">
      <Link href="/" className="rail-logo" aria-label="TIMBA, inicio">
        <Logo />
      </Link>
      {items.map((it) => (
        <Link key={it.href} href={it.href} className="rail-btn" title={it.label} aria-label={it.label} aria-current={path === it.href ? "page" : undefined}>
          {it.icon}
        </Link>
      ))}
      <div className="rail-spacer" />
      {name && (
        <button className="rail-user" onClick={logout} title={`${name} · cerrar sesión`} aria-label={`Sesión de ${name}. Cerrar sesión`}>
          {name.slice(0, 1)}
        </button>
      )}
    </nav>
  );
}
