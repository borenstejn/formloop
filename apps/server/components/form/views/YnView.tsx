"use client";

import { useEffect } from "react";
import type { YnQuestion } from "@/lib/types";
import type { ViewProps } from "../types";

export function YnView({ question, value, onChange, onAdvance }: ViewProps<YnQuestion>) {
  const yesLabel = question.labels?.yes ?? "Oui";
  const noLabel = question.labels?.no ?? "Non";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey) return;
      const k = e.key.toLowerCase();
      if (k === "y" || k === "o" || k === "1") {
        e.preventDefault();
        onChange(true);
        setTimeout(onAdvance, 250);
      } else if (k === "n" || k === "2") {
        e.preventDefault();
        onChange(false);
        setTimeout(onAdvance, 250);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onChange, onAdvance]);

  function pick(v: boolean) {
    onChange(v);
    setTimeout(onAdvance, 250);
  }

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <button
        type="button"
        className="tf-option"
        data-selected={value === true}
        onClick={() => pick(true)}
        style={{ flex: 1, minWidth: 200, justifyContent: "center" }}
      >
        <span className="tf-letter">O</span>
        <span style={{ flex: 1, textAlign: "center" }}>{yesLabel}</span>
      </button>
      <button
        type="button"
        className="tf-option"
        data-selected={value === false}
        onClick={() => pick(false)}
        style={{ flex: 1, minWidth: 200, justifyContent: "center" }}
      >
        <span className="tf-letter">N</span>
        <span style={{ flex: 1, textAlign: "center" }}>{noLabel}</span>
      </button>
    </div>
  );
}
