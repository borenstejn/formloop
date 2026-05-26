/**
 * Storage abstraction for formloop.
 *
 * Two implementations:
 *   - MemoryStore: in-memory Map with lazy TTL — no deps, used in local mode
 *   - RedisStore:  wraps @upstash/redis — used when KV_REST_API_URL is set
 *
 * getStore() auto-detects which to use based on environment variables.
 */

export const RESPONSE_TTL_SECONDS = 60 * 60; // 1 hour
export const SPEC_TTL_SECONDS = 60 * 60 * 24; // 24 hours

export interface FormStore {
  setSpec(formId: string, spec: string, ttlSeconds?: number): Promise<void>;
  getSpec(formId: string): Promise<string | null>;
  setResponse(formId: string, data: string, ttlSeconds: number): Promise<void>;
  getResponse(formId: string): Promise<string | null>;
  deleteResponse(formId: string): Promise<void>;
  addSubmission(formId: string, submissionId: string, data: string): Promise<void>;
  getSubmissionIds(formId: string): Promise<string[]>;
  getSubmissions(formId: string, submissionIds: string[]): Promise<(string | null)[]>;
}

// ---------------------------------------------------------------------------
// MemoryStore
// ---------------------------------------------------------------------------

type MemoryEntry = { value: string; expiresAt: number | null };

class MemoryStore implements FormStore {
  private data = new Map<string, MemoryEntry>();
  private lists = new Map<string, string[]>();

  private get(key: string): string | null {
    const entry = this.data.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.data.delete(key);
      return null;
    }
    return entry.value;
  }

  private set(key: string, value: string, ttlSeconds?: number): void {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.data.set(key, { value, expiresAt });
  }

  async setSpec(formId: string, spec: string, ttlSeconds?: number): Promise<void> {
    this.set(`spec:${formId}`, spec, ttlSeconds);
  }

  async getSpec(formId: string): Promise<string | null> {
    return this.get(`spec:${formId}`);
  }

  async setResponse(formId: string, data: string, ttlSeconds: number): Promise<void> {
    this.set(`response:${formId}`, data, ttlSeconds);
  }

  async getResponse(formId: string): Promise<string | null> {
    return this.get(`response:${formId}`);
  }

  async deleteResponse(formId: string): Promise<void> {
    this.data.delete(`response:${formId}`);
  }

  async addSubmission(formId: string, submissionId: string, data: string): Promise<void> {
    this.set(`sub:${formId}:${submissionId}`, data);
    const key = `sub_idx:${formId}`;
    const list = this.lists.get(key) ?? [];
    list.push(submissionId);
    this.lists.set(key, list);
  }

  async getSubmissionIds(formId: string): Promise<string[]> {
    return this.lists.get(`sub_idx:${formId}`) ?? [];
  }

  async getSubmissions(formId: string, submissionIds: string[]): Promise<(string | null)[]> {
    return submissionIds.map((sid) => this.get(`sub:${formId}:${sid}`));
  }
}

// ---------------------------------------------------------------------------
// RedisStore
// ---------------------------------------------------------------------------

class RedisStore implements FormStore {
  private redis: import("@upstash/redis").Redis;

  constructor(redis: import("@upstash/redis").Redis) {
    this.redis = redis;
  }

  async setSpec(formId: string, spec: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.set(`spec:${formId}`, spec, { ex: ttlSeconds });
    } else {
      await this.redis.set(`spec:${formId}`, spec);
    }
  }

  async getSpec(formId: string): Promise<string | null> {
    const raw = await this.redis.get<string>(`spec:${formId}`);
    if (!raw) return null;
    return typeof raw === "string" ? raw : JSON.stringify(raw);
  }

  async setResponse(formId: string, data: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(`response:${formId}`, data, { ex: ttlSeconds });
  }

  async getResponse(formId: string): Promise<string | null> {
    const raw = await this.redis.get<string>(`response:${formId}`);
    if (!raw) return null;
    return typeof raw === "string" ? raw : JSON.stringify(raw);
  }

  async deleteResponse(formId: string): Promise<void> {
    await this.redis.del(`response:${formId}`);
  }

  async addSubmission(formId: string, submissionId: string, data: string): Promise<void> {
    await this.redis.set(`sub:${formId}:${submissionId}`, data);
    await this.redis.rpush(`sub_idx:${formId}`, submissionId);
  }

  async getSubmissionIds(formId: string): Promise<string[]> {
    return (await this.redis.lrange<string>(`sub_idx:${formId}`, 0, -1)) ?? [];
  }

  async getSubmissions(formId: string, submissionIds: string[]): Promise<(string | null)[]> {
    const keys = submissionIds.map((sid) => `sub:${formId}:${sid}`);
    const raws = await this.redis.mget<(string | null)[]>(...keys);
    return (raws ?? []).map((raw) => {
      if (!raw) return null;
      return typeof raw === "string" ? raw : JSON.stringify(raw);
    });
  }
}

// ---------------------------------------------------------------------------
// Factory — singleton (survives Next.js HMR via globalThis)
// ---------------------------------------------------------------------------

const globalForStore = globalThis as typeof globalThis & {
  __formloopStore?: FormStore;
};

export function getStore(): FormStore {
  if (globalForStore.__formloopStore) return globalForStore.__formloopStore;

  // FORMLOOP_STORE=memory forces in-memory store even when KV vars are present.
  // Useful for `npx formloop` self-hosted mode on a machine that also has
  // Upstash creds in its env (e.g. Jerome's dev box).
  const forceMemory = process.env.FORMLOOP_STORE === "memory";

  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!forceMemory && url && token) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");
    globalForStore.__formloopStore = new RedisStore(new Redis({ url, token }));
  } else {
    globalForStore.__formloopStore = new MemoryStore();
  }

  return globalForStore.__formloopStore;
}
