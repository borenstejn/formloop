export type InlineCommentField = {
  id: string;
  placeholder?: string;
  /** Label shown above the textarea (default: "Commentaire (optionnel)") */
  label?: string;
};

export type BaseQuestion = {
  id: string;
  title: string;
  description?: string;
  required?: boolean;
  /**
   * Rich HTML rendered between the title and the question widget on the same slide.
   * Use for illustrations, code samples, mockups, context.
   * Sanitized via DOMPurify (same rules as html blocks).
   */
  headerHtml?: string;
  /**
   * Optional inline comment textarea rendered AFTER the question widget on the same slide.
   * Its value is stored in answers[comment.id] alongside the main question answer.
   * Always optional (never required).
   */
  comment?: InlineCommentField;
};

export type McQuestion = BaseQuestion & {
  kind: "mc";
  options: string[];
};

export type MultiQuestion = BaseQuestion & {
  kind: "multi";
  options: string[];
  minSelect?: number;
  maxSelect?: number;
};

export type TextQuestion = BaseQuestion & {
  kind: "text";
  placeholder?: string;
};

export type TextareaQuestion = BaseQuestion & {
  kind: "textarea";
  placeholder?: string;
};

export type YnQuestion = BaseQuestion & {
  kind: "yn";
  labels?: { yes: string; no: string };
};

export type NumberQuestion = BaseQuestion & {
  kind: "number";
  min?: number;
  max?: number;
  placeholder?: string;
};

export type ScaleQuestion = BaseQuestion & {
  kind: "scale";
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
};

export type HtmlPickOption = {
  id: string;
  html: string;
  label?: string;
};

export type HtmlPickQuestion = BaseQuestion & {
  kind: "html-pick";
  options: HtmlPickOption[];
  multi?: boolean;
};

export type RankQuestion = BaseQuestion & {
  kind: "rank";
  options: string[];
};

export type ScalePreviewQuestion = BaseQuestion & {
  kind: "scale-preview";
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
  /** HTML template — supports {{value}} and {{percent}} placeholders */
  previewHtml: string;
};

export type Question =
  | McQuestion
  | MultiQuestion
  | TextQuestion
  | TextareaQuestion
  | YnQuestion
  | NumberQuestion
  | ScaleQuestion
  | HtmlPickQuestion
  | RankQuestion
  | ScalePreviewQuestion;

export type HtmlBlock = {
  kind: "html";
  id?: string;
  html: string;
};

/**
 * A group block collects multiple questions onto a SINGLE slide, rendered
 * vertically (decision, comment, importance, etc.). Useful when several
 * answers need to be reviewed together — e.g., asking a reviewer to (a)
 * decide on a rule, (b) leave a comment, (c) rate its importance, all
 * visible at once.
 *
 * The group itself does not capture an answer; each nested question stores
 * its own answer in `answers[question.id]` as usual. The "Continue" button
 * is enabled only when ALL required nested questions are answered.
 *
 * Validation : nested `questions` must be leaf Question types (no `group`
 * or `html` nesting).
 */
export type GroupBlock = {
  kind: "group";
  id?: string;
  /** Optional shared HTML rendered above all sub-questions (mockup, context). */
  headerHtml?: string;
  /** Optional title rendered above the sub-questions (e.g., a step label). */
  title?: string;
  /** Optional description shown below the title. */
  description?: string;
  /** Sub-questions, rendered stacked vertically on the same slide. */
  questions: Question[];
};

export type Block = HtmlBlock | Question | GroupBlock;

/**
 * Optional respondent identification, rendered as a "system slide" at the start
 * of a persistent form. Captures a name + email at submit time so the agent
 * (or owner) can later attribute votes / relance non-voters.
 *
 * v1 supports a single shape ("email-name"). v2 may add token-based identity.
 */
export type RespondentField = {
  type: "email-name";
  /** If true (default), respondent must fill both name and email. */
  required?: boolean;
  /** Override default labels. */
  emailLabel?: string;
  nameLabel?: string;
  /** Optional intro shown above the fields. */
  intro?: string;
};

export type FormSpec = {
  title: string;
  description?: string;
  blocks: Block[];
  language?: "fr" | "en";
  createdAt?: string;
  /**
   * If true, the form is persistent: spec stored without TTL, submissions
   * appended (instead of overwriting) under sub_idx / sub keys. Multiple
   * respondents can submit. Retrievable via /api/forms/{id}/submissions
   * and /api/forms/{id}/export.csv (both auth-gated).
   *
   * If false / absent: legacy ephemeral mode. Spec TTL 24h, single response
   * stored under response:{id} (TTL 1h), readable via /api/response/{id}.
   */
  persistent?: boolean;
  respondentField?: RespondentField;
  /**
   * Layout for question slides.
   * - "stack" (default): everything in a single vertical column — title,
   *   description, headerHtml, answer widget, optional comment textarea.
   * - "split": two-column grid — title + description + headerHtml on the
   *   left, answer widget + optional comment textarea on the right.
   *   Auto-stacks back to a single column when the viewport is too narrow
   *   (each column wants at least 380px before wrapping).
   * Applies to question slides only — html blocks render full-width either way.
   */
  layout?: "stack" | "split";
};

export type FormAnswers = Record<string, unknown>;

export type StoredResponse = {
  formId: string;
  formName?: string;
  submittedAt: string;
  answers: FormAnswers;
  source: "custom";
};

export type Respondent = {
  name?: string;
  email?: string;
};

/**
 * A single submission stored under sub:{form_id}:{submission_id} for persistent
 * forms. Answers are keyed by stable question id (not label) so the spec can be
 * exported / aggregated unambiguously even if two questions share a title.
 */
export type Submission = {
  submission_id: string;
  form_id: string;
  answers: FormAnswers;
  respondent?: Respondent;
  submitted_at: string;
};
