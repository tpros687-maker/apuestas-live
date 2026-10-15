import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth";
import { deleteBet } from "@/lib/store";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return unauthorized();
  await deleteBet(user.id, (await params).id);
  return NextResponse.json({ ok: true });
}
