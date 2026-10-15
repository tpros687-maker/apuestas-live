"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBell, IconLive, IconPlus, Logo } from "./icons";

const items = [
  { href: "/", label: "En vivo", icon: <IconLive /> },
  { href: "/nueva", label: "Nueva apuesta", icon: <IconPlus /> },
  { href: "/avisos", label: "Avisos", icon: <IconBell /> },
];

export default function Rail() {
  const path = usePathname();
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
    </nav>
  );
}
