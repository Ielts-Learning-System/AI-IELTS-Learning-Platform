// ─────────────────────────────────────────────────────────────────────────────
// Template 2 – Text + Media Form
// Covers: Map Labeling, Diagram, Writing Task 1, Listening with image/audio
// Extends TextOnlyForm by adding a Media Upload section above the question.
// ─────────────────────────────────────────────────────────────────────────────

import { useFormContext } from 'react-hook-form';
import { Image, Music, Link, X } from 'lucide-react';
import { TextOnlyForm } from './TextOnlyForm';
import type { TextMediaValues } from '../types';

export function TextMediaForm({ hasAudio }: { hasAudio?: boolean }) {
  const { register, watch, setValue, formState: { errors } } = useFormContext<TextMediaValues>();

  const mediaUrl   = watch('mediaUrl');
  const mediaType  = watch('mediaType');

  function handleClear() {
    setValue('mediaUrl', '');
    setValue('mediaType', 'none');
  }

  return (
    <div className="space-y-6">
      {/* ── Media zone ── */}
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 transition hover:border-red-300 hover:bg-red-50/30">
        <p className="mb-3 text-sm font-semibold text-slate-700">
          {hasAudio ? 'Hình ảnh / Audio đính kèm' : 'Hình ảnh đính kèm'}
        </p>

        {/* Type selector */}
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setValue('mediaType', 'image')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              mediaType === 'image'
                ? 'bg-red-500 text-white shadow-sm'
                : 'bg-white border border-slate-300 text-slate-600 hover:border-red-300'
            }`}
          >
            <Image className="h-3.5 w-3.5" />
            Ảnh (URL)
          </button>

          {hasAudio && (
            <button
              type="button"
              onClick={() => setValue('mediaType', 'audio')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                mediaType === 'audio'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'bg-white border border-slate-300 text-slate-600 hover:border-red-300'
              }`}
            >
              <Music className="h-3.5 w-3.5" />
              Audio (URL)
            </button>
          )}

          <button
            type="button"
            onClick={() => setValue('mediaType', 'none')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              mediaType === 'none'
                ? 'bg-slate-400 text-white'
                : 'bg-white border border-slate-300 text-slate-600 hover:border-slate-400'
            }`}
          >
            Không dùng
          </button>
        </div>

        {/* URL input */}
        {mediaType !== 'none' && (
          <div className="relative">
            <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              {...register('mediaUrl')}
              type="url"
              placeholder={
                mediaType === 'audio'
                  ? 'https://... (đường dẫn tới file audio .mp3 / .ogg)'
                  : 'https://... (đường dẫn tới ảnh .jpg / .png / .webp)'
              }
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
            {mediaUrl && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Live image preview */}
        {mediaType === 'image' && mediaUrl && (
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
            <img
              src={mediaUrl}
              alt="preview"
              className="max-h-56 w-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Audio preview */}
        {mediaType === 'audio' && mediaUrl && (
          <audio
            src={mediaUrl}
            controls
            className="mt-3 w-full rounded-xl"
          />
        )}

        {errors.mediaUrl && (
          <p className="mt-1 text-xs text-red-500">{errors.mediaUrl.message as string}</p>
        )}
      </div>

      {/* ── Reuse TextOnlyForm for the question + options section ── */}
      <TextOnlyForm />
    </div>
  );
}
