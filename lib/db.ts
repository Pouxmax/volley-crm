import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

// Use Redis (Upstash) in production, local JSON files in development
const USE_REDIS = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

async function getRedis() {
  const { Redis } = await import('@upstash/redis');
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

export async function readJson<T>(filename: string, defaultValue: T): Promise<T> {
  const key = filename.replace('.json', '');

  if (USE_REDIS) {
    const redis = await getRedis();
    const data = await redis.get<T>(key);
    return data ?? defaultValue;
  }

  // Local dev: use JSON files
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const content = await fs.readFile(path.join(DATA_DIR, filename), 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

export async function writeJson<T>(filename: string, data: T): Promise<void> {
  const key = filename.replace('.json', '');

  if (USE_REDIS) {
    const redis = await getRedis();
    await redis.set(key, data);
    return;
  }

  // Local dev: use JSON files
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
}

export function nextId(items: Array<{ id: string }>): string {
  if (items.length === 0) return '1';
  const max = Math.max(...items.map((i) => parseInt(i.id, 10) || 0));
  return String(max + 1);
}
