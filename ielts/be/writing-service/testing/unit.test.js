'use strict';
/**
 * writing-service — unit.test.js
 * Pure function tests for submission controller helpers.
 */

// ─── roundToNearestHalf ───────────────────────────────────────────────────────
const roundToNearestHalf = (value) => Math.round(value * 2) / 2;

describe('roundToNearestHalf (band score rounding)', () => {
  it('6.0 stays 6.0', () => expect(roundToNearestHalf(6.0)).toBe(6.0));
  it('6.125 → 6.0', () => expect(roundToNearestHalf(6.125)).toBe(6.0));
  it('6.375 → 6.5', () => expect(roundToNearestHalf(6.375)).toBe(6.5));
  it('6.75 → 7.0', () => expect(roundToNearestHalf(6.75)).toBe(7.0));
  it('0 stays 0', () => expect(roundToNearestHalf(0)).toBe(0));
  it('9 stays 9', () => expect(roundToNearestHalf(9)).toBe(9.0));
});

// ─── calculateOverallBand ─────────────────────────────────────────────────────
const calculateOverallBand = ({ TR, CC, LR, GRA }) => {
  const average = (Number(TR) + Number(CC) + Number(LR) + Number(GRA)) / 4;
  return roundToNearestHalf(average);
};

describe('calculateOverallBand', () => {
  it('averages four equal criteria', () => {
    expect(calculateOverallBand({ TR: 7, CC: 7, LR: 7, GRA: 7 })).toBe(7.0);
  });

  it('rounds to nearest 0.5', () => {
    expect(calculateOverallBand({ TR: 6, CC: 6, LR: 7, GRA: 7 })).toBe(6.5);
  });

  it('calculates band 7.0 from mixed criteria', () => {
    expect(calculateOverallBand({ TR: 7, CC: 8, LR: 6, GRA: 7 })).toBe(7.0);
  });

  it('handles minimum band 1 input', () => {
    expect(calculateOverallBand({ TR: 1, CC: 1, LR: 1, GRA: 1 })).toBe(1.0);
  });

  it('handles maximum band 9 input', () => {
    expect(calculateOverallBand({ TR: 9, CC: 9, LR: 9, GRA: 9 })).toBe(9.0);
  });

  it('handles string numbers from request body', () => {
    expect(calculateOverallBand({ TR: '7', CC: '7', LR: '7', GRA: '7' })).toBe(7.0);
  });
});

// ─── countWords ───────────────────────────────────────────────────────────────
const countWords = (content) => {
  const plainText = String(content || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plainText ? plainText.split(' ').length : 0;
};

describe('countWords', () => {
  it('counts plain text words', () => {
    expect(countWords('The quick brown fox jumps')).toBe(5);
  });

  it('strips HTML tags before counting', () => {
    expect(countWords('<p>Hello world</p>')).toBe(2);
  });

  it('handles nested tags', () => {
    expect(countWords('<p><strong>IELTS</strong> Writing Task</p>')).toBe(3);
  });

  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(countWords(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(countWords(undefined)).toBe(0);
  });

  it('returns 0 for HTML with only whitespace inside', () => {
    expect(countWords('<p>   </p>')).toBe(0);
  });

  it('handles 150-word Task 1 length (boundary)', () => {
    const text = 'word '.repeat(150).trim();
    expect(countWords(text)).toBe(150);
  });
});
