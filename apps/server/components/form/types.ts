import type { Block, GroupBlock, Question } from "@/lib/types";

export type AnswerValue =
  | string
  | string[]
  | number
  | boolean
  | null
  | Record<string, unknown>;

export type Answers = Record<string, AnswerValue>;

export type ViewProps<T extends Question> = {
  question: T;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  onAdvance: () => void;
};

export function isQuestion(block: Block): block is Question {
  return block.kind !== "html" && block.kind !== "group";
}

export function isGroup(block: Block): block is GroupBlock {
  return block.kind === "group";
}

export function isAnswered(question: Question, value: AnswerValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return false;
}
