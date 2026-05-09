import { Redis } from "@upstash/redis";

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  throw new Error("Missing Redis env vars (KV_REST_API_URL / KV_REST_API_TOKEN)");
}

export const redis = new Redis({ url, token });

export const responseKey = (formId: string) => `response:${formId}`;
export const specKey = (formId: string) => `spec:${formId}`;
export const RESPONSE_TTL_SECONDS = 60 * 60;
export const SPEC_TTL_SECONDS = 60 * 60 * 24;
