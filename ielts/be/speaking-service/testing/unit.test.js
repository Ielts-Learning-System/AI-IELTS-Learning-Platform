'use strict';
/**
 * speaking-service — unit.test.js
 * Pure function tests.
 */

// Inline helpers (mirrors controller logic)
const roundToNearestHalf = (value) => Math.round(value * 2) / 2;

const calculateOverallBand = ({ FC, LR, GRA, PR }) => {
  const average = (Number(FC) + Number(LR) + Number(GRA) + Number(PR)) / 4;
  return roundToNearestHalf(average);
};

describe('roundToNearestHalf', () => {
  it('rounds 6.25 → 6.5', () => expect(roundToNearestHalf(6.25)).toBe(6.5));
  it('rounds 6.0 → 6.0', () => expect(roundToNearestHalf(6.0)).toBe(6.0));
  it('rounds 6.75 → 7.0', () => expect(roundToNearestHalf(6.75)).toBe(7.0));
  it('rounds 5.1 → 5.0', () => expect(roundToNearestHalf(5.1)).toBe(5.0));
  it('rounds 5.5 → 5.5', () => expect(roundToNearestHalf(5.5)).toBe(5.5));
});

describe('calculateOverallBand', () => {
  it('averages 4 equal bands', () => {
    expect(calculateOverallBand({ FC: 7, LR: 7, GRA: 7, PR: 7 })).toBe(7.0);
  });

  it('averages 4 mixed bands and rounds to nearest 0.5', () => {
    // (6 + 7 + 7 + 7) / 4 = 6.75 → 7.0
    expect(calculateOverallBand({ FC: 6, LR: 7, GRA: 7, PR: 7 })).toBe(7.0);
  });

  it('averages yielding 6.25 → 6.5', () => {
    // (5 + 7 + 6 + 7) / 4 = 6.25 → 6.5
    expect(calculateOverallBand({ FC: 5, LR: 7, GRA: 6, PR: 7 })).toBe(6.5);
  });

  it('handles string number inputs', () => {
    expect(calculateOverallBand({ FC: '8', LR: '8', GRA: '8', PR: '8' })).toBe(8.0);
  });

  it('returns 0 for all-zero inputs', () => {
    expect(calculateOverallBand({ FC: 0, LR: 0, GRA: 0, PR: 0 })).toBe(0);
  });
});
