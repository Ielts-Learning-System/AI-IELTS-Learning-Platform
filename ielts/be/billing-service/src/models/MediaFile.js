/**
 * MediaFile.js — Metadata record for files uploaded via cloud-media-service.
 *
 * When a file is successfully uploaded to Cloudinary, cloud-media-service
 * sends the metadata to billing-service (or the caller does a POST to
 * /api/resources/files) so admins can manage the asset library from the
 * Admin Panel without re-querying Cloudinary each time.
 */

const mongoose = require('mongoose');

const mediaFileSchema = new mongoose.Schema(
  {
    /** Original filename as provided during upload. */
    name: { type: String, required: true, trim: true },

    /** Cloudinary public_id — globally unique, used for deletion via Cloudinary API. */
    publicId: { type: String, required: true, unique: true, trim: true },

    /** Full Cloudinary HTTPS delivery URL. */
    secureUrl: { type: String, required: true },

    /** File format derived from Cloudinary resource_type + format. */
    type: {
      type: String,
      enum: ['MP3', 'WAV', 'PDF', 'PNG', 'JPG', 'WEBP'],
      required: true,
    },

    /** Raw file size in bytes (from Cloudinary result.bytes). */
    sizeBytes: { type: Number, required: true, min: 0 },

    /** ObjectId of the admin/teacher who triggered the upload. */
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, required: true },

    /** Denormalised display name to avoid a User lookup on every list call. */
    uploadedByName: { type: String, default: '', trim: true },

    /** Cloudinary folder path (e.g. "ielts_platform/reading"). */
    folderName: { type: String, default: '', trim: true },

    /** Optional Tag ObjectIds for categorisation. */
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  },
  { timestamps: true }
);

// Index for fast search by name prefix and date-desc listing
mediaFileSchema.index({ name: 1 });
mediaFileSchema.index({ createdAt: -1 });
mediaFileSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('MediaFile', mediaFileSchema);
