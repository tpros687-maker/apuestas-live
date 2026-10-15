import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth";
import { evaluateBets } from "@/lib/live";
import { listBets, saveBet } from "@/lib/store";
import type { Bet, Selection } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const bets = await listBets(user.id);
  return NextResponse.json({ bets: await evaluateBets(bets), at: new Date().toISOString() });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const body = (await req.json()) as Partial<Bet>;
  const selections = (body.selections ?? []) as Selection[];
  if (!selections.length) return NextResponse.json({ error: "El boleto está vacío" }, { status: 400 });
  if (selections.length > 20) return NextResponse.json({ error: "Máximo 20 selecciones por boleto" }, { status: 400 });
  for (const s of selections)
    if (!s.eventId || !s.league || !s.market?.type)
      return NextResponse.json({ error: "Selección inválida" }, { status: 400 });

  const bet: Bet = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    name: body.name?.toString().slice(0, 60) || undefined,
    stake: Number(body.stake) > 0 ? Number(body.stake) : undefined,
    odds: Number(body.odds) > 1 ? Number(body.odds) : undefined,
    selections: selections.map((s) => ({ ...s, id: crypto.randomUUID() })),
  };
  await saveBet(user.id, bet);
  return NextResponse.json({ bet });
}
