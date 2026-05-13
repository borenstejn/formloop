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

export type Block = HtmlBlock | Question;

export type FormSpec = {
  title: string;
  description?: string;
  blocks: Block[];
  language?: "fr" | "en";
  createdAt?: string;
};

export type FormAnswers = Record<string, unknown>;

export type StoredResponse = {
  formId: string;
  formName?: string;
  submittedAt: string;
  answers: FormAnswers;
  source: "tally" | "custom";
};
