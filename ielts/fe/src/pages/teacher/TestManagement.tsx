import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, Pencil, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { TestModal } from './TestModal';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import { apiClient } from '../../lib/api/client';

type ModuleType = 'reading' | 'listening';
type FilterType = 'all' | ModuleType;

type ReadingQuestionType = 'MULTIPLE_CHOICE' | 'FILL_IN_BLANK' | 'MATCHING' | 'TFNG' | 'YNNG';
type ListeningQuestionType = 'multiple_choice' | 'fill_blank' | 'map_labeling' | 'matching';

interface ReadingQuestionForm {
  questionNumber: number;
  type: ReadingQuestionType;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface ReadingPassageForm {
  passageNumber: number;
  title: string;
  content: string;
  image: string;
  questions: ReadingQuestionForm[];
}

interface ListeningQuestionForm {
  questionText: string;
  type: ListeningQuestionType;
  options: string[];
  imageUrl: string;
  correctAnswer: string;
}

interface ListeningPartForm {
  partNumber: number;
  title: string;
  audioUrl: string;
  description: string;
  questions: ListeningQuestionForm[];
}

interface TestFormState {
  module: ModuleType;
  title: string;
  description: string;
  readingPassages: ReadingPassageForm[];
  listeningParts: ListeningPartForm[];
}

interface TestListItem {
  _id: string;
  title: string;
  module: ModuleType;
  description: string;
  questionCount: number;
  sectionCount: number;
  createdAt: string;
}

export type Test = TestListItem;

interface ReadingListResponseItem {
  _id: string;
  title: string;
  description?: string;
  totalQuestionCount?: number;
  passageCount?: number;
  createdAt?: string;
}

interface ListeningListResponseItem {
  _id: string;
  title: string;
  description?: string;
  totalQuestionCount?: number;
  partCount?: number;
  createdAt?: string;
}

interface ReadingDetailResponse {
  _id: string;
  title: string;
  description?: string;
  passages?: Array<{
    passageNumber?: number;
    title?: string;
    content?: string;
    image?: string;
    questions?: Array<{
      questionNumber?: number;
      type?: ReadingQuestionType;
      text?: string;
      options?: string[];
      correctAnswer?: string;
      explanation?: string;
    }>;
  }>;
}

interface ListeningDetailResponse {
  _id: string;
  title: string;
  description: string;
  parts?: Array<{
    partNumber?: number;
    title?: string;
    audioUrl?: string;
    description?: string;
    questions?: Array<{
      questionText?: string;
      type?: ListeningQuestionType;
      options?: string[];
      imageUrl?: string;
      correctAnswer?: string;
    }>;
  }>;
}

const READING_QUESTION_TYPES: ReadingQuestionType[] = [
  'MULTIPLE_CHOICE',
  'FILL_IN_BLANK',
  'MATCHING',
  'TFNG',
  'YNNG',
];

const LISTENING_QUESTION_TYPES: ListeningQuestionType[] = [
  'multiple_choice',
  'fill_blank',
  'map_labeling',
  'matching',
];

function createEmptyReadingQuestion(questionNumber = 1): ReadingQuestionForm {
  return {
    questionNumber,
    type: 'MULTIPLE_CHOICE',
    text: '',
    options: ['', ''],
    correctAnswer: '',
    explanation: '',
  };
}

function createEmptyReadingPassage(passageNumber = 1): ReadingPassageForm {
  return {
    passageNumber,
    title: '',
    content: '',
    image: '',
    questions: [createEmptyReadingQuestion(1)],
  };
}

function createEmptyListeningQuestion(): ListeningQuestionForm {
  return {
    questionText: '',
    type: 'multiple_choice',
    options: ['', ''],
    imageUrl: '',
    correctAnswer: '',
  };
}

function createEmptyListeningPart(partNumber = 1): ListeningPartForm {
  return {
    partNumber,
    title: '',
    audioUrl: '',
    description: '',
    questions: [createEmptyListeningQuestion()],
  };
}

function createInitialForm(module: ModuleType): TestFormState {
  return {
    module,
    title: '',
    description: '',
    readingPassages: [createEmptyReadingPassage(1)],
    listeningParts: [createEmptyListeningPart(1)],
  };
}

function normalizeReadingList(items: ReadingListResponseItem[]): TestListItem[] {
  return items.map((item) => ({
    _id: item._id,
    title: item.title,
    module: 'reading',
    description: item.description || '',
    questionCount: item.totalQuestionCount || 0,
    sectionCount: item.passageCount || 0,
    createdAt: item.createdAt || '',
  }));
}

function normalizeListeningList(items: ListeningListResponseItem[]): TestListItem[] {
  return items.map((item) => ({
    _id: item._id,
    title: item.title,
    module: 'listening',
    description: item.description || '',
    questionCount: item.totalQuestionCount || 0,
    sectionCount: item.partCount || 0,
    createdAt: item.createdAt || '',
  }));
}

function normalizeReadingDetail(test: ReadingDetailResponse): TestFormState {
  return {
    module: 'reading',
    title: test.title || '',
    description: test.description || '',
    readingPassages:
      test.passages?.map((passage, passageIndex) => ({
        passageNumber: passage.passageNumber || passageIndex + 1,
        title: passage.title || '',
        content: passage.content || '',
        image: passage.image || '',
        questions:
          passage.questions?.map((question, questionIndex) => ({
            questionNumber: question.questionNumber || questionIndex + 1,
            type: question.type || 'MULTIPLE_CHOICE',
            text: question.text || '',
            options: question.options?.length ? question.options : ['', ''],
            correctAnswer: question.correctAnswer || '',
            explanation: question.explanation || '',
          })) || [createEmptyReadingQuestion(1)],
      })) || [createEmptyReadingPassage(1)],
    listeningParts: [createEmptyListeningPart(1)],
  };
}

function normalizeListeningDetail(test: ListeningDetailResponse): TestFormState {
  return {
    module: 'listening',
    title: test.title || '',
    description: test.description || '',
    readingPassages: [createEmptyReadingPassage(1)],
    listeningParts:
      test.parts?.map((part, partIndex) => ({
        partNumber: part.partNumber || partIndex + 1,
        title: part.title || '',
        audioUrl: part.audioUrl || '',
        description: part.description || '',
        questions:
          part.questions?.map((question) => ({
            questionText: question.questionText || '',
            type: question.type || 'multiple_choice',
            options: question.options?.length ? question.options : ['', ''],
            imageUrl: question.imageUrl || '',
            correctAnswer: question.correctAnswer || '',
          })) || [createEmptyListeningQuestion()],
      })) || [createEmptyListeningPart(1)],
  };
}

function formatDate(value: string): string {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function TestManagement() {
  const location = useLocation();
  const routeModule: FilterType = location.pathname.includes('/teacher/listening')
    ? 'listening'
    : location.pathname.includes('/teacher/reading')
      ? 'reading'
      : 'all';

  const [tests, setTests] = useState<TestListItem[]>([]);
  const [selectedModule, setSelectedModule] = useState<FilterType>(routeModule);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTest, setEditingTest] = useState<TestListItem | null>(null);
  const [form, setForm] = useState<TestFormState>(createInitialForm(routeModule === 'all' ? 'reading' : routeModule));

  useEffect(() => {
    setSelectedModule(routeModule);
  }, [routeModule]);

  useEffect(() => {
    fetchTests();
  }, []);

  const filteredTests = tests.filter((test) => {
    const matchesModule = selectedModule === 'all' || test.module === selectedModule;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      test.title.toLowerCase().includes(query) ||
      test.description.toLowerCase().includes(query);

    return matchesModule && matchesSearch;
  });

  async function fetchTests() {
    try {
      setIsLoading(true);

      const [readingResponse, listeningResponse] = await Promise.all([
        apiClient.get('/reading'),
        apiClient.get('/listening'),
      ]);

      const readingTests = normalizeReadingList(readingResponse.data?.data || []);
      const listeningTests = normalizeListeningList(listeningResponse.data?.data || []);

      setTests(
        [...readingTests, ...listeningTests].sort(
          (left, right) =>
            new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
        )
      );
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast.error('Không thể tải danh sách đề thi');
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateModal() {
    const module = routeModule === 'all' ? (selectedModule === 'all' ? 'reading' : selectedModule) : routeModule;
    setEditingTest(null);
    setForm(createInitialForm(module));
    setIsModalOpen(true);
  }

  async function openEditModal(test: TestListItem) {
    try {
      setIsSubmitting(true);

      if (test.module === 'reading') {
        const response = await apiClient.get(`/reading/${test._id}`);
        setForm(normalizeReadingDetail(response.data?.data));
      } else {
        const response = await apiClient.get(`/listening/${test._id}`);
        setForm(normalizeListeningDetail(response.data));
      }

      setEditingTest(test);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error loading test detail:', error);
      toast.error('Không thể tải chi tiết đề thi');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(test: TestListItem) {
    const confirmed = window.confirm(`Bạn chắc chắn muốn xóa đề ${test.title}?`);
    if (!confirmed) {
      return;
    }

    try {
      await apiClient.delete(`/${test.module}/${test._id}`);
      setTests((currentTests) => currentTests.filter((item) => item._id !== test._id));
      toast.success('Đã xóa đề thi');
    } catch (error) {
      console.error('Error deleting test:', error);
      toast.error('Không thể xóa đề thi');
    }
  }

  function updateReadingPassage(index: number, field: keyof ReadingPassageForm, value: string | number) {
    setForm((currentForm) => ({
      ...currentForm,
      readingPassages: currentForm.readingPassages.map((passage, passageIndex) =>
        passageIndex === index ? { ...passage, [field]: value } : passage
      ),
    }));
  }

  function updateReadingQuestion(
    passageIndex: number,
    questionIndex: number,
    field: keyof ReadingQuestionForm,
    value: string | number | string[]
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      readingPassages: currentForm.readingPassages.map((passage, currentPassageIndex) => {
        if (currentPassageIndex !== passageIndex) {
          return passage;
        }

        return {
          ...passage,
          questions: passage.questions.map((question, currentQuestionIndex) =>
            currentQuestionIndex === questionIndex ? { ...question, [field]: value } : question
          ),
        };
      }),
    }));
  }

  function updateListeningPart(index: number, field: keyof ListeningPartForm, value: string | number) {
    setForm((currentForm) => ({
      ...currentForm,
      listeningParts: currentForm.listeningParts.map((part, partIndex) =>
        partIndex === index ? { ...part, [field]: value } : part
      ),
    }));
  }

  function updateListeningQuestion(
    partIndex: number,
    questionIndex: number,
    field: keyof ListeningQuestionForm,
    value: string | string[]
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      listeningParts: currentForm.listeningParts.map((part, currentPartIndex) => {
        if (currentPartIndex !== partIndex) {
          return part;
        }

        return {
          ...part,
          questions: part.questions.map((question, currentQuestionIndex) =>
            currentQuestionIndex === questionIndex ? { ...question, [field]: value } : question
          ),
        };
      }),
    }));
  }

  function addReadingPassage() {
    setForm((currentForm) => ({
      ...currentForm,
      readingPassages: [
        ...currentForm.readingPassages,
        createEmptyReadingPassage(currentForm.readingPassages.length + 1),
      ],
    }));
  }

  function removeReadingPassage(index: number) {
    setForm((currentForm) => ({
      ...currentForm,
      readingPassages: currentForm.readingPassages
        .filter((_, passageIndex) => passageIndex !== index)
        .map((passage, passageIndex) => ({
          ...passage,
          passageNumber: passageIndex + 1,
        })),
    }));
  }

  function addReadingQuestion(passageIndex: number) {
    setForm((currentForm) => ({
      ...currentForm,
      readingPassages: currentForm.readingPassages.map((passage, currentPassageIndex) => {
        if (currentPassageIndex !== passageIndex) {
          return passage;
        }

        return {
          ...passage,
          questions: [...passage.questions, createEmptyReadingQuestion(passage.questions.length + 1)],
        };
      }),
    }));
  }

  function removeReadingQuestion(passageIndex: number, questionIndex: number) {
    setForm((currentForm) => ({
      ...currentForm,
      readingPassages: currentForm.readingPassages.map((passage, currentPassageIndex) => {
        if (currentPassageIndex !== passageIndex) {
          return passage;
        }

        return {
          ...passage,
          questions: passage.questions
            .filter((_, currentQuestionIndex) => currentQuestionIndex !== questionIndex)
            .map((question, currentQuestionIndex) => ({
              ...question,
              questionNumber: currentQuestionIndex + 1,
            })),
        };
      }),
    }));
  }

  function addListeningPart() {
    setForm((currentForm) => ({
      ...currentForm,
      listeningParts: [
        ...currentForm.listeningParts,
        createEmptyListeningPart(currentForm.listeningParts.length + 1),
      ],
    }));
  }

  function removeListeningPart(index: number) {
    setForm((currentForm) => ({
      ...currentForm,
      listeningParts: currentForm.listeningParts
        .filter((_, partIndex) => partIndex !== index)
        .map((part, partIndex) => ({
          ...part,
          partNumber: partIndex + 1,
        })),
    }));
  }

  function addListeningQuestion(partIndex: number) {
    setForm((currentForm) => ({
      ...currentForm,
      listeningParts: currentForm.listeningParts.map((part, currentPartIndex) => {
        if (currentPartIndex !== partIndex) {
          return part;
        }

        return {
          ...part,
          questions: [...part.questions, createEmptyListeningQuestion()],
        };
      }),
    }));
  }

  function removeListeningQuestion(partIndex: number, questionIndex: number) {
    setForm((currentForm) => ({
      ...currentForm,
      listeningParts: currentForm.listeningParts.map((part, currentPartIndex) => {
        if (currentPartIndex !== partIndex) {
          return part;
        }

        return {
          ...part,
          questions: part.questions.filter((_, currentQuestionIndex) => currentQuestionIndex !== questionIndex),
        };
      }),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);

      const payload =
        form.module === 'reading'
          ? {
              title: form.title.trim(),
              description: form.description.trim(),
              passages: form.readingPassages.map((passage, passageIndex) => ({
                passageNumber: passageIndex + 1,
                title: passage.title.trim(),
                content: passage.content.trim(),
                image: passage.image.trim(),
                questions: passage.questions.map((question, questionIndex) => ({
                  questionNumber: questionIndex + 1,
                  type: question.type,
                  text: question.text.trim(),
                  options: question.options.map((option) => option.trim()).filter(Boolean),
                  correctAnswer: question.correctAnswer.trim(),
                  explanation: question.explanation.trim(),
                })),
              })),
            }
          : {
              title: form.title.trim(),
              description: form.description.trim(),
              parts: form.listeningParts.map((part, partIndex) => ({
                partNumber: partIndex + 1,
                title: part.title.trim(),
                audioUrl: part.audioUrl.trim(),
                description: part.description.trim(),
                questions: part.questions.map((question) => ({
                  questionText: question.questionText.trim(),
                  type: question.type,
                  options: question.options.map((option) => option.trim()).filter(Boolean),
                  imageUrl: question.imageUrl.trim(),
                  correctAnswer: question.correctAnswer.trim(),
                })),
              })),
            };

      const basePath = `/${form.module}`;
      if (editingTest) {
        await apiClient.put(`${basePath}/${editingTest._id}`, payload);
        toast.success('Đã cập nhật đề thi');
      } else {
        await apiClient.post(basePath, payload);
        toast.success('Đã tạo đề thi mới');
      }

      setIsModalOpen(false);
      setEditingTest(null);
      setForm(createInitialForm(routeModule === 'all' ? 'reading' : routeModule));
      await fetchTests();
    } catch (error) {
      console.error('Error saving test:', error);
      toast.error('Không thể lưu đề thi');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Quản lý đề thi IELTS</h2>
        
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <select
            value={selectedModule}
            onChange={(event) => setSelectedModule(event.target.value as FilterType)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-slate-700 outline-none transition focus:border-red-500"
          >
            <option value="all">Tất cả kỹ năng</option>
            <option value="reading">Reading</option>
            <option value="listening">Listening</option>
          </select>

          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-300 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm theo tiêu đề hoặc mô tả"
              className="w-full border-0 bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsAIModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white transition hover:bg-violet-700"
          >
            <Sparkles className="h-4 w-4" />
            Tạo đề bằng AI
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
          >
            <Plus className="h-4 w-4" />
            Tạo đề thi mới
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Đề thi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Kỹ năng</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Phần</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Câu hỏi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ngày tạo</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải danh sách đề thi...
                    </div>
                  </td>
                </tr>
              ) : filteredTests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-slate-500">
                    Không có đề thi phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredTests.map((test) => (
                  <tr key={`${test.module}-${test._id}`} className="hover:bg-slate-50">
                    <td className="px-4 py-4 align-top">
                      <div className="font-semibold text-slate-900">{test.title}</div>
                      <div className="mt-1 max-w-xl text-sm text-slate-500">{test.description || 'Không có mô tả'}</div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        test.module === 'reading'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {test.module === 'reading' ? 'Reading' : 'Listening'}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-slate-700">{test.sectionCount}</td>
                    <td className="px-4 py-4 align-top text-sm text-slate-700">{test.questionCount}</td>
                    <td className="px-4 py-4 align-top text-sm text-slate-700">{formatDate(test.createdAt)}</td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(test)}
                          disabled={isSubmitting}
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Sửa ${test.title}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(test)}
                          className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                          aria-label={`Xóa ${test.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TestModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onTestCreated={() => {
          setIsAIModalOpen(false);
          fetchTests();
        }}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="relative flex h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  {editingTest ? 'Chỉnh sửa đề thi' : 'Tạo đề thi mới'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Quản lý đầy đủ title, description, passage hoặc part, cùng toàn bộ question bên trong.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingTest(null);
                }}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label="Đóng modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
                <section className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2 lg:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">Loại đề</label>
                    <div className="flex gap-3">
                      {(['reading', 'listening'] as ModuleType[]).map((module) => (
                        <button
                          key={module}
                          type="button"
                          disabled={Boolean(editingTest)}
                          onClick={() => setForm(createInitialForm(module))}
                          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                            form.module === module
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          } ${editingTest ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          {module === 'reading' ? 'Reading' : 'Listening'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Tiêu đề đề thi</label>
                    <input
                      required
                      value={form.title}
                      onChange={(event) => setForm((currentForm) => ({ ...currentForm, title: event.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                      placeholder="Ví dụ: Cambridge IELTS 18 - Test 1"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Mô tả</label>
                    <input
                      value={form.description}
                      onChange={(event) => setForm((currentForm) => ({ ...currentForm, description: event.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                      placeholder="Mô tả ngắn cho giáo viên hoặc học viên"
                    />
                  </div>
                </section>

                {form.module === 'reading' ? (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900">Passages</h4>
                        <p className="text-sm text-slate-500">Mỗi passage chứa nội dung bài đọc và danh sách câu hỏi đi kèm.</p>
                      </div>
                      <button
                        type="button"
                        onClick={addReadingPassage}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Thêm passage
                      </button>
                    </div>

                    {form.readingPassages.map((passage, passageIndex) => (
                      <div key={`passage-${passageIndex}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <h5 className="text-lg font-semibold text-slate-900">Passage {passageIndex + 1}</h5>
                          {form.readingPassages.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeReadingPassage(passageIndex)}
                              className="text-sm font-semibold text-red-600"
                            >
                              Xóa passage
                            </button>
                          )}
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Tiêu đề passage</label>
                            <input
                              required
                              value={passage.title}
                              onChange={(event) => updateReadingPassage(passageIndex, 'title', event.target.value)}
                              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Ảnh minh họa</label>
                            <input
                              value={passage.image}
                              onChange={(event) => updateReadingPassage(passageIndex, 'image', event.target.value)}
                              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                              placeholder="https://..."
                            />
                          </div>

                          <div className="space-y-2 lg:col-span-2">
                            <label className="text-sm font-semibold text-slate-700">Nội dung passage</label>
                            <textarea
                              required
                              rows={8}
                              value={passage.content}
                              onChange={(event) => updateReadingPassage(passageIndex, 'content', event.target.value)}
                              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                            />
                          </div>
                        </div>

                        <div className="mt-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <h6 className="font-semibold text-slate-900">Questions</h6>
                            <button
                              type="button"
                              onClick={() => addReadingQuestion(passageIndex)}
                              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                            >
                              Thêm câu hỏi
                            </button>
                          </div>

                          {passage.questions.map((question, questionIndex) => (
                            <div key={`reading-question-${passageIndex}-${questionIndex}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="mb-4 flex items-center justify-between">
                                <span className="font-semibold text-slate-900">Question {questionIndex + 1}</span>
                                {passage.questions.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeReadingQuestion(passageIndex, questionIndex)}
                                    className="text-sm font-semibold text-red-600"
                                  >
                                    Xóa câu hỏi
                                  </button>
                                )}
                              </div>

                              <div className="grid gap-4 lg:grid-cols-2">
                                <div className="space-y-2">
                                  <label className="text-sm font-semibold text-slate-700">Loại câu hỏi</label>
                                  <select
                                    value={question.type}
                                    onChange={(event) =>
                                      updateReadingQuestion(
                                        passageIndex,
                                        questionIndex,
                                        'type',
                                        event.target.value as ReadingQuestionType
                                      )
                                    }
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                                  >
                                    {READING_QUESTION_TYPES.map((type) => (
                                      <option key={type} value={type}>
                                        {type}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-semibold text-slate-700">Đáp án đúng</label>
                                  <input
                                    required
                                    value={question.correctAnswer}
                                    onChange={(event) =>
                                      updateReadingQuestion(passageIndex, questionIndex, 'correctAnswer', event.target.value)
                                    }
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                                  />
                                </div>

                                <div className="space-y-2 lg:col-span-2">
                                  <label className="text-sm font-semibold text-slate-700">Nội dung câu hỏi</label>
                                  <textarea
                                    required
                                    rows={3}
                                    value={question.text}
                                    onChange={(event) =>
                                      updateReadingQuestion(passageIndex, questionIndex, 'text', event.target.value)
                                    }
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-semibold text-slate-700">Options</label>
                                  <textarea
                                    rows={4}
                                    value={question.options.join('\n')}
                                    onChange={(event) =>
                                      updateReadingQuestion(
                                        passageIndex,
                                        questionIndex,
                                        'options',
                                        event.target.value.split('\n')
                                      )
                                    }
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                                    placeholder="Mỗi dòng là một lựa chọn"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-semibold text-slate-700">Giải thích</label>
                                  <textarea
                                    rows={4}
                                    value={question.explanation}
                                    onChange={(event) =>
                                      updateReadingQuestion(passageIndex, questionIndex, 'explanation', event.target.value)
                                    }
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </section>
                ) : (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900">Listening Parts</h4>
                        <p className="text-sm text-slate-500">Mỗi part chứa audio, mô tả và nhóm câu hỏi tương ứng.</p>
                      </div>
                      <button
                        type="button"
                        onClick={addListeningPart}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Thêm part
                      </button>
                    </div>

                    {form.listeningParts.map((part, partIndex) => (
                      <div key={`part-${partIndex}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <h5 className="text-lg font-semibold text-slate-900">Part {partIndex + 1}</h5>
                          {form.listeningParts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeListeningPart(partIndex)}
                              className="text-sm font-semibold text-red-600"
                            >
                              Xóa part
                            </button>
                          )}
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Tiêu đề part</label>
                            <input
                              required
                              value={part.title}
                              onChange={(event) => updateListeningPart(partIndex, 'title', event.target.value)}
                              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Audio URL</label>
                            <input
                              required
                              value={part.audioUrl}
                              onChange={(event) => updateListeningPart(partIndex, 'audioUrl', event.target.value)}
                              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                              placeholder="/audio/example.mp3 hoặc https://..."
                            />
                          </div>

                          <div className="space-y-2 lg:col-span-2">
                            <label className="text-sm font-semibold text-slate-700">Mô tả part</label>
                            <textarea
                              required
                              rows={5}
                              value={part.description}
                              onChange={(event) => updateListeningPart(partIndex, 'description', event.target.value)}
                              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                            />
                          </div>
                        </div>

                        <div className="mt-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <h6 className="font-semibold text-slate-900">Questions</h6>
                            <button
                              type="button"
                              onClick={() => addListeningQuestion(partIndex)}
                              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                            >
                              Thêm câu hỏi
                            </button>
                          </div>

                          {part.questions.map((question, questionIndex) => (
                            <div key={`listening-question-${partIndex}-${questionIndex}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="mb-4 flex items-center justify-between">
                                <span className="font-semibold text-slate-900">Question {questionIndex + 1}</span>
                                {part.questions.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeListeningQuestion(partIndex, questionIndex)}
                                    className="text-sm font-semibold text-red-600"
                                  >
                                    Xóa câu hỏi
                                  </button>
                                )}
                              </div>

                              <div className="grid gap-4 lg:grid-cols-2">
                                <div className="space-y-2">
                                  <label className="text-sm font-semibold text-slate-700">Loại câu hỏi</label>
                                  <select
                                    value={question.type}
                                    onChange={(event) =>
                                      updateListeningQuestion(
                                        partIndex,
                                        questionIndex,
                                        'type',
                                        event.target.value as ListeningQuestionType
                                      )
                                    }
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                                  >
                                    {LISTENING_QUESTION_TYPES.map((type) => (
                                      <option key={type} value={type}>
                                        {type}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-semibold text-slate-700">Đáp án đúng</label>
                                  <input
                                    required
                                    value={question.correctAnswer}
                                    onChange={(event) =>
                                      updateListeningQuestion(partIndex, questionIndex, 'correctAnswer', event.target.value)
                                    }
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                                  />
                                </div>

                                <div className="space-y-2 lg:col-span-2">
                                  <label className="text-sm font-semibold text-slate-700">Nội dung câu hỏi</label>
                                  <textarea
                                    required
                                    rows={3}
                                    value={question.questionText}
                                    onChange={(event) =>
                                      updateListeningQuestion(partIndex, questionIndex, 'questionText', event.target.value)
                                    }
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-semibold text-slate-700">Options</label>
                                  <textarea
                                    rows={4}
                                    value={question.options.join('\n')}
                                    onChange={(event) =>
                                      updateListeningQuestion(
                                        partIndex,
                                        questionIndex,
                                        'options',
                                        event.target.value.split('\n')
                                      )
                                    }
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                                    placeholder="Mỗi dòng là một lựa chọn"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-semibold text-slate-700">Image URL</label>
                                  <input
                                    value={question.imageUrl}
                                    onChange={(event) =>
                                      updateListeningQuestion(partIndex, questionIndex, 'imageUrl', event.target.value)
                                    }
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
                                    placeholder="https://..."
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </section>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingTest(null);
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingTest ? 'Lưu thay đổi' : 'Tạo đề thi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
