// ─────────────────────────────────────────────────────────────────────────────
// Question Builder – shared types
// ─────────────────────────────────────────────────────────────────────────────

/** All question types across Reading, Listening, Writing, Speaking */
export type QuestionType =
  // Reading
  | 'MULTIPLE_CHOICE'
  | 'FILL_IN_BLANK'
  | 'MATCHING'
  | 'TFNG'
  | 'YNNG'
  // Listening
  | 'map_labeling'
  | 'matching'
  // Complex structured
  | 'TABLE_COMPLETION'
  | 'DRAG_DROP'
  // Writing
  | 'WRITING_TASK1'
  | 'WRITING_TASK2'
  // Speaking
  | 'SPEAKING_PART1'
  | 'SPEAKING_PART2'
  | 'SPEAKING_PART3';

export type FormTemplate = 'text-only' | 'text-media' | 'complex-table';

export interface RegistryEntry {
  template: FormTemplate;
  label: string;
  /** Whether this type supports audio upload */
  hasAudio?: boolean;
  /** Whether this type supports image upload */
  hasImage?: boolean;
}

// ─── Form value shapes ────────────────────────────────────────────────────────

export interface TextOnlyValues {
  questionText: string;
  options: { value: string }[];
  correctAnswer: string;
  explanation: string;
}

export interface TextMediaValues extends TextOnlyValues {
  mediaUrl: string;
  mediaType: 'image' | 'audio' | 'none';
}

/** A single cell inside the table builder */
export interface TableCell {
  type: 'text' | 'blank';
  val: string;
  answer: string; // only used when type === 'blank'
}

export interface ComplexTableValues {
  headers: { val: string }[];
  rows: { cells: TableCell[] }[];
  questionText: string;
  explanation: string;
}

// ─── Compiled API payload (matches existing backend field names) ───────────────

export interface QuestionPayload {
  /** 1-based index set by the parent form */
  questionNumber?: number;
  type: QuestionType;
  /** Question stem / prompt */
  text: string;
  /** Plain string options for simple types; JSON-stringified table for complex */
  options: string[];
  correctAnswer: string;
  explanation: string;
  /** Media URL (image for diagram/writing task 1, audio for listening) */
  imageUrl?: string;
  audioUrl?: string;
}

// ─── Builder module context (controls which types are offered) ─────────────────

export type BuilderModule = 'reading' | 'listening' | 'writing' | 'speaking';

export interface QuestionBuilderProps {
  module: BuilderModule;
  /** Called with the compiled payload ready to be injected into the parent test form */
  onSubmit: (payload: QuestionPayload) => void | Promise<void>;
  onCancel: () => void;
  defaultValues?: Partial<QuestionPayload>;
  submitLabel?: string;
}
