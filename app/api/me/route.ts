import { NextResponse } from "next/server";
import { currentUser, publicUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  // Los que ya tienen cuenta pueden ver el código para invitar a otros amigos.
  return NextResponse.json({ user: publicUser(user), inviteCode: process.env.INVITE_CODE?.trim() || null });
}
