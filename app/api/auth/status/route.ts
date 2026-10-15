import { NextResponse } from "next/server";
import { listUsers } from "@/lib/store";

export const dynamic = "force-dynamic";

// Para la pantalla de registro: ¿es la primera cuenta? (entonces no pide código)
export async function GET() {
  const first = (await listUsers()).length === 0;
  return NextResponse.json({ first, inviteRequired: !first });
}
