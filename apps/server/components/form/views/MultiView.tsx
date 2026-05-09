"use client";

import { useEffect } from "react";
import type { MultiQuestion } from "@/lib/types";
import type { ViewProps } from "../types";

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

export function MultiView({
  question,
  value,
  onChange,
}: ViewProps<MultiQuestion>) {
  const selected: string[] = Array.isArray(value) ? (value as string[]) : [];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey) return;
      const k = e.key.toLowerCase();
      const idx = LETTERS.indexOf(k);
      if (idx >= 0 && idx < question.options.length) {
        e.preventDefault();
        toggle(question.options[idx]);
      }
    }
    function toggle(opt: string) {
      const next = selected.includes(opt)
        ? selected.filter((x) => x !== opt)
        : [...selected, opt];
      onChange(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question, selected, onChange]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ color: "var(--color-muted)", fontSize: 14, marginBottom: 4 }}>
        Sélectionne une ou plusieurs options
      </p>
      {question.options.map((opt, i) => {
        const isSel = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            className="tf-option"
            data-selected={isSel}
            onClick={() => {
              const next = isSel
                ? selected.filter((x) => x !== opt)
                : [...selected, opt];
              onChange(next);
            }}
          >
            <span className="tf-letter">{LETTERS[i].toUpperCase()}</span>
            <span style={{ flex: 1 }}>{opt}</span>
            {isSel && (
              <span
                style={{
                  color: "var(--color-accent)",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
