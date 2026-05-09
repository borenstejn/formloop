"use client";

import { useEffect } from "react";
import type { McQuestion } from "@/lib/types";
import type { ViewProps } from "../types";

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

export function McView({ question, value, onChange, onAdvance }: ViewProps<McQuestion>) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      const idx = LETTERS.indexOf(k);
      if (idx >= 0 && idx < question.options.length && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const picked = question.options[idx];
        onChange(picked);
        setTimeout(onAdvance, 250);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question, onChange, onAdvance]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {question.options.map((opt, i) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            className="tf-option"
            data-selected={selected}
            onClick={() => {
              onChange(opt);
              setTimeout(onAdvance, 250);
            }}
          >
            <span className="tf-letter">{LETTERS[i].toUpperCase()}</span>
            <span style={{ flex: 1 }}>{opt}</span>
          </button>
        );
      })}
    </div>
  );
}
