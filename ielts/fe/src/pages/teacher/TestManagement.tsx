import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FileSpreadsheet, FileText, Image as ImageIcon, Loader2, Music2, Pencil, Plus, Search, Sparkles, Trash2, Upload, X } from 'lucide-react';
import MiniRichEditor from '../../components/MiniRichEditor';
import { TestModal } from './TestModal';
import { AdvancedPdfExtractor, type PdfParsedTest } from './AdvancedPdfExtractor';
import { ExcelImportWizard } from './ExcelImportWizard';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import { apiClient } from '../../lib/api/client';
import axios from 'axios';

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
  const [isAIPdfModalOpen, setIsAIPdfModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [audioUploadingIdx, setAudioUploadingIdx] = useState<number | null>(null);
  const audioInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [imageUploadingIdx, setImageUploadingIdx] = useState<number | null>(null);
  const imageInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [editingContent, setEditingContent] = useState(false);
  const [editingTest, setEditingTest] = useState<TestListItem | null>(null);
  const [form, setForm] = useState<TestFormState>(createInitialForm(routeModule === 'all' ? 'reading' : routeModule));
  const [isExcelWizardOpen, setIsExcelWizardOpen] = useState(false);

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
    setActiveSectionIdx(0);
    setEditingContent(false);
    setIsModalOpen(true);
  }

  function mapPdfTypeToReading(type: string, options: string[]): ReadingQuestionType {
    if (type === 'multiple_choice') return 'MULTIPLE_CHOICE';
    if (type === 'fill_blank') return 'FILL_IN_BLANK';
    if (type === 'matching') {
      const upper = options.map((o) => o.toUpperCase());
      if (upper.some((o) => o.includes('NOT GIVEN'))) {
        if (upper.some((o) => o === 'YES' || o === 'NO')) return 'YNNG';
        return 'TFNG';
      }
      return 'MATCHING';
    }
    return 'MULTIPLE_CHOICE';
  }

  function applyParsedTest(testType: 'reading' | 'listening', parsed: PdfParsedTest) {
    setEditingTest(null);
    if (testType === 'reading') {
      const readingPassages: ReadingPassageForm[] = (parsed.parts ?? []).map((part, i) => ({
        passageNumber: part.partNumber ?? i + 1,
        title: part.title ?? '',
        content: part.description ?? '',
        image: '',
        questions: (part.questions ?? []).map((q, qi) => ({
          questionNumber: q.questionNumber ?? qi + 1,
          type: mapPdfTypeToReading(q.type, q.options ?? []),
          text: q.questionText ?? '',
          options: q.options ?? [],
          correctAnswer: q.correctAnswer ?? '',
          explanation: '',
        })),
      }));
      setForm({ module: 'reading', title: parsed.title ?? '', description: parsed.description ?? '',
        readingPassages: readingPassages.length > 0 ? readingPassages : [createEmptyReadingPassage(1)],
        listeningParts: [createEmptyListeningPart(1)] });
    } else {
      const listeningParts: ListeningPartForm[] = (parsed.parts ?? []).map((part, i) => ({
        partNumber: part.partNumber ?? i + 1,
        title: part.title ?? '',
        audioUrl: part.audioUrl ?? '',
        description: part.description ?? '',
        questions: (part.questions ?? []).map((q) => ({
          questionText: q.questionText ?? '',
          type: (q.type as ListeningQuestionType) ?? 'fill_blank',
          options: q.options ?? [],
          imageUrl: q.imageUrl ?? '',
          correctAnswer: q.correctAnswer ?? '',
        })),
      }));
      setForm({ module: 'listening', title: parsed.title ?? '', description: parsed.description ?? '',
        readingPassages: [createEmptyReadingPassage(1)],
        listeningParts: listeningParts.length > 0 ? listeningParts : [createEmptyListeningPart(1)] });
    }
    setActiveSectionIdx(0);
    setEditingContent(false);
    setIsModalOpen(true);
  }

  async function uploadAudioForPart(partIndex: number, file: File) {
    setAudioUploadingIdx(partIndex);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const token = localStorage.getItem('accessToken');
      const sigRes = await axios.get(`${API_BASE}/media/generate-signature`, {
        params: { folderName: 'ielts_platform/listening' },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const sd = sigRes.data?.data ?? sigRes.data;
      const { signature, timestamp, cloud_name: cloudName, api_key: apiKey, folder } = sd;
      if (!signature || !timestamp || !cloudName || !apiKey || !folder)
        throw new Error('Không nhận được thông tin chữ ký Cloudinary hợp lệ');
      const cloudFormData = new FormData();
      cloudFormData.append('file', file);
      cloudFormData.append('api_key', apiKey);
      cloudFormData.append('timestamp', String(timestamp));
      cloudFormData.append('signature', signature);
      cloudFormData.append('folder', folder);
      const cloudRes = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, cloudFormData);
      const secureUrl = cloudRes.data?.secure_url;
      if (!secureUrl) throw new Error('Cloudinary không trả về secure_url');
      updateListeningPart(partIndex, 'audioUrl', secureUrl);
      toast.success(`Đã tải audio Part ${partIndex + 1} lên thành công`);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải audio lên. Vui lòng thử lại.');
    } finally {
      setAudioUploadingIdx(null);
    }
  }

  async function uploadImageForPassage(passageIndex: number, file: File) {
    setImageUploadingIdx(passageIndex);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const token = localStorage.getItem('accessToken');
      const sigRes = await axios.get(`${API_BASE}/media/generate-signature`, {
        params: { folderName: 'ielts_platform/reading' },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const sd = sigRes.data?.data ?? sigRes.data;
      const { signature, timestamp, cloud_name: cloudName, api_key: apiKey, folder } = sd;
      if (!signature || !timestamp || !cloudName || !apiKey || !folder)
        throw new Error('Không nhận được thông tin chữ ký Cloudinary hợp lệ');
      const cloudFormData = new FormData();
      cloudFormData.append('file', file);
      cloudFormData.append('api_key', apiKey);
      cloudFormData.append('timestamp', String(timestamp));
      cloudFormData.append('signature', signature);
      cloudFormData.append('folder', folder);
      const cloudRes = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, cloudFormData);
      const secureUrl = cloudRes.data?.secure_url;
      if (!secureUrl) throw new Error('Cloudinary không trả về secure_url');
      updateReadingPassage(passageIndex, 'image', secureUrl);
      toast.success(`Đã tải ảnh Passage ${passageIndex + 1} lên thành công`);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setImageUploadingIdx(null);
    }
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
      setActiveSectionIdx(0);
      setEditingContent(false);
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
    if (form.readingPassages.length >= 3) {
      toast.error('Reading chỉ tối đa 3 Passage');
      return;
    }
    setActiveSectionIdx(form.readingPassages.length);
    setEditingContent(false);
    setForm((currentForm) => ({
      ...currentForm,
      readingPassages: [
        ...currentForm.readingPassages,
        createEmptyReadingPassage(currentForm.readingPassages.length + 1),
      ],
    }));
  }

  function removeReadingPassage(index: number) {
    setActiveSectionIdx((prev) => Math.min(prev, Math.max(0, form.readingPassages.length - 2)));
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
    const totalQ = form.readingPassages.reduce((s, p) => s + p.questions.length, 0);
    if (totalQ >= 40) {
      toast.error('Reading chỉ tối đa 40 câu hỏi');
      return;
    }
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
    if (form.listeningParts.length >= 4) {
      toast.error('Listening chỉ tối đa 4 Part');
      return;
    }
    setActiveSectionIdx(form.listeningParts.length);
    setEditingContent(false);
    setForm((currentForm) => ({
      ...currentForm,
      listeningParts: [
        ...currentForm.listeningParts,
        createEmptyListeningPart(currentForm.listeningParts.length + 1),
      ],
    }));
  }

  function removeListeningPart(index: number) {
    setActiveSectionIdx((prev) => Math.min(prev, Math.max(0, form.listeningParts.length - 2)));
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
    if ((form.listeningParts[partIndex]?.questions.length ?? 0) >= 10) {
      toast.error('Mỗi Part chỉ tối đa 10 câu hỏi');
      return;
    }
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
            onClick={() => setIsAIPdfModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700"
          >
            <FileText className="h-4 w-4" />
            Tạo từ PDF (AI)
          </button>

          <button
            type="button"
            onClick={() => setIsExcelWizardOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Import Excel
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

      <AdvancedPdfExtractor
        isOpen={isAIPdfModalOpen}
        onClose={() => setIsAIPdfModalOpen(false)}
        onApply={applyParsedTest}
        defaultTestType={selectedModule === 'listening' ? 'listening' : 'reading'}
      />

      {isExcelWizardOpen && (
        <ExcelImportWizard
          scope={selectedModule === 'listening' ? 'listening' : 'reading'}
          onClose={() => setIsExcelWizardOpen(false)}
          onImported={fetchTests}
        />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">

            {/* ── TOP BAR ── */}
            <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-200 bg-white px-4 py-2.5">
              <div className="flex gap-1 rounded-xl border border-slate-200 p-0.5">
                {(['reading', 'listening'] as ModuleType[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={Boolean(editingTest)}
                    onClick={() => { setForm(createInitialForm(m)); setActiveSectionIdx(0); setEditingContent(false); }}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      form.module === m ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                    } ${editingTest ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    {m === 'reading' ? 'Reading' : 'Listening'}
                  </button>
                ))}
              </div>
              <input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold outline-none transition focus:border-slate-500"
                placeholder="Tiêu đề đề thi (Cambridge IELTS 18 – Test 1)"
              />
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-52 shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                placeholder="Mô tả ngắn"
              />
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); setEditingTest(null); }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingTest ? 'Lưu thay đổi' : 'Tạo đề thi'}
              </button>
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); setEditingTest(null); }}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ── SECTION TABS ── */}
            <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 py-2">
              {(form.module === 'reading' ? form.readingPassages : form.listeningParts).map((section, idx) => (
                <div key={idx} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => { setActiveSectionIdx(idx); setEditingContent(false); }}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      activeSectionIdx === idx
                        ? 'border border-slate-300 bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {form.module === 'reading' ? `Passage ${idx + 1}` : `Part ${idx + 1}`}
                    {section.title ? `: ${section.title.slice(0, 16)}${section.title.length > 16 ? '…' : ''}` : ''}
                  </button>
                  {(form.module === 'reading' ? form.readingPassages : form.listeningParts).length > 1 && (
                    <button
                      type="button"
                      onClick={() => form.module === 'reading' ? removeReadingPassage(idx) : removeListeningPart(idx)}
                      className="ml-0.5 rounded p-0.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {/* Limit: reading max 3 passages, listening max 4 parts */}
              {(() => {
                const canAdd = form.module === 'reading'
                  ? form.readingPassages.length < 3
                  : form.listeningParts.length < 4;
                const limit = form.module === 'reading' ? 3 : 4;
                const current = form.module === 'reading' ? form.readingPassages.length : form.listeningParts.length;
                return (
                  <button
                    type="button"
                    onClick={() => form.module === 'reading' ? addReadingPassage() : addListeningPart()}
                    disabled={!canAdd}
                    title={!canAdd ? `Tối đa ${limit} ${form.module === 'reading' ? 'Passage' : 'Part'}` : undefined}
                    className={`flex whitespace-nowrap items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      canAdd
                        ? 'text-indigo-600 hover:bg-indigo-50'
                        : 'cursor-not-allowed text-slate-400'
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {form.module === 'reading' ? `Thêm Passage (${current}/3)` : `Thêm Part (${current}/4)`}
                  </button>
                );
              })()}
            </div>

            {/* ── SPLIT VIEW ── */}
            <div className="flex min-h-0 flex-1 overflow-hidden">

              {/* LEFT PANEL – content */}
              <div className="flex w-[52%] shrink-0 flex-col border-r border-slate-200">
                <div className="flex shrink-0 flex-col gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                  {form.module === 'reading' && form.readingPassages[activeSectionIdx] && (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          required
                          value={form.readingPassages[activeSectionIdx].title}
                          onChange={(e) => updateReadingPassage(activeSectionIdx, 'title', e.target.value)}
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold outline-none focus:border-slate-500"
                          placeholder="Tiêu đề passage"
                        />
                        {/* Hidden image file input */}
                        <input
                          ref={(el) => { imageInputRefs.current[activeSectionIdx] = el; }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadImageForPassage(activeSectionIdx, f);
                          }}
                        />
                        <button
                          type="button"
                          disabled={imageUploadingIdx === activeSectionIdx}
                          onClick={() => imageInputRefs.current[activeSectionIdx]?.click()}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          {imageUploadingIdx === activeSectionIdx
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Upload className="h-3.5 w-3.5" />}
                          Tải ảnh
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingContent(!editingContent)}
                          className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white"
                        >
                          {editingContent ? 'Xem trước' : 'Sửa nội dung'}
                        </button>
                      </div>
                      {/* Image preview */}
                      {form.readingPassages[activeSectionIdx].image && (
                        <div className="relative flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
                          <ImageIcon className="h-4 w-4 shrink-0 text-blue-400" />
                          <img
                            src={form.readingPassages[activeSectionIdx].image}
                            alt="passage preview"
                            className="h-14 w-auto rounded object-cover"
                          />
                          <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
                            {form.readingPassages[activeSectionIdx].image}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateReadingPassage(activeSectionIdx, 'image', '')}
                            className="shrink-0 rounded p-0.5 text-slate-400 hover:text-red-500"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  {form.module === 'listening' && form.listeningParts[activeSectionIdx] && (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          required
                          value={form.listeningParts[activeSectionIdx].title}
                          onChange={(e) => updateListeningPart(activeSectionIdx, 'title', e.target.value)}
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold outline-none focus:border-slate-500"
                          placeholder="Tiêu đề part"
                        />
                        <button
                          type="button"
                          onClick={() => setEditingContent(!editingContent)}
                          className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white"
                        >
                          {editingContent ? 'Xem trước' : 'Sửa nội dung'}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Music2 className="h-4 w-4 shrink-0 text-amber-500" />
                        <input
                          value={form.listeningParts[activeSectionIdx].audioUrl}
                          onChange={(e) => updateListeningPart(activeSectionIdx, 'audioUrl', e.target.value)}
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-slate-500"
                          placeholder="Audio URL hoặc tải file lên..."
                        />
                        <input
                          ref={(el) => { audioInputRefs.current[activeSectionIdx] = el; }}
                          type="file"
                          accept="audio/*,video/mp4,video/webm"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadAudioForPart(activeSectionIdx, f);
                          }}
                        />
                        <button
                          type="button"
                          disabled={audioUploadingIdx === activeSectionIdx}
                          onClick={() => audioInputRefs.current[activeSectionIdx]?.click()}
                          className="shrink-0 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                        >
                          {audioUploadingIdx === activeSectionIdx ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Tải lên'}
                        </button>
                      </div>
                      {form.listeningParts[activeSectionIdx].audioUrl && (
                        <audio
                          key={form.listeningParts[activeSectionIdx].audioUrl}
                          controls
                          className="h-8 w-full"
                          src={form.listeningParts[activeSectionIdx].audioUrl}
                        />
                      )}
                    </>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {form.module === 'reading' && form.readingPassages[activeSectionIdx] ? (
                    editingContent ? (
                      <MiniRichEditor
                        value={form.readingPassages[activeSectionIdx].content}
                        onChange={(html) => updateReadingPassage(activeSectionIdx, 'content', html)}
                        placeholder="Nội dung passage..."
                        minHeight={500}
                      />
                    ) : form.readingPassages[activeSectionIdx].content ? (
                      <div
                        className="prose prose-sm max-w-none text-slate-800"
                        dangerouslySetInnerHTML={{ __html: form.readingPassages[activeSectionIdx].content }}
                      />
                    ) : (
                      <p className="text-sm text-slate-400">Nhấn "Sửa nội dung" để nhập nội dung passage.</p>
                    )
                  ) : form.module === 'listening' && form.listeningParts[activeSectionIdx] ? (
                    editingContent ? (
                      <MiniRichEditor
                        value={form.listeningParts[activeSectionIdx].description}
                        onChange={(html) => updateListeningPart(activeSectionIdx, 'description', html)}
                        placeholder="Mô tả / transcript cho part này..."
                        minHeight={400}
                      />
                    ) : form.listeningParts[activeSectionIdx].description ? (
                      <div
                        className="prose prose-sm max-w-none text-slate-800"
                        dangerouslySetInnerHTML={{ __html: form.listeningParts[activeSectionIdx].description }}
                      />
                    ) : (
                      <p className="text-sm text-slate-400">Nhấn "Sửa nội dung" để nhập mô tả / transcript.</p>
                    )
                  ) : null}
                </div>
              </div>

              {/* RIGHT PANEL – questions */}
              <div className="flex flex-1 flex-col">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                  <span className="text-sm font-semibold text-slate-700">
                    {form.module === 'reading' ? (
                      <>
                        Câu hỏi{' '}
                        <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-xs">
                          {(form.readingPassages[activeSectionIdx]?.questions.length ?? 0)}
                        </span>
                        {' '}• Tổng:
                        <span className={`ml-1 rounded-md px-1.5 py-0.5 text-xs font-bold ${
                          form.readingPassages.reduce((s, p) => s + p.questions.length, 0) >= 40
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {form.readingPassages.reduce((s, p) => s + p.questions.length, 0)}/40
                        </span>
                      </>
                    ) : (
                      <>
                        Câu hỏi{' '}
                        <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${
                          (form.listeningParts[activeSectionIdx]?.questions.length ?? 0) >= 10
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {(form.listeningParts[activeSectionIdx]?.questions.length ?? 0)}/10
                        </span>
                      </>
                    )}
                  </span>
                  {(() => {
                    const canAdd = form.module === 'reading'
                      ? form.readingPassages.reduce((s, p) => s + p.questions.length, 0) < 40
                      : (form.listeningParts[activeSectionIdx]?.questions.length ?? 0) < 10;
                    return (
                      <button
                        type="button"
                        disabled={!canAdd}
                        onClick={() =>
                          form.module === 'reading'
                            ? addReadingQuestion(activeSectionIdx)
                            : addListeningQuestion(activeSectionIdx)
                        }
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                          canAdd
                            ? 'border-slate-300 text-slate-700 hover:bg-white'
                            : 'cursor-not-allowed border-slate-200 text-slate-400'
                        }`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Thêm câu hỏi
                      </button>
                    );
                  })()}
                </div>

                <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
                  {form.module === 'reading'
                    ? (form.readingPassages[activeSectionIdx]?.questions ?? []).map((question, qIdx) => (
                        <div key={`rq-${activeSectionIdx}-${qIdx}`} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-100 text-xs font-bold text-blue-700">
                              {qIdx + 1}
                            </span>
                            <select
                              value={question.type}
                              onChange={(e) => updateReadingQuestion(activeSectionIdx, qIdx, 'type', e.target.value as ReadingQuestionType)}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 outline-none"
                            >
                              {READING_QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <div className="flex flex-1 items-center gap-1.5">
                              <span className="shrink-0 text-xs text-slate-400">Đáp án:</span>
                              <input
                                required
                                value={question.correctAnswer}
                                onChange={(e) => updateReadingQuestion(activeSectionIdx, qIdx, 'correctAnswer', e.target.value)}
                                className="flex-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 outline-none focus:border-emerald-400"
                                placeholder="đáp án"
                              />
                            </div>
                            {(form.readingPassages[activeSectionIdx]?.questions.length ?? 0) > 1 && (
                              <button
                                type="button"
                                onClick={() => removeReadingQuestion(activeSectionIdx, qIdx)}
                                className="shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <MiniRichEditor
                            value={question.text}
                            onChange={(html) => updateReadingQuestion(activeSectionIdx, qIdx, 'text', html)}
                            placeholder="Nội dung câu hỏi"
                            minHeight={60}
                          />
                          {(question.type === 'MULTIPLE_CHOICE' || question.type === 'MATCHING') && (
                            <textarea
                              rows={3}
                              value={question.options.join('\n')}
                              onChange={(e) => updateReadingQuestion(activeSectionIdx, qIdx, 'options', e.target.value.split('\n'))}
                              className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                              placeholder="Options – mỗi dòng một lựa chọn"
                            />
                          )}
                          <textarea
                            rows={1}
                            value={question.explanation}
                            onChange={(e) => updateReadingQuestion(activeSectionIdx, qIdx, 'explanation', e.target.value)}
                            className="mt-1.5 w-full resize-none rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-400 outline-none focus:border-slate-200"
                            placeholder="Giải thích (tùy chọn)"
                          />
                        </div>
                      ))
                    : (form.listeningParts[activeSectionIdx]?.questions ?? []).map((question, qIdx) => (
                        <div key={`lq-${activeSectionIdx}-${qIdx}`} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-100 text-xs font-bold text-amber-700">
                              {qIdx + 1}
                            </span>
                            <select
                              value={question.type}
                              onChange={(e) => updateListeningQuestion(activeSectionIdx, qIdx, 'type', e.target.value as ListeningQuestionType)}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 outline-none"
                            >
                              {LISTENING_QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <div className="flex flex-1 items-center gap-1.5">
                              <span className="shrink-0 text-xs text-slate-400">Đáp án:</span>
                              <input
                                required
                                value={question.correctAnswer}
                                onChange={(e) => updateListeningQuestion(activeSectionIdx, qIdx, 'correctAnswer', e.target.value)}
                                className="flex-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 outline-none focus:border-emerald-400"
                                placeholder="đáp án"
                              />
                            </div>
                            {(form.listeningParts[activeSectionIdx]?.questions.length ?? 0) > 1 && (
                              <button
                                type="button"
                                onClick={() => removeListeningQuestion(activeSectionIdx, qIdx)}
                                className="shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <MiniRichEditor
                            value={question.questionText}
                            onChange={(html) => updateListeningQuestion(activeSectionIdx, qIdx, 'questionText', html)}
                            placeholder="Nội dung câu hỏi"
                            minHeight={60}
                          />
                          {(question.type === 'multiple_choice' || question.type === 'matching') && (
                            <textarea
                              rows={3}
                              value={question.options.join('\n')}
                              onChange={(e) => updateListeningQuestion(activeSectionIdx, qIdx, 'options', e.target.value.split('\n'))}
                              className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                              placeholder="Options – mỗi dòng một lựa chọn"
                            />
                          )}
                        </div>
                      ))
                  }
                </div>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

