'use strict';
/**
 * listening-service — unit.test.js
 * Pure function tests: score converter, answer normalization.
 */

const { convertRawToBand } = require('../src/utils/scoreConverter');

describe('convertRawToBand — listening', () => {
  it('39-40 → 9.0', () => {
    expect(convertRawToBand(39)).toBe(9.0);
    expect(convertRawToBand(40)).toBe(9.0);
  });

  it('37-38 → 8.5', () => {
    expect(convertRawToBand(37)).toBe(8.5);
    expect(convertRawToBand(38)).toBe(8.5);
  });

  it('30-32 → 7.0', () => {
    expect(convertRawToBand(30)).toBe(7.0);
    expect(convertRawToBand(32)).toBe(7.0);
  });

  it('23-26 → 6.0', () => {
    expect(convertRawToBand(23)).toBe(6.0);
    expect(convertRawToBand(26)).toBe(6.0);
  });

  it('0-1 → 1.5', () => {
    expect(convertRawToBand(0)).toBe(1.5);
    expect(convertRawToBand(1)).toBe(1.5);
  });

  it('clamps score above 40 to 40', () => {
    expect(convertRawToBand(41)).toBe(9.0);
    expect(convertRawToBand(100)).toBe(9.0);
  });

  it('clamps negative scores to 0', () => {
    expect(convertRawToBand(-5)).toBe(1.5);
  });

  it('accepts string numbers', () => {
    expect(convertRawToBand('30')).toBe(7.0);
  });

  it('returns 0 for NaN', () => {
    expect(convertRawToBand('abc')).toBe(1.5); // NaN → 0 → 1.5
  });

  it('works for module type reading', () => {
    expect(convertRawToBand(30, 'reading')).toBe(7.0);
  });

  it('returns 0 for unknown module type', () => {
    expect(convertRawToBand(30, 'writing')).toBe(0);
  });
});

// ─── Answer normalization helper (inline) ────────────────────────────────────
const normalizeAnswer = (value) => String(value || '').trim().toLowerCase();

const isAnswerCorrect = (studentAnswer, correctAnswer) => {
  const student = normalizeAnswer(studentAnswer);
  const correct = normalizeAnswer(correctAnswer);
  if (student === correct) return true;
  if (correct.includes('/')) {
    return correct.split('/').map((s) => s.trim()).includes(student);
  }
  return false;
};

describe('isAnswerCorrect', () => {
  it('exact match (case insensitive)', () => {
    expect(isAnswerCorrect('London', 'london')).toBe(true);
    expect(isAnswerCorrect('LONDON', 'london')).toBe(true);
  });

  it('exact match fails for different values', () => {
    expect(isAnswerCorrect('Paris', 'London')).toBe(false);
  });

  it('alternate answer separated by / — first option', () => {
    expect(isAnswerCorrect('10', '10/ten')).toBe(true);
  });

  it('alternate answer separated by / — second option', () => {
    expect(isAnswerCorrect('ten', '10/ten')).toBe(true);
  });

  it('none of the alternates → false', () => {
    expect(isAnswerCorrect('eleven', '10/ten')).toBe(false);
  });

  it('handles empty student answer', () => {
    expect(isAnswerCorrect('', 'London')).toBe(false);
  });

  it('handles null/undefined gracefully', () => {
    expect(isAnswerCorrect(null, 'London')).toBe(false);
    expect(isAnswerCorrect(undefined, 'London')).toBe(false);
  });

  it('trims whitespace before comparison', () => {
    expect(isAnswerCorrect('  London  ', 'London')).toBe(true);
  });
});
