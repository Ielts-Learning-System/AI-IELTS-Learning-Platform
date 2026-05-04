/**
 * parseExcel.ts
 * Client-side Excel → JSON parser for the IELTS import wizard.
 * Uses the `xlsx` (SheetJS) library to read .xlsx files in the browser.
 *
 * Supported scopes and sheet mapping:
 *   reading  → sheet "Reading"
 *   listening → sheet "Listening"
 *   writing  → sheet "Writing"
 *   speaking → sheet "Speaking"
 *   exam     → all four sheets above
 */

import * as XLSX from 'xlsx';

// ─── Module scope ─────────────────────────────────────────────────────────────
export type ModuleScope = 'reading' | 'listening' | 'writing' | 'speaking' | 'exam';

// ─── Shared helper types ──────────────────────────────────────────────────────

/** Validation errors attached to every parsed sub-object. */
export type FieldErrors = Record<string, string>; // fieldName → error message

// ─── Reading types ────────────────────────────────────────────────────────────
export interface ParsedReadingQuestion {
  questionNumber: number;
  type: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  _errors: FieldErrors;
}

export interface ParsedReadingPassage {
  passageNumber: number;
  title: string;
  content: string;
  image: string;
  questions: ParsedReadingQuestion[];
  _errors: FieldErrors;
}

export interface ParsedReadingTest {
  testId: string;
  title: string;
  description: string;
  passages: ParsedReadingPassage[];
  hasErrors: boolean;
}

// ─── Listening types ──────────────────────────────────────────────────────────
export interface ParsedListeningQuestion {
  questionText: string;
  type: string;
  options: string[];
  imageUrl: string;
  correctAnswer: string;
  _errors: FieldErrors;
}

export interface ParsedListeningPart {
  partNumber: number;
  title: string;
  audioUrl: string;
  description: string;
  questions: ParsedListeningQuestion[];
  _errors: FieldErrors;
}

export interface ParsedListeningTest {
  testId: string;
  title: string;
  description: string;
  parts: ParsedListeningPart[];
  hasErrors: boolean;
}

// ─── Writing types ────────────────────────────────────────────────────────────
export interface ParsedWritingTask {
  taskNumber: number;
  title: string;
  content: string;
  imageUrl: string;
  minWords: number;
  _errors: FieldErrors;
}

export interface ParsedWritingTest {
  testId: string;
  title: string;
  description: string;
  tasks: ParsedWritingTask[];
  hasErrors: boolean;
}

// ─── Speaking types ───────────────────────────────────────────────────────────
export interface ParsedSpeakingQuestion {
  partNumber: number;
  text: string;
  _errors: FieldErrors;
}

export interface ParsedSpeakingTest {
  testId: string;
  title: string;
  part1: string[];      // list of questions
  part2: string;        // cue card text
  part3: string[];      // list of questions
  hasErrors: boolean;
}

// ─── Top-level result ─────────────────────────────────────────────────────────
export interface ParsedExcelResult {
  reading: ParsedReadingTest[];
  listening: ParsedListeningTest[];
  writing: ParsedWritingTest[];
  speaking: ParsedSpeakingTest[];
  /** True if any test in any skill has a critical field error. */
  hasErrors: boolean;
  /** Sheet names that were expected but not found in the workbook. */
  missedSheets: string[];
}

// ─── Row type (raw from xlsx) ─────────────────────────────────────────────────
type Row = Record<string, string | number | boolean | null | undefined>;

const str = (v: unknown): string => String(v ?? '').trim();
const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const splitOptions = (raw: string): string[] =>
  raw ? raw.split('|').map((s) => s.trim()).filter(Boolean) : [];

// ─── Reading parser ───────────────────────────────────────────────────────────
// Excel columns: test_id | passage_id | order | question_type |
//                passage_text | question_text | options_json | answer
function parseReadingSheet(rows: Row[]): ParsedReadingTest[] {
  const testMap = new Map<string, ParsedReadingTest>();

  for (const row of rows) {
    const testId = str(row['test_id']);
    if (!testId) continue;

    if (!testMap.has(testId)) {
      testMap.set(testId, {
        testId,
        title: testId, // no dedicated title column; use test_id as default title
        description: '',
        passages: [],
        hasErrors: false,
      });
    }
    const test = testMap.get(testId)!;

    // passage_id like "T1_R1", "T1_R2" → passage number derived from index
    const passageId = str(row['passage_id']);
    let passage = test.passages.find((p) => p.title === passageId);
    if (!passage) {
      const passageContent = str(row['passage_text']);
      const errors: FieldErrors = {};
      if (!passageContent) {
        errors['content'] = 'Thiếu nội dung bài đọc (passage_text)';
        test.hasErrors = true;
      }
      passage = {
        passageNumber: test.passages.length + 1,
        title: passageId,
        content: passageContent,
        image: '',
        questions: [],
        _errors: errors,
      };
      test.passages.push(passage);
    }
    // Back-fill passage_text from the first row that has it
    if (!passage.content && str(row['passage_text'])) {
      passage.content = str(row['passage_text']);
      delete passage._errors['content'];
    }

    const questionText = str(row['question_text']);
    if (!questionText) continue;

    const errors: FieldErrors = {};
    const correctAnswer = str(row['answer']);
    if (!correctAnswer) errors['correctAnswer'] = 'Thiếu đáp án đúng (answer)';
    if (Object.keys(errors).length > 0) test.hasErrors = true;

    // options_json is a JSON string e.g. '["TRUE","FALSE","NOT GIVEN"]'
    let options: string[] = [];
    try {
      const parsed = JSON.parse(str(row['options_json']));
      if (Array.isArray(parsed)) options = parsed.map(String);
    } catch {
      options = splitOptions(str(row['options_json']));
    }

    passage.questions.push({
      questionNumber: num(row['order'], passage.questions.length + 1),
      type: str(row['question_type']) || 'FILL_IN_BLANK',
      text: questionText,
      options,
      correctAnswer,
      explanation: '',
      _errors: errors,
    });
  }

  return Array.from(testMap.values());
}

// ─── Listening parser ─────────────────────────────────────────────────────────
// Excel columns: test_id | section_id | order | question_type |
//                audio_url | image_url | question_text | options_json | answer
function parseListeningSheet(rows: Row[]): ParsedListeningTest[] {
  const testMap = new Map<string, ParsedListeningTest>();

  for (const row of rows) {
    const testId = str(row['test_id']);
    if (!testId) continue;

    if (!testMap.has(testId)) {
      testMap.set(testId, {
        testId,
        title: testId,
        description: '',
        parts: [],
        hasErrors: false,
      });
    }
    const test = testMap.get(testId)!;

    const sectionId = str(row['section_id']); // e.g. T1_L1, T1_L2
    let part = test.parts.find((p) => p.title === sectionId);
    if (!part) {
      const audioUrl = str(row['audio_url']);
      const partErrors: FieldErrors = {};
      if (!audioUrl) {
        partErrors['audioUrl'] = 'Thiếu đường dẫn audio (audio_url)';
        test.hasErrors = true;
      }
      part = {
        partNumber: test.parts.length + 1,
        title: sectionId,
        audioUrl,
        description: '',
        questions: [],
        _errors: partErrors,
      };
      test.parts.push(part);
    }

    const questionText = str(row['question_text']);
    if (!questionText) continue;

    const errors: FieldErrors = {};
    const correctAnswer = str(row['answer']);
    if (!correctAnswer) errors['correctAnswer'] = 'Thiếu đáp án đúng (answer)';
    if (Object.keys(errors).length > 0) test.hasErrors = true;

    let options: string[] = [];
    try {
      const parsed = JSON.parse(str(row['options_json']));
      if (Array.isArray(parsed)) options = parsed.map(String);
    } catch {
      options = splitOptions(str(row['options_json']));
    }

    part.questions.push({
      questionText,
      type: str(row['question_type']) || 'fill_blank',
      options,
      imageUrl: str(row['image_url']),
      correctAnswer,
      _errors: errors,
    });
  }

  return Array.from(testMap.values());
}

// ─── Writing parser ───────────────────────────────────────────────────────────
// Excel columns: test_id | task | order | question_type |
//                image_url | question_text | rubric | answer
function parseWritingSheet(rows: Row[]): ParsedWritingTest[] {
  const testMap = new Map<string, ParsedWritingTest>();

  for (const row of rows) {
    const testId = str(row['test_id']);
    if (!testId) continue;

    if (!testMap.has(testId)) {
      testMap.set(testId, {
        testId,
        title: testId,
        description: '',
        tasks: [],
        hasErrors: false,
      });
    }
    const test = testMap.get(testId)!;

    // task column is "Task 1" / "Task 2"
    const taskLabel = str(row['task']); // "Task 1" or "Task 2"
    const taskNum = taskLabel.toLowerCase().includes('1') ? 1 : 2;
    const promptText = str(row['question_text']);

    const errors: FieldErrors = {};
    if (!promptText) errors['content'] = 'Thiếu nội dung đề bài (question_text)';
    if (!taskLabel) errors['title'] = 'Thiếu tên task (task)';
    if (Object.keys(errors).length > 0) test.hasErrors = true;

    test.tasks.push({
      taskNumber: taskNum,
      title: taskLabel,
      content: promptText,
      imageUrl: str(row['image_url']),
      minWords: taskNum === 1 ? 150 : 250,
      _errors: errors,
    });
  }

  return Array.from(testMap.values());
}

// ─── Speaking parser ──────────────────────────────────────────────────────────
// Excel columns: test_id | part | order | question_type |
//                cue_card | question_text | answer
// part = "Part 1" | "Part 2" | "Part 3"
// Part 2: cue_card field holds the cue card HTML; question_text is the timing instruction
// Part 1 & 3: question_text holds the question
function parseSpeakingSheet(rows: Row[]): ParsedSpeakingTest[] {
  const testMap = new Map<string, ParsedSpeakingTest>();

  for (const row of rows) {
    const testId = str(row['test_id']);
    if (!testId) continue;

    if (!testMap.has(testId)) {
      testMap.set(testId, {
        testId,
        title: testId,
        part1: [],
        part2: '',
        part3: [],
        hasErrors: false,
      });
    }
    const test = testMap.get(testId)!;

    const part = str(row['part']); // "Part 1", "Part 2", "Part 3"
    const cueCard = str(row['cue_card']);
    const questionText = str(row['question_text']);

    if (part === 'Part 2') {
      if (cueCard && !test.part2) test.part2 = cueCard;
    } else if (part === 'Part 1') {
      if (questionText) test.part1.push(questionText);
    } else if (part === 'Part 3') {
      if (questionText) test.part3.push(questionText);
    }
  }

  // Validate
  for (const test of testMap.values()) {
    if (!test.part2) test.hasErrors = true;
    if (test.part1.length === 0) test.hasErrors = true;
    if (test.part3.length === 0) test.hasErrors = true;
  }

  return Array.from(testMap.values());
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function parseExcelFile(
  file: File,
  scope: ModuleScope
): Promise<ParsedExcelResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const sheetsToParse: string[] =
    scope === 'exam'
      ? ['Reading', 'Listening', 'Writing', 'Speaking']
      : [scope.charAt(0).toUpperCase() + scope.slice(1)];

  const result: ParsedExcelResult = {
    reading: [],
    listening: [],
    writing: [],
    speaking: [],
    hasErrors: false,
    missedSheets: [],
  };

  for (const sheetName of sheetsToParse) {
    if (!wb.SheetNames.includes(sheetName)) {
      result.missedSheets.push(sheetName);
      continue;
    }

    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: '' });
    const lower = sheetName.toLowerCase();

    if (lower === 'reading') {
      result.reading = parseReadingSheet(rows);
      if (result.reading.some((t) => t.hasErrors)) result.hasErrors = true;
    } else if (lower === 'listening') {
      result.listening = parseListeningSheet(rows);
      if (result.listening.some((t) => t.hasErrors)) result.hasErrors = true;
    } else if (lower === 'writing') {
      result.writing = parseWritingSheet(rows);
      if (result.writing.some((t) => t.hasErrors)) result.hasErrors = true;
    } else if (lower === 'speaking') {
      result.speaking = parseSpeakingSheet(rows);
      if (result.speaking.some((t) => t.hasErrors)) result.hasErrors = true;
    }
  }

  return result;
}
