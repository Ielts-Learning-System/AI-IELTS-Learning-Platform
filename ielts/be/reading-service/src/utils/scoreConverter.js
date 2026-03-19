const bandTable = [
  { min: 39, max: 40, band: 9.0 },
  { min: 37, max: 38, band: 8.5 },
  { min: 35, max: 36, band: 8.0 },
  { min: 33, max: 34, band: 7.5 },
  { min: 30, max: 32, band: 7.0 },
  { min: 27, max: 29, band: 6.5 },
  { min: 23, max: 26, band: 6.0 },
  { min: 19, max: 22, band: 5.5 },
  { min: 15, max: 18, band: 5.0 },
  { min: 13, max: 14, band: 4.5 },
  { min: 10, max: 12, band: 4.0 },
  { min: 8, max: 9, band: 3.5 },
  { min: 6, max: 7, band: 3.0 },
  { min: 4, max: 5, band: 2.5 },
  { min: 2, max: 3, band: 2.0 },
  { min: 0, max: 1, band: 1.5 },
];

const normalizeScore = (rawScore) => {
  if (Number.isNaN(Number(rawScore))) return 0;
  const numeric = Number(rawScore);
  return Math.max(0, Math.min(40, Math.floor(numeric)));
};

const convertRawToBand = (rawScore, moduleType = 'reading') => {
  const normalizedRawScore = normalizeScore(rawScore);
  const normalizedModule = String(moduleType || '').toLowerCase();

  // Reading Academic and Listening are aligned in this baseline table.
  if (normalizedModule !== 'reading' && normalizedModule !== 'listening') {
    return 0;
  }

  const mapped = bandTable.find(
    (item) => normalizedRawScore >= item.min && normalizedRawScore <= item.max
  );

  return mapped ? mapped.band : 0;
};

module.exports = { convertRawToBand };