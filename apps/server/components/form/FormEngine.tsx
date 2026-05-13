"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowRight, Loader2 } from "lucide-react";
import type { FormSpec, Block, Question, Respondent } from "@/lib/types";
import type { Answers, AnswerValue } from "./types";
import { isQuestion, isAnswered } from "./types";
import { McView } from "./views/McView";
import { MultiView } from "./views/MultiView";
import { TextView } from "./views/TextView";
import { TextareaView } from "./views/TextareaView";
import { YnView } from "./views/YnView";
import { NumberView } from "./views/NumberView";
import { ScaleView } from "./views/ScaleView";
import { HtmlBlockView } from "./views/HtmlBlockView";
import { HtmlPickView } from "./views/HtmlPickView";
import { RankView } from "./views/RankView";
import { ScalePreviewView } from "./views/ScalePreviewView";
import { HtmlSafe } from "./HtmlSafe";

type Direction = 1 | -1;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FormEngine({ formId, spec }: { formId: string; spec: FormSpec }) {
  const router = useRouter();
  const hasRespondentSlide = !!spec.respondentField;
  const respondentRequired =
    hasRespondentSlide && (spec.respondentField!.required ?? true);

  // When a respondent slide is needed, it sits before the spec blocks at index 0.
  // The first content block becomes index 1, etc.
  const respondentOffset = hasRespondentSlide ? 1 : 0;

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>(1);
  const [answers, setAnswers] = useState<Answers>({});
  const [respondent, setRespondent] = useState<Respondent>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocks = spec.blocks;
  const totalSlides = blocks.length + respondentOffset;
  const totalQuestions = blocks.filter(isQuestion).length;
  const answeredQuestionsCount = Object.keys(answers).filter((k) =>
    isAnswered(blocks.find((b) => isQuestion(b) && b.id === k) as Question, answers[k]),
  ).length;

  const isOnRespondentSlide = hasRespondentSlide && index === 0;
  const currentBlock: Block | null = isOnRespondentSlide
    ? null
    : blocks[index - respondentOffset];
  const isLast = index === totalSlides - 1;
  const isFirst = index === 0;

  const respondentValid = (() => {
    if (!hasRespondentSlide) return true;
    if (!respondentRequired) return true;
    const name = (respondent.name ?? "").trim();
    const email = (respondent.email ?? "").trim();
    return name.length > 0 && EMAIL_RE.test(email);
  })();

  const isCurrentValid = (() => {
    if (isOnRespondentSlide) return respondentValid;
    if (!currentBlock || !isQuestion(currentBlock)) return true;
    const required = currentBlock.required ?? true;
    if (!required) return true;
    return isAnswered(currentBlock, answers[currentBlock.id]);
  })();

  const goNext = useCallback(() => {
    if (!isCurrentValid) return;
    if (isLast) return;
    setDirection(1);
    setIndex((i) => Math.min(i + 1, totalSlides - 1));
  }, [isCurrentValid, isLast, totalSlides]);

  const goPrev = useCallback(() => {
    if (isFirst) return;
    setDirection(-1);
    setIndex((i) => Math.max(i - 1, 0));
  }, [isFirst]);

  const setAnswer = useCallback((id: string, value: AnswerValue) => {
    setAnswers((curr) => ({ ...curr, [id]: value }));
  }, []);

  const setRespondentField = useCallback(
    (field: "name" | "email", value: string) => {
      setRespondent((curr) => ({ ...curr, [field]: value }));
    },
    [],
  );

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload: {
        answers: Answers;
        respondent?: Respondent;
      } = { answers };
      if (hasRespondentSlide) {
        const r: Respondent = {};
        if (respondent.name?.trim()) r.name = respondent.name.trim();
        if (respondent.email?.trim()) r.email = respondent.email.trim();
        if (r.name || r.email) payload.respondent = r;
      }
      const res = await fetch(`/api/forms/${formId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `submit failed (${res.status})`);
      }
      router.replace(`/forms/${formId}/thanks`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
      setSubmitting(false);
    }
  }, [answers, respondent, hasRespondentSlide, formId, router]);

  // Scroll back to top whenever we move to a new slide.
  // Without this, tall slides (long headerHtml, code samples) leave the user
  // landing at the bottom of the next slide — they see the answer widget but
  // miss the question, title and illustration above it.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [index]);

  // Global keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTextField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (e.key === "Enter" && !e.shiftKey) {
        if (isTextField && (target?.tagName === "TEXTAREA" || target?.isContentEditable)) {
          // textarea handles Cmd+Enter itself
          if (!e.metaKey && !e.ctrlKey) return;
        }
        e.preventDefault();
        if (isLast && isCurrentValid) submit();
        else goNext();
      } else if (e.key === "ArrowDown" && !isTextField) {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowUp" && !isTextField) {
        e.preventDefault();
        goPrev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, submit, isLast, isCurrentValid]);

  const progressPercent =
    totalQuestions > 0
      ? Math.round((answeredQuestionsCount / totalQuestions) * 100)
      : 0;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Progress bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "var(--color-subtle)",
          zIndex: 50,
        }}
      >
        <motion.div
          style={{
            height: "100%",
            background: "var(--color-accent)",
            transformOrigin: "left",
          }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* Header */}
      <header
        style={{
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 14,
          color: "var(--color-muted)",
        }}
      >
        <span style={{ fontWeight: 500 }}>{spec.title}</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {index + 1} / {totalSlides}
        </span>
      </header>

      {/* Body */}
      <section
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "var(--spacing-form-y) var(--spacing-form-x)",
          position: "relative",
        }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            initial={{ opacity: 0, y: direction === 1 ? 40 : -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: direction === 1 ? -40 : 40 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="tf-question"
          >
            {isOnRespondentSlide ? (
              <RespondentSlide
                spec={spec}
                respondent={respondent}
                setRespondentField={setRespondentField}
                onAdvance={goNext}
              />
            ) : (
              <BlockView
                block={currentBlock!}
                answers={answers}
                setAnswer={setAnswer}
                onAdvance={goNext}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Footer — sticky so the Continue/Submit button stays reachable even on
          tall slides where the user has scrolled into the answer widget. */}
      <footer
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 40,
          padding: "16px 24px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap",
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0) 0%, var(--color-bg, #fff) 28%, var(--color-bg, #fff) 100%)",
          backdropFilter: "blur(2px)",
        }}
      >
        {!isFirst && (
          <button
            type="button"
            className="tf-button-ghost"
            onClick={goPrev}
            aria-label="Previous"
          >
            <ArrowUp size={16} style={{ display: "inline", marginRight: 6 }} />
            Précédent
          </button>
        )}

        {error && (
          <p style={{ color: "var(--color-error)", fontSize: 14, margin: 0 }}>
            {error}
          </p>
        )}

        {isLast ? (
          <button
            type="button"
            className="tf-button-primary"
            onClick={submit}
            disabled={!isCurrentValid || submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                Envoyer
                <ArrowRight size={16} />
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            className="tf-button-primary"
            onClick={goNext}
            disabled={!isCurrentValid}
          >
            Continuer
            <ArrowDown size={16} />
          </button>
        )}
      </footer>
    </main>
  );
}

/**
 * Render a string with `backtick-wrapped` fragments turned into inline <code>.
 * Markdown-lite: only `code` is recognized — no bold, italic, etc.
 */
function renderInlineCode(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          style={{
            background: "var(--color-subtle, #eef0f3)",
            padding: "2px 6px",
            borderRadius: 4,
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: "0.82em",
            fontWeight: 400,
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function BlockView({
  block,
  answers,
  setAnswer,
  onAdvance,
}: {
  block: Block;
  answers: Answers;
  setAnswer: (id: string, value: AnswerValue) => void;
  onAdvance: () => void;
}) {
  if (block.kind === "html") {
    return <HtmlBlockView html={block.html} />;
  }

  const value = answers[block.id];
  const onChange = (v: AnswerValue) => setAnswer(block.id, v);
  const props = { value, onChange, onAdvance };

  const hasHeader = !!block.headerHtml;
  const hasComment = !!block.comment;
  const commentValue =
    hasComment && typeof answers[block.comment!.id] === "string"
      ? (answers[block.comment!.id] as string)
      : "";

  return (
    <div>
      <h2
        style={{
          fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
          fontWeight: 500,
          lineHeight: 1.25,
          marginTop: 0,
          marginBottom: hasHeader || block.description ? 12 : 28,
          letterSpacing: "-0.01em",
        }}
      >
        {renderInlineCode(block.title)}
        {(block.required ?? true) && (
          <span style={{ color: "var(--color-error)", marginLeft: 4 }}>*</span>
        )}
      </h2>
      {block.description && (
        <p
          style={{
            color: "var(--color-muted)",
            fontSize: 16,
            lineHeight: 1.55,
            marginTop: 0,
            marginBottom: hasHeader ? 16 : 28,
          }}
        >
          {block.description}
        </p>
      )}

      {hasHeader && (
        <div style={{ marginBottom: 28 }}>
          <HtmlSafe html={block.headerHtml!} />
        </div>
      )}

      {block.kind === "mc" && <McView {...props} question={block} />}
      {block.kind === "multi" && <MultiView {...props} question={block} />}
      {block.kind === "text" && <TextView {...props} question={block} />}
      {block.kind === "textarea" && <TextareaView {...props} question={block} />}
      {block.kind === "yn" && <YnView {...props} question={block} />}
      {block.kind === "number" && <NumberView {...props} question={block} />}
      {block.kind === "scale" && <ScaleView {...props} question={block} />}
      {block.kind === "html-pick" && <HtmlPickView {...props} question={block} />}
      {block.kind === "rank" && <RankView {...props} question={block} />}
      {block.kind === "scale-preview" && (
        <ScalePreviewView {...props} question={block} />
      )}

      {hasComment && (
        <div style={{ marginTop: 28 }}>
          <label
            htmlFor={`comment-${block.comment!.id}`}
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 8,
            }}
          >
            {block.comment!.label ?? "Commentaire (optionnel)"}
          </label>
          <textarea
            id={`comment-${block.comment!.id}`}
            value={commentValue}
            onChange={(e) => setAnswer(block.comment!.id, e.target.value)}
            placeholder={block.comment!.placeholder ?? ""}
            rows={3}
            className="tf-input"
            style={{
              width: "100%",
              resize: "vertical",
              minHeight: 80,
              fontFamily: "inherit",
              fontSize: 15,
              lineHeight: 1.5,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid var(--color-subtle)",
              background: "var(--color-card)",
              color: "var(--color-fg)",
            }}
          />
        </div>
      )}
    </div>
  );
}

function RespondentSlide({
  spec,
  respondent,
  setRespondentField,
  onAdvance,
}: {
  spec: FormSpec;
  respondent: Respondent;
  setRespondentField: (field: "name" | "email", value: string) => void;
  onAdvance: () => void;
}) {
  const rf = spec.respondentField!;
  const nameLabel = rf.nameLabel ?? "Votre nom";
  const emailLabel = rf.emailLabel ?? "Votre email";
  const intro =
    rf.intro ??
    "Avant de commencer — qui répond ? On garde ça pour pouvoir relier ta réponse aux autres et te recontacter si besoin.";

  return (
    <div>
      <h2
        style={{
          fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
          fontWeight: 500,
          lineHeight: 1.25,
          marginTop: 0,
          marginBottom: 12,
          letterSpacing: "-0.01em",
        }}
      >
        Avant de commencer
      </h2>
      <p
        style={{
          color: "var(--color-muted)",
          fontSize: 16,
          lineHeight: 1.55,
          marginTop: 0,
          marginBottom: 28,
        }}
      >
        {intro}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label
            htmlFor="respondent-name"
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 8,
            }}
          >
            {nameLabel}
          </label>
          <input
            id="respondent-name"
            type="text"
            autoComplete="name"
            autoFocus
            value={respondent.name ?? ""}
            onChange={(e) => setRespondentField("name", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const emailInput = document.getElementById(
                  "respondent-email",
                ) as HTMLInputElement | null;
                emailInput?.focus();
              }
            }}
            className="tf-input"
            style={{
              width: "100%",
              fontFamily: "inherit",
              fontSize: 18,
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid var(--color-subtle)",
              background: "var(--color-card)",
              color: "var(--color-fg)",
            }}
          />
        </div>
        <div>
          <label
            htmlFor="respondent-email"
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 8,
            }}
          >
            {emailLabel}
          </label>
          <input
            id="respondent-email"
            type="email"
            autoComplete="email"
            value={respondent.email ?? ""}
            onChange={(e) => setRespondentField("email", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onAdvance();
              }
            }}
            className="tf-input"
            style={{
              width: "100%",
              fontFamily: "inherit",
              fontSize: 18,
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid var(--color-subtle)",
              background: "var(--color-card)",
              color: "var(--color-fg)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
