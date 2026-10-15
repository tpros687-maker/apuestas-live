import { NextResponse } from "next/server";
import { deleteBet } from "@/lib/store";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await deleteBet((await params).id);
  return NextResponse.json({ ok: true });
}
