/**
 * Tag.js — Content categorisation tags for IELTS resources.
 *
 * Categories:
 *   Source        — e.g. "Cambridge 15", "Actual Test 2024"
 *   Question Type — e.g. "Matching Headings", "True/False/Not Given"
 *   Difficulty    — e.g. "Hard Difficulty"
 *   Level         — e.g. "Band 7.0+ Target"
 *   Skill         — e.g. "Reading", "Writing"
 *   Other
 */

const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      enum: ['Source', 'Question Type', 'Difficulty', 'Level', 'Skill', 'Other'],
      default: 'Other',
    },

    /**
     * Optional Tailwind colour classes string for the badge
     * (e.g. "bg-blue-100 text-blue-700 border-blue-200").
     * When empty the frontend falls back to a per-category default.
     */
    color: { type: String, default: '', trim: true },

    /**
     * Denormalised usage counter incremented whenever a resource is tagged.
     * Avoids an expensive $count aggregation on every tags list call.
     */
    usageCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

tagSchema.index({ category: 1, name: 1 });

module.exports = mongoose.model('Tag', tagSchema);
