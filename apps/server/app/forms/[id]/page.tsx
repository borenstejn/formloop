import { getStore } from "@/lib/store";
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
  const store = getStore();

  const raw = await store.getSpec(id);
  if (!raw) notFound();

  const spec: FormSpec = JSON.parse(raw);

  return <FormEngine formId={id} spec={spec} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = getStore();
  const raw = await store.getSpec(id);
  if (!raw) return { title: "Form not found" };
  const spec: FormSpec = JSON.parse(raw);
  return { title: spec.title };
}
