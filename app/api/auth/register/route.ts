import { NextResponse } from "next/server";
import { hashPassword, publicUser, startSession } from "@/lib/auth";
import { adoptLegacyBets, createUser, listUsers } from "@/lib/store";

const USERNAME = /^[a-z0-9_.]{3,20}$/;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const displayName = String(body.username ?? "").trim();
  const username = displayName.toLowerCase();
  const password = String(body.password ?? "");
  const invite = String(body.invite ?? "").trim();

  const isFirst = (await listUsers()).length === 0;
  const expected = process.env.INVITE_CODE?.trim();
  // Sin INVITE_CODE configurado, solo se puede crear la primera cuenta (la del dueño).
  if (!isFirst && !expected)
    return NextResponse.json({ error: "Los registros están cerrados. Falta configurar el código de invitación." }, { status: 403 });
  if (!isFirst && invite.toLowerCase() !== expected!.toLowerCase())
    return NextResponse.json({ error: "El código de invitación no es correcto. Pedíselo a quien te pasó el link." }, { status: 403 });
  if (!USERNAME.test(username))
    return NextResponse.json({ error: "El usuario tiene que tener de 3 a 20 caracteres: letras, números, punto o guion bajo." }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json({ error: "La contraseña tiene que tener al menos 6 caracteres." }, { status: 400 });

  const { hash, salt } = await hashPassword(password);
  const user = { id: crypto.randomUUID(), username, displayName, hash, salt, createdAt: new Date().toISOString() };
  if (!(await createUser(user)))
    return NextResponse.json({ error: "Ese usuario ya existe. Probá con otro o iniciá sesión." }, { status: 409 });
  if (isFirst) await adoptLegacyBets(user.id);

  const res = NextResponse.json({ user: publicUser(user) });
  await startSession(res, user);
  return res;
}
