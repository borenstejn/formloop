"use client";

import { useEffect, useRef } from "react";
import type { TextQuestion } from "@/lib/types";
import type { ViewProps } from "../types";

export function TextView({ question, value, onChange, onAdvance }: ViewProps<TextQuestion>) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <input
      ref={ref}
      className="tf-input"
      type="text"
      placeholder={question.placeholder ?? "Tape ta réponse..."}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onAdvance();
        }
      }}
    />
  );
}
