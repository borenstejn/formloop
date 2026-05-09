"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { HtmlPickQuestion } from "@/lib/types";
import type { ViewProps } from "../types";
import { HtmlSafe } from "../HtmlSafe";

export function HtmlPickView({
  question,
  value,
  onChange,
}: ViewProps<HtmlPickQuestion>) {
  const [hovered, setHovered] = useState<string | null>(null);
  const isMulti = !!question.multi;

  const selected: string[] = Array.isArray(value)
    ? (value as string[])
    : typeof value === "string"
      ? [value]
      : [];

  function pick(id: string) {
    if (isMulti) {
      const next = selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id];
      onChange(next);
    } else {
      onChange(id);
    }
  }

  return (
    <div>
      <p
        style={{
          color: "var(--color-muted)",
          fontSize: 14,
          marginBottom: 16,
        }}
      >
        {isMulti
          ? "Clique pour sélectionner — plusieurs choix possibles"
          : "Clique pour sélectionner ton préféré"}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {question.options.map((opt) => {
          const isSel = isMulti
            ? selected.includes(opt.id)
            : selected[0] === opt.id;
          const isHover = hovered === opt.id;
          return (
            <motion.button
              key={opt.id}
              type="button"
              onClick={() => pick(opt.id)}
              onMouseEnter={() => setHovered(opt.id)}
              onMouseLeave={() => setHovered(null)}
              animate={{
                scale: isHover ? 1.02 : 1,
              }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background: "var(--color-card)",
                border: `2px solid ${
                  isSel ? "var(--color-accent)" : "var(--color-subtle)"
                }`,
                borderRadius: 12,
                padding: 0,
                overflow: "hidden",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {isSel && (
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    background: "var(--color-accent)",
                    color: "white",
                    borderRadius: 999,
                    width: 28,
                    height: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 700,
                    zIndex: 2,
                  }}
                >
                  ✓
                </div>
              )}
              <div
                style={{
                  padding: 16,
                  background: "var(--color-bg)",
                  minHeight: 160,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <HtmlSafe html={opt.html} style={{ width: "100%" }} />
              </div>
              {opt.label && (
                <div
                  style={{
                    padding: "10px 16px",
                    borderTop: "1px solid var(--color-subtle)",
                    fontSize: 14,
                    fontWeight: 500,
                    color: isSel
                      ? "var(--color-accent)"
                      : "var(--color-fg)",
                  }}
                >
                  {opt.label}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
