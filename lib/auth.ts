import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { delKv, getKv, getUserByName, setKv, type User } from "./store";

export const SESSION_COOKIE = "timba_session";
const SESSION_DAYS = 60;

const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex: string) => Uint8Array.from(hex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));

export async function hashPassword(password: string, saltHex?: string) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 120_000 }, key, 256);
  return { hash: toHex(bits), salt: toHex(salt.buffer as ArrayBuffer) };
}

export async function verifyPassword(user: User, password: string) {
  const { hash } = await hashPassword(password, user.salt);
  // comparación en tiempo constante
  if (hash.length !== user.hash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ user.hash.charCodeAt(i);
  return diff === 0;
}

/** Crea la sesión y la pone en la cookie de la respuesta. */
export async function startSession(res: NextResponse, user: User) {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)).buffer as ArrayBuffer);
  await setKv(`session:${token}`, user.username, SESSION_DAYS * 86400);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function endSession(res: NextResponse) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await delKv(`session:${token}`);
  res.cookies.delete(SESSION_COOKIE);
}

/** Usuario logueado, o null. */
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const username = await getKv<string>(`session:${token}`);
  if (!username) return null;
  return getUserByName(username);
}

export const unauthorized = () => NextResponse.json({ error: "Tenés que iniciar sesión" }, { status: 401 });

/** Datos públicos del usuario (sin hash). */
export const publicUser = (u: User) => ({ id: u.id, username: u.username, displayName: u.displayName });
