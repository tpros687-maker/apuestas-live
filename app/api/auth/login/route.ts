import { NextResponse } from "next/server";
import { publicUser, startSession, verifyPassword } from "@/lib/auth";
import { getUserByName } from "@/lib/store";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const user = await getUserByName(String(body.username ?? "").trim());
  if (!user || !(await verifyPassword(user, String(body.password ?? ""))))
    return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  const res = NextResponse.json({ user: publicUser(user) });
  await startSession(res, user);
  return res;
}
