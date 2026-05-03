// ─────────────────────────────────────────────────────────────────────────────
// QuestionFormRegistry – Factory Pattern
//
// Maps every QuestionType to its:
//   • FormTemplate  (which React component to render)
//   • Human-readable label
//   • Media capabilities
//
// The QuestionBuilderWrapper consults this registry at runtime to decide which
// form template to mount – no if/switch chains needed in the UI layer.
// ─────────────────────────────────────────────────────────────────────────────

import type { BuilderModule, FormTemplate, QuestionType, RegistryEntry } from './types';

// ─── Registry map ─────────────────────────────────────────────────────────────

export const QUESTION_FORM_REGISTRY: Record<QuestionType, RegistryEntry> = {
  // ── Reading: text-only types (~70 %)
  MULTIPLE_CHOICE: { template: 'text-only', label: 'Multiple Choice (Trắc nghiệm)' },
  FILL_IN_BLANK:   { template: 'text-only', label: 'Fill in the Blank (Điền vào chỗ trống)' },
  MATCHING:        { template: 'text-only', label: 'Matching Headings (Ghép tiêu đề)' },
  TFNG:            { template: 'text-only', label: 'True / False / Not Given' },
  YNNG:            { template: 'text-only', label: 'Yes / No / Not Given' },

  // ── Listening: may have image or audio
  map_labeling:    { template: 'text-media', label: 'Map / Diagram Labeling', hasImage: true },
  matching:        { template: 'text-only',  label: 'Matching (Listening)' },

  // ── Complex structured
  TABLE_COMPLETION: { template: 'complex-table', label: 'Table Completion (Điền bảng)' },
  DRAG_DROP:        { template: 'complex-table', label: 'Drag & Drop (Kéo thả)' },

  // ── Writing
  WRITING_TASK1: { template: 'text-media', label: 'Writing Task 1 (Graph/Chart/Map)', hasImage: true },
  WRITING_TASK2: { template: 'text-only',  label: 'Writing Task 2 (Essay Prompt)' },

  // ── Speaking
  SPEAKING_PART1: { template: 'text-only', label: 'Speaking Part 1 (Short questions)' },
  SPEAKING_PART2: { template: 'text-only', label: 'Speaking Part 2 (Long turn / Cue card)' },
  SPEAKING_PART3: { template: 'text-only', label: 'Speaking Part 3 (Discussion)' },
};

// ─── Allowed types per module ─────────────────────────────────────────────────

const MODULE_TYPES: Record<BuilderModule, QuestionType[]> = {
  reading:   ['MULTIPLE_CHOICE', 'FILL_IN_BLANK', 'MATCHING', 'TFNG', 'YNNG', 'TABLE_COMPLETION'],
  listening: ['MULTIPLE_CHOICE', 'FILL_IN_BLANK', 'map_labeling', 'matching', 'TABLE_COMPLETION'],
  writing:   ['WRITING_TASK1', 'WRITING_TASK2'],
  speaking:  ['SPEAKING_PART1', 'SPEAKING_PART2', 'SPEAKING_PART3'],
};

export function getTypesForModule(module: BuilderModule): QuestionType[] {
  return MODULE_TYPES[module] ?? [];
}

export function getRegistryEntry(type: QuestionType): RegistryEntry {
  return QUESTION_FORM_REGISTRY[type] ?? { template: 'text-only', label: type };
}

export function getTemplate(type: QuestionType): FormTemplate {
  return getRegistryEntry(type).template;
}
