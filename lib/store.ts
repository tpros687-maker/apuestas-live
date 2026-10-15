import { Redis } from "@upstash/redis";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Bet } from "./types";

// Upstash Redis si está configurado; si no, un archivo JSON local (solo para desarrollo).
// La integración de Upstash en Vercel crea KV_REST_API_URL/TOKEN; a mano, UPSTASH_REDIS_REST_URL/TOKEN.
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis = REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

if (!redis && process.env.VERCEL)
  console.error("TIMBA: falta conectar Upstash Redis. En Vercel no se puede guardar en disco.");

export interface User {
  id: string;
  username: string; // en minúsculas, único
  displayName: string;
  hash: string;
  salt: string;
  createdAt: string;
}

export interface PushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// ---------- Backend local (archivo) ----------

interface FileDb {
  users: Record<string, User>; // por username
  bets: Record<string, Record<string, Bet>>; // userId -> betId -> bet
  legacyBets?: Record<string, Bet>;
  kv: Record<string, { v: unknown; exp?: number }>;
  subs: Record<string, Record<string, PushSub>>; // userId -> endpoint -> sub
}

const FILE = path.join(process.cwd(), ".data", "db.json");
async function readFile(): Promise<FileDb> {
  let raw: Partial<FileDb> & { bets?: unknown } = {};
  try {
    raw = JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    /* archivo nuevo */
  }
  const db: FileDb = { users: raw.users ?? {}, bets: {}, kv: {}, subs: raw.subs ?? {}, legacyBets: raw.legacyBets };
  // Formato viejo (antes de las cuentas): bets era betId -> bet y kv guardaba valores sueltos.
  const bets = (raw.bets ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(bets)) {
    if (v && typeof v === "object" && "selections" in (v as object)) {
      db.legacyBets = { ...db.legacyBets, [k]: v as Bet };
    } else db.bets[k] = v as Record<string, Bet>;
  }
  for (const [k, v] of Object.entries(raw.kv ?? {}))
    db.kv[k] = v && typeof v === "object" && "v" in (v as object) ? (v as { v: unknown; exp?: number }) : { v };
  return db;
}
async function writeFile(db: FileDb) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 2));
}

// ---------- Usuarios ----------

export async function getUserByName(username: string): Promise<User | null> {
  const u = username.toLowerCase();
  if (redis) return (await redis.hget<User>("timba:users", u)) ?? null;
  return (await readFile()).users[u] ?? null;
}

export async function listUsers(): Promise<User[]> {
  if (redis) return Object.values((await redis.hgetall<Record<string, User>>("timba:users")) ?? {});
  return Object.values((await readFile()).users);
}

/** Crea el usuario. Devuelve false si el nombre ya existe. */
export async function createUser(user: User): Promise<boolean> {
  if (redis) return (await redis.hsetnx("timba:users", user.username, user)) === 1;
  const db = await readFile();
  if (db.users[user.username]) return false;
  db.users[user.username] = user;
  await writeFile(db);
  return true;
}

/** Las apuestas cargadas antes de que existieran las cuentas pasan al primer usuario. */
export async function adoptLegacyBets(userId: string) {
  if (redis) {
    const legacy = await redis.hgetall<Record<string, Bet>>("timba:bets");
    if (legacy && Object.keys(legacy).length) {
      await redis.hset(`timba:bets:${userId}`, legacy);
      await redis.del("timba:bets");
    }
    return;
  }
  const db = await readFile();
  if (!db.legacyBets) return;
  db.bets[userId] = { ...db.bets[userId], ...db.legacyBets };
  delete db.legacyBets;
  await writeFile(db);
}

// ---------- Apuestas (por usuario) ----------

export async function listBets(userId: string): Promise<Bet[]> {
  const all = redis
    ? Object.values((await redis.hgetall<Record<string, Bet>>(`timba:bets:${userId}`)) ?? {})
    : Object.values((await readFile()).bets[userId] ?? {});
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveBet(userId: string, bet: Bet) {
  if (redis) return void (await redis.hset(`timba:bets:${userId}`, { [bet.id]: bet }));
  const db = await readFile();
  db.bets[userId] = { ...db.bets[userId], [bet.id]: bet };
  await writeFile(db);
}

export async function deleteBet(userId: string, id: string) {
  if (redis) return void (await redis.hdel(`timba:bets:${userId}`, id));
  const db = await readFile();
  delete db.bets[userId]?.[id];
  await writeFile(db);
}

// ---------- Clave/valor con vencimiento (sesiones, snapshots) ----------

export async function getKv<T>(key: string): Promise<T | null> {
  if (redis) return redis.get<T>(`timba:${key}`);
  const e = (await readFile()).kv[key];
  if (!e || (e.exp && e.exp < Date.now())) return null;
  return e.v as T;
}

export async function setKv(key: string, value: unknown, ttlSeconds = 60 * 60 * 24 * 14) {
  if (redis) return void (await redis.set(`timba:${key}`, value, { ex: ttlSeconds }));
  const db = await readFile();
  db.kv[key] = { v: value, exp: Date.now() + ttlSeconds * 1000 };
  await writeFile(db);
}

export async function delKv(key: string) {
  if (redis) return void (await redis.del(`timba:${key}`));
  const db = await readFile();
  delete db.kv[key];
  await writeFile(db);
}

// ---------- Suscripciones push (por usuario, una por dispositivo) ----------

export async function listSubs(userId: string): Promise<PushSub[]> {
  if (redis) return Object.values((await redis.hgetall<Record<string, PushSub>>(`timba:subs:${userId}`)) ?? {});
  return Object.values((await readFile()).subs[userId] ?? {});
}

export async function addSub(userId: string, sub: PushSub) {
  if (redis) return void (await redis.hset(`timba:subs:${userId}`, { [sub.endpoint]: sub }));
  const db = await readFile();
  db.subs[userId] = { ...db.subs[userId], [sub.endpoint]: sub };
  await writeFile(db);
}

export async function removeSub(userId: string, endpoint: string) {
  if (redis) return void (await redis.hdel(`timba:subs:${userId}`, endpoint));
  const db = await readFile();
  delete db.subs[userId]?.[endpoint];
  await writeFile(db);
}
