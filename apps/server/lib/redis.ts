import { Redis } from "@upstash/redis";

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  throw new Error("Missing Redis env vars (KV_REST_API_URL / KV_REST_API_TOKEN)");
}

export const redis = new Redis({ url, token });

/**
 * Ephemeral mode (legacy):
 *   spec:{id}        TTL 24h
 *   response:{id}    TTL 1h, single response, OVERWRITES on resubmit
 *
 * Persistent mode (opt-in via spec.persistent === true):
 *   spec:{id}        no TTL — spec frozen at creation, never edited
 *   sub_idx:{id}     no TTL — Redis LIST of submission_ids (RPUSH order)
 *   sub:{id}:{sid}   no TTL — one Submission JSON per respondent
 */
export const responseKey = (formId: string) => `response:${formId}`;
export const specKey = (formId: string) => `spec:${formId}`;
export const submissionIndexKey = (formId: string) => `sub_idx:${formId}`;
export const submissionKey = (formId: string, submissionId: string) =>
  `sub:${formId}:${submissionId}`;

export const RESPONSE_TTL_SECONDS = 60 * 60;
export const SPEC_TTL_SECONDS = 60 * 60 * 24;
