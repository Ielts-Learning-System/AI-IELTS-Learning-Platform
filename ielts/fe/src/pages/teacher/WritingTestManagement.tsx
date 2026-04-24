import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  BookOpen,
  CalendarDays,
  FilePenLine,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Send,
  Star,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { useUserStore } from '../../store/useUserStore';

type WritingType = 'Task 1' | 'Task 2';

type WritingTestItem = {
  _id: string;
  title: string;
  type: WritingType;
  category: string;
  contentHtml?: string;
  isSample?: boolean;
  sampleInfos?: Array<{
    _id: string;
    bandScore: number;
    author: string;
    contentHtml: string;
  }>;
  createdAt?: string;
};

type UserOption = {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
};

type FormMode = 'create' | 'edit';

type FormState = {
  title: string;
  type: WritingType;
  category: string;
  contentHtml: string;
};

type SampleFormState = {
  selectedWritingId: string;
  bandScore: string;
  author: string;
  sampleContentHtml: string;
};

const API_BASE = 'http://localhost:3000';

const defaultFormState: FormState = {
  title: '',
  type: 'Task 1',
  category: '',
  contentHtml: '',
};

const defaultSampleFormState: SampleFormState = {
  selectedWritingId: '',
  bandScore: '7.0',
  author: '',
  sampleContentHtml: '',
};

const getToken = (fallbackToken: string | null) =>
  fallbackToken || localStorage.getItem('token') || localStorage.getItem('accessToken') || '';

const extractFirstImageFromHtml = (html: string) => {
  const match = String(html || '').match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  return match ? match[1] : '';
};

const removeImageTags = (html: string) => String(html || '').replace(/<img[^>]*>/gi, '').trim();

export default function WritingTestManagement() {
  const { token } = useUserStore();

  const [tests, setTests] = useState<WritingTestItem[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [taskImageFile, setTaskImageFile] = useState<File | null>(null);
  const [existingTaskImageUrl, setExistingTaskImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // --- Sample modal state ---
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [sampleForm, setSampleForm] = useState<SampleFormState>(defaultSampleFormState);
  const [isSavingSample, setIsSavingSample] = useState(false);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningTest, setAssigningTest] = useState<WritingTestItem | null>(null);
  const [students, setStudents] = useState<UserOption[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const filteredTests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tests;

    return tests.filter((test) => {
      const title = String(test.title || '').toLowerCase();
      const category = String(test.category || '').toLowerCase();
      const type = String(test.type || '').toLowerCase();
      return title.includes(q) || category.includes(q) || type.includes(q);
    });
  }, [tests, searchQuery]);

  // Practice items only (not already a sample) — used in sample creation dropdown
  const practiceTests = useMemo(() => (tests as any[]).filter((t) => !t.isSample), [tests]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;

    return students.filter((student) => {
      const name = String(student.name || '').toLowerCase();
      const email = String(student.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [students, studentSearch]);

  const fetchTests = async () => {
    try {
      setIsLoadingTests(true);
      const authToken = getToken(token);

      const response = await axios.get(`${API_BASE}/api/writing`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      });

      const payload = response.data?.data ?? response.data;
      setTests(Array.isArray(payload) ? payload : []);
    } catch (error: any) {
      console.error('Failed to fetch writing tests:', error);
      toast.error(error.response?.data?.message || 'Không thể tải danh sách Writing prompts.');
    } finally {
      setIsLoadingTests(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchStudents = async () => {
    try {
      setIsLoadingStudents(true);
      const authToken = getToken(token);

      const response = await axios.get(`${API_BASE}/api/users`, {
        params: { role: 'Student' },
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const payload = response.data?.data ?? [];
      setStudents(Array.isArray(payload) ? payload : []);
    } catch (error: any) {
      console.error('Failed to fetch students:', error);
      toast.error(error.response?.data?.message || 'Không thể tải danh sách học viên.');
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const resetFormState = () => {
    setFormState(defaultFormState);
    setTaskImageFile(null);
    setExistingTaskImageUrl('');
    setEditingTestId(null);
    setFormMode('create');
  };

  const openCreateModal = () => {
    resetFormState();
    setIsFormModalOpen(true);
  };

  const openEditModal = async (test: WritingTestItem) => {
    const authToken = getToken(token);

    try {
      setIsLoadingTests(true);
      const response = await axios.get(`${API_BASE}/api/writing/${test._id}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      });

      const detail = response.data?.data ?? response.data;
      const detailContent = String(detail?.contentHtml || '');
      const imageUrl = extractFirstImageFromHtml(detailContent);

      setFormState({
        title: String(detail?.title || ''),
        type: (detail?.type as WritingType) || 'Task 1',
        category: String(detail?.category || ''),
        contentHtml: removeImageTags(detailContent),
      });
      setExistingTaskImageUrl(imageUrl);
      setTaskImageFile(null);
      setEditingTestId(test._id);
      setFormMode('edit');
      setIsFormModalOpen(true);
    } catch (error: any) {
      console.error('Failed to fetch writing details:', error);
      toast.error(error.response?.data?.message || 'Không thể tải dữ liệu prompt để chỉnh sửa.');
    } finally {
      setIsLoadingTests(false);
    }
  };

  const uploadTaskImageToCloudinary = async (file: File) => {
    const authToken = getToken(token);

    const signatureResponse = await axios.get(`${API_BASE}/api/media/generate-signature`, {
      params: { folderName: 'ielts_platform/writing_task1' },
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const signatureData = signatureResponse.data?.data ?? signatureResponse.data;
    const signature = signatureData?.signature;
    const timestamp = signatureData?.timestamp;
    const cloudName = signatureData?.cloud_name;
    const apiKey = signatureData?.api_key;
    const folder = signatureData?.folder;

    if (!signature || !timestamp || !cloudName || !apiKey || !folder) {
      throw new Error('Thiếu thông tin chữ ký Cloudinary.');
    }

    const cloudFormData = new FormData();
    cloudFormData.append('file', file);
    cloudFormData.append('api_key', apiKey);
    cloudFormData.append('timestamp', String(timestamp));
    cloudFormData.append('signature', signature);
    cloudFormData.append('folder', folder);

    const cloudinaryUploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const cloudResponse = await axios.post(cloudinaryUploadUrl, cloudFormData);

    const secureUrl = cloudResponse.data?.secure_url;
    if (!secureUrl) {
      throw new Error('Cloudinary không trả về secure_url.');
    }

    return secureUrl;
  };

  const composeFinalContentHtml = (baseContentHtml: string, imageUrl: string) => {
    const cleanBody = String(baseContentHtml || '').trim();
    if (!imageUrl) return cleanBody;

    return `<p><img src="${imageUrl}" alt="Task 1 prompt image" /></p>${cleanBody}`;
  };

  const handleSavePrompt = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formState.title.trim() || !formState.contentHtml.trim()) {
      toast.error('Vui lòng nhập tiêu đề và nội dung đề bài.');
      return;
    }

    try {
      setIsSaving(true);
      const authToken = getToken(token);

      let taskImageUrl = existingTaskImageUrl;
      if (formState.type === 'Task 1' && taskImageFile) {
        taskImageUrl = await uploadTaskImageToCloudinary(taskImageFile);
      }

      const payload = {
        title: formState.title.trim(),
        type: formState.type,
        category: formState.category.trim() || 'Mixed',
        contentHtml:
          formState.type === 'Task 1'
            ? composeFinalContentHtml(formState.contentHtml, taskImageUrl)
            : formState.contentHtml.trim(),
      };

      if (formMode === 'create') {
        await axios.post(`${API_BASE}/api/writing`, payload, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        toast.success('Đã tạo Writing prompt mới.');
      } else if (editingTestId) {
        await axios.put(`${API_BASE}/api/writing/${editingTestId}`, payload, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        toast.success('Đã cập nhật Writing prompt.');
      }

      setIsFormModalOpen(false);
      resetFormState();
      fetchTests();
    } catch (error: any) {
      console.error('Failed to save writing prompt:', error);
      toast.error(error.response?.data?.message || 'Không thể lưu Writing prompt.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePrompt = async (testId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa prompt này?')) return;

    try {
      const authToken = getToken(token);
      await axios.delete(`${API_BASE}/api/writing/${testId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      toast.success('Đã xóa Writing prompt.');
      setTests((prev) => prev.filter((item) => item._id !== testId));
    } catch (error: any) {
      console.error('Failed to delete writing prompt:', error);
      toast.error(error.response?.data?.message || 'Không thể xóa Writing prompt.');
    }
  };

  const openCreateSampleModal = () => {
    setSampleForm(defaultSampleFormState);
    setIsSampleModalOpen(true);
  };

  const handleSaveSample = async (event: React.FormEvent) => {
    event.preventDefault();

    const band = parseFloat(sampleForm.bandScore);
    if (!sampleForm.selectedWritingId) {
      toast.error('Vui lòng chọn đề bài Writing.');
      return;
    }
    if (!sampleForm.sampleContentHtml.trim()) {
      toast.error('Vui lòng nhập nội dung bài mẫu.');
      return;
    }
    if (isNaN(band) || band < 1 || band > 9) {
      toast.error('Band score phải là số từ 1 đến 9.');
      return;
    }

    try {
      setIsSavingSample(true);
      const authToken = getToken(token);

      // Push a new sample into the writing's sampleInfos array
      await axios.post(
        `${API_BASE}/api/writing/${sampleForm.selectedWritingId}/samples`,
        {
          bandScore: band,
          author: sampleForm.author.trim() || 'IELTS Master',
          contentHtml: sampleForm.sampleContentHtml.trim(),
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      toast.success('Đã thêm bài mẫu thành công.');
      setIsSampleModalOpen(false);
      setSampleForm(defaultSampleFormState);
      fetchTests();
    } catch (error: any) {
      console.error('Failed to save sample:', error);
      toast.error(error.response?.data?.message || 'Không thể lưu bài mẫu.');
    } finally {
      setIsSavingSample(false);
    }
  };

  const openAssignModal = async (test: WritingTestItem) => {
    setAssigningTest(test);
    setSelectedStudentId('');
    setStudentSearch('');
    setIsAssignModalOpen(true);
    await fetchStudents();
  };

  const closeAssignModal = () => {
    setIsAssignModalOpen(false);
    setAssigningTest(null);
    setSelectedStudentId('');
    setStudentSearch('');
  };

  const submitAssignment = async () => {
    if (!assigningTest || !selectedStudentId) {
      toast.error('Vui lòng chọn học viên để giao đề.');
      return;
    }

    const authToken = getToken(token);

    const assignmentPayload = {
      writingId: assigningTest._id,
      studentId: selectedStudentId,
      taskType: assigningTest.type,
    };

    // Try common endpoint contracts to remain compatible with different backend wiring.
    const assignEndpoints = [
      `${API_BASE}/api/submissions/writing/assign`,
      `${API_BASE}/api/writing/submissions/assign`,
    ];

    try {
      setIsAssigning(true);
      let assigned = false;

      for (const endpoint of assignEndpoints) {
        try {
          await axios.post(endpoint, assignmentPayload, {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          });
          assigned = true;
          break;
        } catch (error: any) {
          const status = Number(error?.response?.status || 0);
          if (status !== 404) {
            throw error;
          }
        }
      }

      if (!assigned) {
        throw new Error('Assignment endpoint chưa được cấu hình trên backend.');
      }

      toast.success('Đã giao đề Writing cho học viên.');
      closeAssignModal();
    } catch (error: any) {
      console.error('Failed to assign writing prompt:', error);
      toast.error(error.response?.data?.message || error.message || 'Không thể giao đề Writing.');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <section className="space-y-6">
      <Toaster position="top-right" />

      <div className="rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#fff7f7_0%,#ffffff_50%,#f8fafc_100%)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Writing Prompt Bank</h2>
            <p className="mt-2 text-sm text-slate-500">
              Quản lý ngân hàng đề Writing IELTS, upload ảnh cho Task 1 và giao đề cho học viên.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openCreateSampleModal}
              className="inline-flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-700 shadow-sm transition hover:bg-amber-100"
            >
              <BookOpen className="h-4 w-4" />
              Tạo Bài Mẫu
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#E31837] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-[#c9142f]"
            >
              <Plus className="h-4 w-4" />
              Tạo Prompt
            </button>
          </div>
        </div>

        <label className="relative mt-5 block max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm theo title, type hoặc category..."
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none ring-red-100 transition focus:border-red-300 focus:ring"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        {isLoadingTests ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <div className="flex items-center gap-3 text-red-600">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              <span className="font-semibold">Đang tải danh sách Writing prompts...</span>
            </div>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="px-6 py-14 text-center text-slate-500">Chưa có prompt nào phù hợp.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredTests.map((test) => (
                  <tr key={test._id} className="transition hover:bg-red-50/40">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{test.title}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          test.type === 'Task 1' ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        {test.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{test.category || 'Mixed'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                        {test.createdAt ? format(new Date(test.createdAt), 'dd/MM/yyyy') : '--'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(test)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePrompt(test._id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => openAssignModal(test)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#E31837] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#c9142f]"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Assign to Student
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {formMode === 'create' ? 'Create Writing Prompt' : 'Edit Writing Prompt'}
                </h3>
                <p className="text-sm text-slate-500">Quản lý đề Task 1/Task 2 cho ngân hàng Writing.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFormModalOpen(false);
                  resetFormState();
                }}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrompt} className="space-y-4 px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">Title</span>
                  <input
                    type="text"
                    value={formState.title}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, title: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none ring-red-100 transition focus:border-red-300 focus:ring"
                    placeholder="VD: Task 1 - Population Chart"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">Type</span>
                  <select
                    value={formState.type}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, type: event.target.value as WritingType }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none ring-red-100 transition focus:border-red-300 focus:ring"
                  >
                    <option value="Task 1">Task 1</option>
                    <option value="Task 2">Task 2</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Category</span>
                <input
                  type="text"
                  value={formState.category}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, category: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none ring-red-100 transition focus:border-red-300 focus:ring"
                  placeholder="VD: Line Graph / Opinion Essay"
                />
              </label>

              {formState.type === 'Task 1' && (
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">Task 1 Image</span>
                  <div className="rounded-xl border border-dashed border-red-200 bg-red-50/30 p-4">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50">
                      <Upload className="h-4 w-4" />
                      Chọn ảnh
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          setTaskImageFile(event.target.files?.[0] || null);
                        }}
                      />
                    </label>

                    <div className="mt-2 text-xs text-slate-500">
                      {taskImageFile
                        ? `Đã chọn: ${taskImageFile.name}`
                        : existingTaskImageUrl
                          ? 'Đang dùng ảnh hiện tại (không chọn file mới thì ảnh cũ được giữ nguyên).'
                          : 'Task 1 nên có hình minh họa (chart/map/process).'}
                    </div>

                    {(taskImageFile || existingTaskImageUrl) && (
                      <div className="mt-3 rounded-lg border border-red-100 bg-white p-2">
                        <img
                          src={taskImageFile ? URL.createObjectURL(taskImageFile) : existingTaskImageUrl}
                          alt="Task 1 preview"
                          className="max-h-48 w-full rounded object-contain"
                        />
                      </div>
                    )}
                  </div>
                </label>
              )}

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Prompt Content (HTML)</span>
                <textarea
                  value={formState.contentHtml}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, contentHtml: event.target.value }))
                  }
                  rows={8}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none ring-red-100 transition focus:border-red-300 focus:ring"
                  placeholder="Nhập nội dung đề bài (hỗ trợ HTML cơ bản)."
                  required
                />
              </label>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormModalOpen(false);
                    resetFormState();
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#E31837] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c9142f] disabled:cursor-not-allowed disabled:bg-red-300"
                >
                  {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FilePenLine className="h-4 w-4" />}
                  {formMode === 'create' ? 'Create Prompt' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAssignModalOpen && assigningTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Assign Writing Prompt</h3>
                <p className="mt-1 text-sm text-slate-500">{assigningTest.title}</p>
              </div>
              <button
                type="button"
                onClick={closeAssignModal}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  placeholder="Tìm theo tên hoặc email học viên..."
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none ring-red-100 transition focus:border-red-300 focus:ring"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Select Student</span>
                <select
                  value={selectedStudentId}
                  onChange={(event) => setSelectedStudentId(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none ring-red-100 transition focus:border-red-300 focus:ring"
                >
                  <option value="">-- Chọn học viên --</option>
                  {filteredStudents.map((student) => (
                    <option key={student._id} value={student._id}>
                      {student.name || student.email || student._id}
                    </option>
                  ))}
                </select>
              </label>

              {isLoadingStudents && (
                <div className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Đang tải danh sách học viên...
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={closeAssignModal}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitAssignment}
                  disabled={isAssigning || !selectedStudentId}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#E31837] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c9142f] disabled:cursor-not-allowed disabled:bg-red-300"
                >
                  {isAssigning ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Sample Creation Modal                                        */}
      {/* ============================================================ */}
      {isSampleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-amber-100 bg-amber-50/90 px-6 py-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
                  <BookOpen className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Tạo Bài Mẫu Writing</h3>
                  <p className="text-xs text-slate-500">Chọn đề bài có sẵn, nhập band score và nội dung bài mẫu.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSampleModalOpen(false);
                  setSampleForm(defaultSampleFormState);
                }}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-amber-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSample} className="space-y-5 px-6 py-6">

              {/* ---- Section 1: Chọn đề bài có sẵn ---- */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Chọn đề bài</p>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">
                    Đề bài Writing <span className="text-red-500">*</span>
                  </span>
                  <select
                    value={sampleForm.selectedWritingId}
                    onChange={(e) => setSampleForm((p) => ({ ...p, selectedWritingId: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none ring-amber-100 transition focus:border-amber-300 focus:ring"
                    required
                  >
                    <option value="">-- Chọn đề bài --</option>
                    {practiceTests.map((t: any) => (
                      <option key={t._id} value={t._id}>
                        [{t.type}] {t.title}{t.category ? ` — ${t.category}` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Preview của đề bài đã chọn */}
                {sampleForm.selectedWritingId && (() => {
                  const w = (tests as any[]).find((t) => t._id === sampleForm.selectedWritingId);
                  if (!w) return null;
                  return (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          w.type === 'Task 1' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                        }`}>{w.type}</span>
                        {w.category && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">{w.category}</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{w.title}</p>
                    </div>
                  );
                })()}
              </div>

              {/* ---- Section 2: Thông tin bài mẫu ---- */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-amber-600">Thông tin bài mẫu</p>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 flex items-center gap-1 text-sm font-semibold text-slate-700">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      Band Score <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="9"
                      value={sampleForm.bandScore}
                      onChange={(e) => setSampleForm((p) => ({ ...p, bandScore: e.target.value }))}
                      className="w-full rounded-xl border border-amber-300 px-4 py-2.5 text-sm outline-none ring-amber-100 transition focus:border-amber-400 focus:ring"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">Tác giả / Nguồn</span>
                    <input
                      type="text"
                      value={sampleForm.author}
                      onChange={(e) => setSampleForm((p) => ({ ...p, author: e.target.value }))}
                      className="w-full rounded-xl border border-amber-300 px-4 py-2.5 text-sm outline-none ring-amber-100 transition focus:border-amber-400 focus:ring"
                      placeholder="VD: IELTS Master / Band 8.0 Sample"
                    />
                  </label>
                </div>

                <label className="mt-4 block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">Nội dung bài mẫu (HTML) <span className="text-red-500">*</span></span>
                  <textarea
                    value={sampleForm.sampleContentHtml}
                    onChange={(e) => setSampleForm((p) => ({ ...p, sampleContentHtml: e.target.value }))}
                    rows={10}
                    className="w-full rounded-xl border border-amber-300 px-4 py-3 text-sm outline-none ring-amber-100 transition focus:border-amber-400 focus:ring"
                    placeholder="Nhập nội dung bài viết mẫu (hỗ trợ HTML). VD: <p>In today's world...</p>"
                    required
                  />
                </label>

                {sampleForm.sampleContentHtml.trim() && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-white p-4">
                    <p className="mb-2 text-xs font-semibold text-amber-600 uppercase tracking-wide">Xem trước nội dung bài mẫu</p>
                    <div
                      className="prose prose-slate max-w-none text-sm leading-7 prose-headings:text-slate-900 prose-strong:text-slate-900"
                      dangerouslySetInnerHTML={{ __html: sampleForm.sampleContentHtml }}
                    />
                  </div>
                )}
              </div>

              {/* ---- Actions ---- */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsSampleModalOpen(false);
                    setSampleForm(defaultSampleFormState);
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingSample}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300"
                >
                  {isSavingSample ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                  Tạo Bài Mẫu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
