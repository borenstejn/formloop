"use client";

import { useEffect, useRef } from "react";
import type { NumberQuestion } from "@/lib/types";
import type { ViewProps } from "../types";

export function NumberView({
  question,
  value,
  onChange,
  onAdvance,
}: ViewProps<NumberQuestion>) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <input
      ref={ref}
      className="tf-input"
      type="number"
      inputMode="decimal"
      placeholder={question.placeholder ?? "0"}
      min={question.min}
      max={question.max}
      value={typeof value === "number" ? value : ""}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "") onChange(null);
        else onChange(Number(v));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onAdvance();
        }
      }}
    />
  );
}
