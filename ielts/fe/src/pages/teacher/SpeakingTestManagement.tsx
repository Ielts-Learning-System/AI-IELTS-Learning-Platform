import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { Edit, FileText, LoaderCircle, Mic, Plus, Search, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { useUserStore } from '../../store/useUserStore';

type SpeakingTest = {
  _id: string;
  title: string;
  part1: string[];
  part2: string;
  part3: string[];
  createdAt?: string;
  updatedAt?: string;
  questions?: string[];
  submissionCount?: number;
};

type FormMode = 'create' | 'edit';

type SpeakingFormState = {
  title: string;
  part1: string[];
  part2: string;
  part3: string[];
};

const API_BASE = 'http://localhost:3000';

const emptyFormState: SpeakingFormState = {
  title: '',
  part1: [''],
  part2: '',
  part3: [''],
};

const getToken = (fallbackToken: string | null) =>
  fallbackToken || localStorage.getItem('token') || localStorage.getItem('accessToken') || '';

const normalizeQuestionList = (items: string[]) =>
  items.map((item) => item.trim()).filter((item) => item.length > 0);

const getTotalQuestions = (test: SpeakingTest) => {
  const part1Count = Array.isArray(test.part1) ? test.part1.length : 0;
  const part2Count = String(test.part2 || '').trim() ? 1 : 0;
  const part3Count = Array.isArray(test.part3) ? test.part3.length : 0;
  const totalByParts = part1Count + part2Count + part3Count;

  if (totalByParts > 0) return totalByParts;
  if (Array.isArray(test.questions)) return test.questions.length;
  return 0;
};

const parseSpeakingTest = (raw: any): SpeakingTest => {
  const part1 = Array.isArray(raw?.part1) ? raw.part1 : [];
  const part2 = String(raw?.part2 || '');
  const part3 = Array.isArray(raw?.part3) ? raw.part3 : [];

  return {
    _id: String(raw?._id || ''),
    title: String(raw?.title || 'Untitled speaking test'),
    part1,
    part2,
    part3,
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
    questions: Array.isArray(raw?.questions) ? raw.questions : undefined,
    submissionCount: typeof raw?.submissionCount === 'number' ? raw.submissionCount : 0,
  };
};

function DynamicQuestionList({
  label,
  values,
  onChange,
  onAdd,
  onRemove,
}: {
  label: string;
  values: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
        >
          <Plus className="h-3.5 w-3.5" />
          Add another question
        </button>
      </div>

      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={`${label}-${index}`} className="group flex items-start gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-500">
              {index + 1}
            </div>
            <input
              type="text"
              value={value}
              onChange={(event) => onChange(index, event.target.value)}
              placeholder="Enter speaking question"
              className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              disabled={values.length <= 1}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              title="Remove question"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SpeakingTestManagement() {
  const { token } = useUserStore();

  const [tests, setTests] = useState<SpeakingTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [formState, setFormState] = useState<SpeakingFormState>(emptyFormState);
  const [isSaving, setIsSaving] = useState(false);

  const filteredTests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tests;
    return tests.filter((test) => String(test.title || '').toLowerCase().includes(q));
  }, [tests, searchQuery]);

  const resetForm = () => {
    setFormMode('create');
    setEditingTestId(null);
    setFormState(emptyFormState);
  };

  const fetchTests = async () => {
    try {
      setIsLoading(true);
      const authToken = getToken(token);

      const response = await axios.get(`${API_BASE}/api/speaking/tests`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      });

      const payload = response.data?.data ?? response.data;
      const nextTests = Array.isArray(payload) ? payload.map(parseSpeakingTest) : [];
      setTests(nextTests);
    } catch (error: any) {
      console.error('Failed to fetch speaking tests:', error);
      toast.error(error.response?.data?.message || 'Could not load speaking tests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const openCreateModal = () => {
    resetForm();
    setIsFormModalOpen(true);
  };

  const openEditModal = (test: SpeakingTest) => {
    setFormMode('edit');
    setEditingTestId(test._id);
    setFormState({
      title: test.title || '',
      part1: Array.isArray(test.part1) && test.part1.length > 0 ? [...test.part1] : [''],
      part2: test.part2 || '',
      part3: Array.isArray(test.part3) && test.part3.length > 0 ? [...test.part3] : [''],
    });
    setIsFormModalOpen(true);
  };

  const updatePartField = (part: 'part1' | 'part3', index: number, value: string) => {
    setFormState((current) => {
      const next = [...current[part]];
      next[index] = value;
      return {
        ...current,
        [part]: next,
      };
    });
  };

  const addQuestionToPart = (part: 'part1' | 'part3') => {
    setFormState((current) => ({
      ...current,
      [part]: [...current[part], ''],
    }));
  };

  const removeQuestionFromPart = (part: 'part1' | 'part3', index: number) => {
    setFormState((current) => {
      if (current[part].length <= 1) return current;
      const next = current[part].filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        [part]: next,
      };
    });
  };

  const handleSaveTest = async (event: React.FormEvent) => {
    event.preventDefault();

    const cleanTitle = formState.title.trim();
    const cleanPart1 = normalizeQuestionList(formState.part1);
    const cleanPart2 = String(formState.part2 || '').trim();
    const cleanPart3 = normalizeQuestionList(formState.part3);

    if (!cleanTitle) {
      toast.error('Title is required.');
      return;
    }

    if (cleanPart1.length === 0) {
      toast.error('Part 1 needs at least one question.');
      return;
    }

    if (!cleanPart2) {
      toast.error('Part 2 cue card prompt is required.');
      return;
    }

    if (cleanPart3.length === 0) {
      toast.error('Part 3 needs at least one question.');
      return;
    }

    try {
      setIsSaving(true);
      const authToken = getToken(token);

      const payload = {
        title: cleanTitle,
        part1: cleanPart1,
        part2: cleanPart2,
        part3: cleanPart3,
      };

      if (formMode === 'create') {
        await axios.post(`${API_BASE}/api/speaking/tests`, payload, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        toast.success('Created speaking test successfully.');
      } else if (editingTestId) {
        await axios.put(`${API_BASE}/api/speaking/tests/${editingTestId}`, payload, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        toast.success('Updated speaking test successfully.');
      }

      setIsFormModalOpen(false);
      resetForm();
      fetchTests();
    } catch (error: any) {
      console.error('Failed to save speaking test:', error);
      toast.error(error.response?.data?.message || 'Could not save speaking test.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTest = async (testId: string, submissionCount: number) => {
    if (submissionCount > 0) return; // guard: button should already be disabled
    if (!window.confirm('Delete this speaking test?')) return;

    try {
      const authToken = getToken(token);
      await axios.delete(`${API_BASE}/api/speaking/tests/${testId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      toast.success('Deleted speaking test.');
      setTests((current) => current.filter((item) => item._id !== testId));
    } catch (error: any) {
      console.error('Failed to delete speaking test:', error);
      toast.error(error.response?.data?.message || 'Could not delete speaking test.');
    }
  };

  return (
    <section className="space-y-6">
      <Toaster position="top-right" />

      <div className="rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#fff6f6_0%,#ffffff_52%,#f8fafc_100%)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-600">
              <Mic className="h-3.5 w-3.5" />
              Speaking Prompt Bank
            </div>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Speaking Test Management</h2>
            <p className="mt-2 text-sm text-slate-500">
              Create, edit, and assign IELTS Speaking tests with structured Part 1, Part 2, and Part 3 prompts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/teacher/speaking-pdf"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700"
            >
              <FileText className="h-4 w-4" />
              Tạo từ PDF (AI)
            </Link>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#E31837] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(227,24,55,0.28)] transition hover:bg-[#C51430]"
            >
              <Plus className="h-4 w-4" />
              New Speaking Test
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by test title"
            className="h-9 flex-1 border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Title</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Total Questions</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Date</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center">
                    <div className="inline-flex items-center gap-2 text-red-600">
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                      <span className="font-semibold">Loading speaking tests...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center">
                    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-red-200 bg-red-50/40 px-6 py-10">
                      <Mic className="mx-auto mb-3 h-9 w-9 text-red-500" />
                      <p className="text-lg font-bold text-slate-900">No speaking tests found</p>
                      <p className="mt-2 text-sm text-slate-500">Create your first speaking test to start assigning students.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTests.map((test) => (
                  <tr key={test._id} className="transition hover:bg-red-50/30">
                    <td className="px-5 py-4 align-top">
                      <p className="font-semibold text-slate-900">{test.title}</p>
                      <p className="mt-1 text-xs text-slate-500">Part 1: {test.part1?.length || 0} | Part 2: {test.part2 ? 1 : 0} | Part 3: {test.part3?.length || 0}</p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100">
                        {getTotalQuestions(test)} questions
                      </span>
                    </td>
                    <td className="px-5 py-4 align-top text-sm text-slate-600">
                      {test.createdAt ? format(new Date(test.createdAt), 'dd/MM/yyyy HH:mm') : '--'}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(test)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </button>

                        <span
                          title={
                            (test.submissionCount ?? 0) > 0
                              ? 'Cannot delete: Students have already taken this test.'
                              : undefined
                          }
                          className="inline-flex"
                        >
                          <button
                            type="button"
                            onClick={() => handleDeleteTest(test._id, test.submissionCount ?? 0)}
                            disabled={(test.submissionCount ?? 0) > 0}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                            {(test.submissionCount ?? 0) > 0 && (
                              <span className="ml-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                {test.submissionCount}
                              </span>
                            )}
                          </button>
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-4xl rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">{formMode === 'create' ? 'Create' : 'Edit'}</p>
                <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Speaking Test Form</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFormModalOpen(false);
                  resetForm();
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTest} className="space-y-5 px-6 py-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">Test Title</label>
                <input
                  type="text"
                  value={formState.title}
                  onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Test 01: Technology & Hometown"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <DynamicQuestionList
                label="Part 1: Introduction Questions"
                values={formState.part1}
                onChange={(index, value) => updatePartField('part1', index, value)}
                onAdd={() => addQuestionToPart('part1')}
                onRemove={(index) => removeQuestionFromPart('part1', index)}
              />

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">Part 2: Cue Card Prompt</label>
                <textarea
                  rows={4}
                  value={formState.part2}
                  onChange={(event) => setFormState((current) => ({ ...current, part2: event.target.value }))}
                  placeholder="Describe a technology that has changed your life..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <DynamicQuestionList
                label="Part 3: Discussion Questions"
                values={formState.part3}
                onChange={(index, value) => updatePartField('part3', index, value)}
                onAdd={() => addQuestionToPart('part3')}
                onRemove={(index) => removeQuestionFromPart('part3', index)}
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormModalOpen(false);
                    resetForm();
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#E31837] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#C51430] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                  {isSaving ? 'Saving...' : formMode === 'create' ? 'Create Test' : 'Update Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </section>
  );
}
