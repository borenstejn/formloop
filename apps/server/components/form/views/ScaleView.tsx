"use client";

import { useEffect } from "react";
import type { ScaleQuestion } from "@/lib/types";
import type { ViewProps } from "../types";

export function ScaleView({
  question,
  value,
  onChange,
  onAdvance,
}: ViewProps<ScaleQuestion>) {
  const min = question.min;
  const max = question.max;
  const numbers: number[] = [];
  for (let i = min; i <= max; i++) numbers.push(i);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= min && n <= max) {
        e.preventDefault();
        onChange(n);
        setTimeout(onAdvance, 250);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [min, max, onChange, onAdvance]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {numbers.map((n) => {
          const sel = value === n;
          return (
            <button
              key={n}
              type="button"
              className="tf-option"
              data-selected={sel}
              onClick={() => {
                onChange(n);
                setTimeout(onAdvance, 250);
              }}
              style={{
                width: 56,
                height: 56,
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 500,
                padding: 0,
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      {(question.minLabel || question.maxLabel) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "var(--color-muted)",
            fontSize: 14,
            paddingInline: 4,
          }}
        >
          <span>{question.minLabel ?? min}</span>
          <span>{question.maxLabel ?? max}</span>
        </div>
      )}
    </div>
  );
}
