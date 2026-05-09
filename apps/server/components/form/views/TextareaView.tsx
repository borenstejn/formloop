"use client";

import { useEffect, useRef } from "react";
import type { TextareaQuestion } from "@/lib/types";
import type { ViewProps } from "../types";

export function TextareaView({
  question,
  value,
  onChange,
  onAdvance,
}: ViewProps<TextareaQuestion>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
  }

  return (
    <textarea
      ref={ref}
      className="tf-input"
      placeholder={question.placeholder ?? "Tape ta réponse... (Cmd+Enter pour valider)"}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => {
        onChange(e.target.value);
        autoGrow(e.target);
      }}
      onInput={(e) => autoGrow(e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onAdvance();
        }
      }}
      rows={1}
      style={{ resize: "none", overflow: "hidden", minHeight: "3.5rem" }}
    />
  );
}
