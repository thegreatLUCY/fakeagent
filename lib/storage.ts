import "server-only";
import { Redis } from "@upstash/redis";
import { nanoid } from "nanoid";
import type { GeneratedConfig } from "./types";

const PREFIX = "fakeagent:v1:";

export interface StoredRecord {
  id: string;
  config: GeneratedConfig;
  createdAt: number;
}

function getRedisClient(): Redis | null {
  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const MEMORY_KEY = Symbol.for("fakeagent.memory.v1");
type MemoryGlobal = { [MEMORY_KEY]?: Map<string, StoredRecord> };
const memoryHost = globalThis as MemoryGlobal;
const memory: Map<string, StoredRecord> =
  memoryHost[MEMORY_KEY] ?? new Map<string, StoredRecord>();
memoryHost[MEMORY_KEY] = memory;

export async function saveConfig(config: GeneratedConfig): Promise<string> {
  const id = nanoid(10);
  const record: StoredRecord = { id, config, createdAt: Date.now() };
  const redis = getRedisClient();
  if (redis) {
    await redis.set(`${PREFIX}${id}`, record, { ex: 60 * 60 * 24 * 30 });
  } else {
    memory.set(id, record);
  }
  return id;
}

export async function loadConfig(id: string): Promise<StoredRecord | null> {
  const redis = getRedisClient();
  if (redis) {
    const raw = await redis.get<StoredRecord>(`${PREFIX}${id}`);
    return raw ?? null;
  }
  return memory.get(id) ?? null;
}
