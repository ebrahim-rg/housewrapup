import { Redis } from '@upstash/redis';

export const KEY = 'house-wrapup:items:v1';

let client = null;

export function getRedis() {
  if (!client) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error(
        'Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN environment variables.'
      );
    }
    client = new Redis({ url, token });
  }
  return client;
}

export async function readItems() {
  const raw = await getRedis().get(KEY);
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeItems(items) {
  await getRedis().set(KEY, JSON.stringify(items));
  return items;
}
