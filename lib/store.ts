import { Redis } from "@upstash/redis";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Bet } from "./types";

// Upstash Redis si está configurado; si no, un archivo JSON local (solo para desarrollo).

interface Db {
  bets: Record<string, Bet>;
  kv: Record<string, unknown>;
}

// La integración de Upstash en Vercel crea KV_REST_API_URL/TOKEN; si la cargás a mano, UPSTASH_REDIS_REST_URL/TOKEN.
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis = REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

if (!redis && process.env.VERCEL)
  console.error("TIMBA: falta conectar Upstash Redis. En Vercel no se puede guardar en disco.");

const FILE = path.join(process.cwd(), ".data", "db.json");
async function readFile(): Promise<Db> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return { bets: {}, kv: {} };
  }
}
async function writeFile(db: Db) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 2));
}

export async function listBets(): Promise<Bet[]> {
  const all = redis ? Object.values((await redis.hgetall<Record<string, Bet>>("timba:bets")) ?? {}) : Object.values((await readFile()).bets);
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveBet(bet: Bet) {
  if (redis) return void (await redis.hset("timba:bets", { [bet.id]: bet }));
  const db = await readFile();
  db.bets[bet.id] = bet;
  await writeFile(db);
}

export async function deleteBet(id: string) {
  if (redis) return void (await redis.hdel("timba:bets", id));
  const db = await readFile();
  delete db.bets[id];
  await writeFile(db);
}

export async function getKv<T>(key: string): Promise<T | null> {
  if (redis) return redis.get<T>(`timba:${key}`);
  return ((await readFile()).kv[key] as T) ?? null;
}

export async function setKv(key: string, value: unknown) {
  if (redis) return void (await redis.set(`timba:${key}`, value, { ex: 60 * 60 * 24 * 14 }));
  const db = await readFile();
  db.kv[key] = value;
  await writeFile(db);
}
