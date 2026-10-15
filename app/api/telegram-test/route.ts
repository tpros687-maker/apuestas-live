import { NextResponse } from "next/server";
import { sendTelegram, telegramEnabled } from "@/lib/telegram";

export async function POST() {
  if (!telegramEnabled())
    return NextResponse.json({ ok: false, error: "Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID" }, { status: 400 });
  const ok = await sendTelegram("🎰 <b>TIMBA</b> conectado. Te aviso acá cuando haya goles en tus partidos.");
  return NextResponse.json({ ok });
}

export async function GET() {
  return NextResponse.json({ enabled: telegramEnabled() });
}
