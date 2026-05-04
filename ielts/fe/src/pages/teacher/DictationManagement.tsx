'use client'; // harmless in Vite; required for Next.js App Router

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { dictationApi, type Difficulty, type DictationWord } from '../../api/dictation.api';

// Gateway root (strips the trailing /api from VITE_API_URL)
// e.g. "http://localhost:3000/api" → "http://localhost:3000"
const GATEWAY_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/api$/, '');

/**
 * Resolves an audioUrl to a fully-qualified URL the browser can fetch.
 * - Cloudinary / any absolute URL → returned unchanged
 * - Local path like "/audio/arctic_*.wav" → prefixed with GATEWAY_BASE
 *   so the API-gateway's /audio proxy serves it (port 3000, not 5173).
 */
function resolveAudioUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${GATEWAY_BASE}${url}`;
}

// ── Types ──────────────────────────────────────────────────────────

interface FormState {
  transcript: string;
  difficulty: Difficulty;
  speaker: string;
  audio: File | null;
}

const INITIAL_FORM: FormState = {
  transcript: '',
  difficulty: 'medium',
  speaker: 'unknown',
  audio: null,
};

const DIFFICULTY_BADGE: Record<Difficulty, string> = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-red-100 text-red-800',
};

// ── Component ──────────────────────────────────────────────────────

export default function DictationManagement() {
  const [words, setWords] = useState<DictationWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination & filter state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<DictationWord | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch ────────────────────────────────────────────────────────

  const fetchWords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dictationApi.getAll({
        page,
        limit: 15,
        difficulty: filterDifficulty || undefined,
        search: search || undefined,
      });
      setWords(res.data.data);
      setTotalPages(res.data.pagination.pages);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to load dictation words';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, filterDifficulty, search]);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterDifficulty]);

  // ── Modal helpers ────────────────────────────────────────────────

  const openCreate = () => {
    setEditingWord(null);
    setForm(INITIAL_FORM);
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setModalOpen(true);
  };

  const openEdit = (word: DictationWord) => {
    setEditingWord(word);
    setForm({
      transcript: word.transcript,
      difficulty: word.difficulty,
      speaker: word.speaker,
      audio: null,
    });
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormError(null);
  };

  // ── Submit ───────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.transcript.trim()) {
      setFormError('Transcript is required');
      return;
    }
    if (!editingWord && !form.audio) {
      setFormError('An audio file is required for new words');
      return;
    }

    setSubmitting(true);
    try {
      if (editingWord) {
        await dictationApi.update(editingWord._id, form);
      } else {
        await dictationApi.create(form);
      }
      closeModal();
      fetchWords();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setFormError(
        axiosErr.response?.data?.message ?? 'An error occurred. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await dictationApi.remove(id);
      fetchWords();
    } catch {
      setError('Failed to delete word');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dictation Word Bank</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage audio sentences for the Dictation (Nghe chép chính tả) feature
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Add Word
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search transcript…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">All Levels</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 w-8">#</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Transcript</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Level</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Speaker</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Audio</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Source</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : words.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400">
                  No words found
                </td>
              </tr>
            ) : (
              words.map((word, idx) => (
                <tr key={word._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400">
                    {(page - 1) * 15 + idx + 1}
                  </td>
                  <td className="px-4 py-3 text-gray-900 max-w-xs truncate" title={word.transcript}>
                    {word.transcript}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_BADGE[word.difficulty]}`}
                    >
                      {word.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{word.speaker}</td>
                  <td className="px-4 py-3">
                    <audio
                      controls
                      src={resolveAudioUrl(word.audioUrl)}
                      className="h-8 w-48"
                      preload="none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        word.source === 'cloudinary'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {word.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => openEdit(word)}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(word._id)}
                      disabled={deletingId === word._id}
                      className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                    >
                      {deletingId === word._id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editingWord ? 'Edit Dictation Word' : 'Add New Dictation Word'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Transcript */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transcript <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={form.transcript}
                  onChange={(e) => setForm((f) => ({ ...f, transcript: e.target.value }))}
                  placeholder="E.g. She saw the answer in his face."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.difficulty}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, difficulty: e.target.value as Difficulty }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              {/* Speaker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Speaker
                </label>
                <input
                  type="text"
                  value={form.speaker}
                  onChange={(e) => setForm((f) => ({ ...f, speaker: e.target.value }))}
                  placeholder="male / female / unknown"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Audio file */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Audio File {!editingWord && <span className="text-red-500">*</span>}
                  {editingWord && (
                    <span className="text-gray-400 font-normal"> (leave blank to keep existing)</span>
                  )}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, audio: e.target.files?.[0] ?? null }))
                  }
                  className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {editingWord?.audioUrl && !form.audio && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Current audio:</p>
                    <audio controls src={resolveAudioUrl(editingWord.audioUrl)} className="h-8 w-full" preload="none" />
                  </div>
                )}
              </div>

              {/* Form error */}
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : editingWord ? 'Save Changes' : 'Create Word'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
