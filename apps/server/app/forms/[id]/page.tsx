import { redis, specKey } from "@/lib/redis";
import type { FormSpec } from "@/lib/types";
import { notFound } from "next/navigation";
import { FormEngine } from "@/components/form/FormEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function FormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const raw = await redis.get<string>(specKey(id));
  if (!raw) notFound();

  const spec: FormSpec = typeof raw === "string" ? JSON.parse(raw) : raw;

  return <FormEngine formId={id} spec={spec} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const raw = await redis.get<string>(specKey(id));
  if (!raw) return { title: "Form not found" };
  const spec: FormSpec = typeof raw === "string" ? JSON.parse(raw) : raw;
  return { title: spec.title };
}
