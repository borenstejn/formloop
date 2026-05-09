"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowRight, Loader2 } from "lucide-react";
import type { FormSpec, Block, Question } from "@/lib/types";
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

type Direction = 1 | -1;

export function FormEngine({ formId, spec }: { formId: string; spec: FormSpec }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>(1);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocks = spec.blocks;
  const totalQuestions = blocks.filter(isQuestion).length;
  const answeredQuestionsCount = Object.keys(answers).filter((k) =>
    isAnswered(blocks.find((b) => isQuestion(b) && b.id === k) as Question, answers[k]),
  ).length;

  const currentBlock: Block = blocks[index];
  const isLast = index === blocks.length - 1;
  const isFirst = index === 0;

  const isCurrentValid = (() => {
    if (!isQuestion(currentBlock)) return true;
    const required = currentBlock.required ?? true;
    if (!required) return true;
    return isAnswered(currentBlock, answers[currentBlock.id]);
  })();

  const goNext = useCallback(() => {
    if (!isCurrentValid) return;
    if (isLast) return;
    setDirection(1);
    setIndex((i) => Math.min(i + 1, blocks.length - 1));
  }, [isCurrentValid, isLast, blocks.length]);

  const goPrev = useCallback(() => {
    if (isFirst) return;
    setDirection(-1);
    setIndex((i) => Math.max(i - 1, 0));
  }, [isFirst]);

  const setAnswer = useCallback((id: string, value: AnswerValue) => {
    setAnswers((curr) => ({ ...curr, [id]: value }));
  }, []);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/forms/${formId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
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
  }, [answers, formId, router]);

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
          {index + 1} / {blocks.length}
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
            <BlockView
              block={currentBlock}
              answers={answers}
              setAnswer={setAnswer}
              onAdvance={goNext}
            />
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: "20px 24px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap",
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

  return (
    <div>
      <h2
        style={{
          fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
          fontWeight: 500,
          lineHeight: 1.25,
          marginTop: 0,
          marginBottom: block.description ? 12 : 28,
          letterSpacing: "-0.01em",
        }}
      >
        {block.title}
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
            marginBottom: 28,
          }}
        >
          {block.description}
        </p>
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
    </div>
  );
}
