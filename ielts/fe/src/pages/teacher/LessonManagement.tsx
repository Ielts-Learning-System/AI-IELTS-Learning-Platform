import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  CalendarDays,
  Film,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Lesson {
  _id: string;
  title: string;
  description?: string;
  videoUrl: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const API_BASE = 'http://localhost:3000';

const getToken = () =>
  localStorage.getItem('token') || localStorage.getItem('accessToken') || '';

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function UploadProgress({ percent }: { percent: number }) {
  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span className="flex items-center gap-1.5 font-medium">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
          Đang tải video lên…
        </span>
        <span className="font-semibold text-blue-600">{percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function VideoThumbnail({ url, title }: { url: string; title: string }) {
  const [errored, setErrored] = useState(false);

  if (!url || errored) {
    return (
      <div className="flex h-32 w-full items-center justify-center rounded-xl bg-slate-100">
        <Film className="h-10 w-10 text-slate-400" />
      </div>
    );
  }

  // If the URL is a Cloudinary video URL, render a native video element
  if (url.includes('cloudinary.com') || url.match(/\.(mp4|webm|ogg)(\?|$)/i)) {
    return (
      <video
        src={url}
        className="h-32 w-full rounded-xl object-cover"
        muted
        preload="metadata"
        onError={() => setErrored(true)}
      />
    );
  }

  // Fallback: YouTube / generic thumbnail via oEmbed
  return (
    <div className="flex h-32 w-full items-center justify-center rounded-xl bg-slate-900">
      <Video className="h-10 w-10 text-white/60" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function LessonManagement() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------------------
  // Fetch lessons
  // -------------------------------------------------------------------------
  const fetchLessons = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/lessons`, {
        headers: authHeaders(),
      });
      const data: Lesson[] = res.data?.data ?? res.data?.lessons ?? res.data ?? [];
      setLessons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch lessons:', err);
      toast.error('Không thể tải danh sách bài giảng.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  // -------------------------------------------------------------------------
  // Handle file drop / pick
  // -------------------------------------------------------------------------
  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      toast.error('Vui lòng chọn file video (.mp4, .mov, …)');
      return;
    }
    setVideoFile(file);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0] ?? null;
    handleFileSelect(file);
  };

  // -------------------------------------------------------------------------
  // Submit: signed direct upload to Cloudinary → save lesson metadata
  // -------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề bài giảng.');
      return;
    }
    if (!videoFile) {
      toast.error('Vui lòng chọn file video.');
      return;
    }

    setIsUploading(true);
    setUploadPercent(0);

    try {
      // Step 1: Ask backend to generate a signed upload payload
      const sigRes = await axios.get(`${API_BASE}/api/media/generate-signature`, {
        params: {
          folderName: 'ielts_platform/lessons',
        },
        headers: authHeaders(),
      });

      const signatureData = sigRes.data?.data ?? sigRes.data;
      const signature: string = signatureData?.signature;
      const timestamp: number = signatureData?.timestamp;
      const cloudName: string = signatureData?.cloud_name;
      const apiKey: string = signatureData?.api_key;
      const folder: string = signatureData?.folder;

      if (!signature || !timestamp || !cloudName || !apiKey || !folder) {
        throw new Error('Không nhận được chữ ký upload hợp lệ từ server');
      }

      // Step 2: Upload video directly from browser to Cloudinary
      const cloudFormData = new FormData();
      cloudFormData.append('file', videoFile);
      cloudFormData.append('api_key', apiKey);
      cloudFormData.append('timestamp', String(timestamp));
      cloudFormData.append('signature', signature);
      cloudFormData.append('folder', folder);

      const cloudinaryUploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;

      const cloudRes = await axios.post(cloudinaryUploadUrl, cloudFormData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadPercent(pct);
          }
        },
      });

      const secure_url: string = cloudRes.data?.secure_url ?? '';
      if (!secure_url) {
        throw new Error('Cloudinary không trả về secure_url');
      }

      // Step 3: Save lesson metadata to lesson-service
      await axios.post(
        `${API_BASE}/api/lessons`,
        {
          title: title.trim(),
          description: description.trim(),
          videoUrl: secure_url,
        },
        { headers: authHeaders() }
      );

      toast.success('Bài giảng đã được tạo thành công!');
      resetForm();
      setShowForm(false);
      await fetchLessons();
    } catch (err) {
      console.error('Failed to create lesson:', err);
      toast.error('Tạo bài giảng thất bại. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
      setUploadPercent(0);
    }
  };

  // -------------------------------------------------------------------------
  // Delete lesson
  // -------------------------------------------------------------------------
  const handleDelete = async (lessonId: string) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa bài giảng này?')) return;

    try {
      await axios.delete(`${API_BASE}/api/lessons/${lessonId}`, {
        headers: authHeaders(),
      });
      setLessons((prev) => prev.filter((l) => l._id !== lessonId));
      toast.success('Đã xóa bài giảng.');
    } catch (err) {
      console.error('Failed to delete lesson:', err);
      toast.error('Xóa bài giảng thất bại.');
    }
  };

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setVideoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const cancelForm = () => {
    if (isUploading) return;
    resetForm();
    setShowForm(false);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Quản lý bài giảng</h2>
          <p className="mt-1 text-slate-600">Tải lên và quản lý video bài giảng của bạn</p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          disabled={isUploading}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Đóng form' : 'Tải lên bài giảng'}
        </button>
      </div>

      {/* ─── Upload Form ─────────────────────────────────────── */}
      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-lg font-bold text-slate-900">Bài giảng mới</h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Tiêu đề <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: IELTS Listening – Band 7 Strategies"
                disabled={isUploading}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Mô tả
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Mô tả ngắn về nội dung bài giảng…"
                disabled={isUploading}
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
              />
            </div>

            {/* Video File */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                File video <span className="text-red-500">*</span>
              </label>

              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : videoFile
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40'
                } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
              >
                <Upload
                  className={`h-8 w-8 ${
                    videoFile ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                />
                {videoFile ? (
                  <>
                    <p className="text-sm font-semibold text-emerald-700">{videoFile.name}</p>
                    <p className="text-xs text-emerald-600">
                      {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVideoFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="mt-1 text-xs font-medium text-rose-600 underline"
                    >
                      Xóa file
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-700">
                      Kéo thả video vào đây hoặc&nbsp;
                      <span className="text-blue-600 underline">chọn file</span>
                    </p>
                    <p className="text-xs text-slate-500">MP4, MOV, AVI – tối đa 500 MB</p>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
              />

              {/* Progress bar */}
              {isUploading && <UploadProgress percent={uploadPercent} />}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={isUploading}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang xử lý…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Tải lên & Lưu
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={cancelForm}
                disabled={isUploading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Lesson Grid ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="font-bold text-slate-900">
            Danh sách bài giảng
            {!isLoading && (
              <span className="ml-2 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                {lessons.length}
              </span>
            )}
          </h3>
        </div>

        {/* Loading skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 h-32 rounded-xl bg-slate-200" />
                <div className="mb-2 h-4 w-3/4 rounded bg-slate-200" />
                <div className="h-3 w-1/2 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : lessons.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Video className="h-8 w-8 text-slate-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">Chưa có bài giảng nào</p>
              <p className="mt-1 text-sm text-slate-500">
                Nhấn "Tải lên bài giảng" để thêm bài giảng đầu tiên.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
            {lessons.map((lesson) => (
              <div
                key={lesson._id}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                {/* Thumbnail */}
                <div className="relative overflow-hidden">
                  <VideoThumbnail url={lesson.videoUrl} title={lesson.title} />

                  {/* Overlay play icon */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition group-hover:bg-black/20">
                    <div className="scale-75 opacity-0 transition group-hover:scale-100 group-hover:opacity-100">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm">
                        <Video className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h4 className="line-clamp-2 font-semibold text-slate-900" title={lesson.title}>
                    {lesson.title}
                  </h4>

                  {lesson.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {lesson.description}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(lesson.createdAt)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDelete(lesson._id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      title="Xóa bài giảng"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
