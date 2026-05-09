"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScalePreviewQuestion } from "@/lib/types";
import type { ViewProps } from "../types";
import { HtmlSafe } from "../HtmlSafe";

export function ScalePreviewView({
  question,
  value,
  onChange,
}: ViewProps<ScalePreviewQuestion>) {
  const initial =
    typeof value === "number" ? value : Math.round((question.min + question.max) / 2);
  const [current, setCurrent] = useState<number>(initial);

  useEffect(() => {
    onChange(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const html = useMemo(() => {
    const percent = ((current - question.min) / (question.max - question.min)) * 100;
    return question.previewHtml
      .replaceAll("{{value}}", String(current))
      .replaceAll("{{percent}}", percent.toFixed(2));
  }, [current, question.previewHtml, question.min, question.max]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          background: "var(--color-card)",
          border: "1px solid var(--color-subtle)",
          borderRadius: 12,
          padding: 20,
          minHeight: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <HtmlSafe html={html} style={{ width: "100%" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          type="range"
          min={question.min}
          max={question.max}
          value={current}
          onChange={(e) => setCurrent(Number(e.target.value))}
          style={{
            width: "100%",
            accentColor: "var(--color-accent)",
            height: 6,
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
            color: "var(--color-muted)",
          }}
        >
          <span>{question.minLabel ?? question.min}</span>
          <span style={{ fontWeight: 600, color: "var(--color-accent)" }}>
            {current}
          </span>
          <span>{question.maxLabel ?? question.max}</span>
        </div>
      </div>
    </div>
  );
}
