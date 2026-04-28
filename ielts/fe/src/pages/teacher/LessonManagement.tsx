import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  CalendarDays, Film, Loader2, Play, Plus, Search, Trash2, Upload, X, Youtube,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface Lesson {
  _id: string;
  title: string;
  description?: string;
  videoUrl: string;
  videoType?: 'cloudinary' | 'youtube';
  createdAt: string;
}

const API_BASE = 'http://localhost:3000';
const PAGE_SIZE = 6;

const getToken = () => localStorage.getItem('token') || localStorage.getItem('accessToken') || '';
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));

// Extract YouTube video ID from various URL formats
function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#\s]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function YoutubeThumbnail({ videoId }: { videoId: string }) {
  const [err, setErr] = useState(false);
  const src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  return err ? (
    <div className="flex h-36 w-full items-center justify-center rounded-xl bg-red-50">
      <Youtube className="h-10 w-10 text-red-400" />
    </div>
  ) : (
    <div className="relative h-36 w-full overflow-hidden rounded-xl">
      <img src={src} alt="" className="h-full w-full object-cover" onError={() => setErr(true)} />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 shadow-lg">
          <Play className="h-5 w-5 translate-x-0.5 fill-white text-white" />
        </div>
      </div>
      <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
        YouTube
      </span>
    </div>
  );
}

function CloudinaryThumbnail({ url, title }: { url: string; title: string }) {
  const [err, setErr] = useState(false);
  return (
    <div className="relative h-36 w-full overflow-hidden rounded-xl bg-slate-800">
      {!err && (
        <video src={url} className="h-full w-full object-cover" muted preload="metadata" onError={() => setErr(true)} />
      )}
      {err && (
        <div className="flex h-full items-center justify-center">
          <Film className="h-10 w-10 text-slate-400" />
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
          <Play className="h-5 w-5 translate-x-0.5 fill-blue-600 text-blue-600" />
        </div>
      </div>
      <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
        VIDEO
      </span>
    </div>
  );
}

export function LessonManagement() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploadTab, setUploadTab] = useState<'file' | 'youtube'>('file');
  const [playLesson, setPlayLesson] = useState<Lesson | null>(null);

  // Search + pagination
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubePreviewId, setYoutubePreviewId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchLessons = useCallback(async (pg = 1, q = '') => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/lessons/teacher`, {
        headers: authHeaders(),
        params: { page: pg, search: q },
      });
      const data: Lesson[] = res.data?.data ?? [];
      const pag = res.data?.pagination ?? {};
      setLessons(Array.isArray(data) ? data : []);
      setTotalPages(pag.totalPages ?? 1);
      setTotal(pag.total ?? data.length);
    } catch {
      toast.error('Không thể tải danh sách bài giảng.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchLessons(page, search); }, [fetchLessons, page, search]);

  // ── Search submit ──────────────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  // ── YouTube URL preview ────────────────────────────────────────────────────
  const handleYoutubeChange = (url: string) => {
    setYoutubeUrl(url);
    setYoutubePreviewId(getYouTubeId(url));
  };

  // ── File pick ─────────────────────────────────────────────────────────────
  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) { toast.error('Vui lòng chọn file video.'); return; }
    setVideoFile(file);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Vui lòng nhập tiêu đề.'); return; }

    setIsUploading(true);
    setUploadPercent(0);

    try {
      if (uploadTab === 'youtube') {
        if (!youtubePreviewId) { toast.error('URL YouTube không hợp lệ.'); return; }
        await axios.post(`${API_BASE}/api/lessons`, {
          title: title.trim(), description: description.trim(),
          videoUrl: youtubeUrl.trim(), videoType: 'youtube',
        }, { headers: authHeaders() });
      } else {
        if (!videoFile) { toast.error('Vui lòng chọn file video.'); return; }
        const sigRes = await axios.get(`${API_BASE}/api/media/generate-signature`, {
          params: { folderName: 'ielts_platform/lessons' }, headers: authHeaders(),
        });
        const sd = sigRes.data?.data ?? sigRes.data;
        if (!sd?.signature) throw new Error('Không nhận được chữ ký upload');
        const fd = new FormData();
        fd.append('file', videoFile);
        fd.append('api_key', sd.api_key);
        fd.append('timestamp', String(sd.timestamp));
        fd.append('signature', sd.signature);
        fd.append('folder', sd.folder);
        const cRes = await axios.post(
          `https://api.cloudinary.com/v1_1/${sd.cloud_name}/video/upload`, fd,
          { onUploadProgress: (p) => { if (p.total) setUploadPercent(Math.round(p.loaded * 100 / p.total)); } }
        );
        if (!cRes.data?.secure_url) throw new Error('Cloudinary không trả về URL');
        await axios.post(`${API_BASE}/api/lessons`, {
          title: title.trim(), description: description.trim(),
          videoUrl: cRes.data.secure_url, videoType: 'cloudinary',
        }, { headers: authHeaders() });
      }

      toast.success('Bài giảng đã được tạo thành công!');
      resetForm();
      setShowForm(false);
      setPage(1);
      setSearch('');
      setSearchInput('');
      await fetchLessons(1, '');
    } catch (err) {
      console.error(err);
      toast.error('Tạo bài giảng thất bại.');
    } finally {
      setIsUploading(false);
      setUploadPercent(0);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa bài giảng này?')) return;
    try {
      await axios.delete(`${API_BASE}/api/lessons/${id}`, { headers: authHeaders() });
      toast.success('Đã xóa bài giảng.');
      fetchLessons(page, search);
    } catch { toast.error('Xóa bài giảng thất bại.'); }
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setVideoFile(null);
    setYoutubeUrl(''); setYoutubePreviewId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Quản lý bài giảng</h2>
          <p className="mt-1 text-slate-500">Tải lên và quản lý video bài giảng</p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); resetForm(); }}
          disabled={isUploading}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Đóng form' : 'Tải lên bài giảng'}
        </button>
      </div>

      {/* Upload Form */}
      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-lg font-bold text-slate-900">Bài giảng mới</h3>

          {/* Tab selector */}
          <div className="mb-5 flex gap-2 rounded-xl bg-slate-100 p-1 w-fit">
            <button
              type="button"
              onClick={() => setUploadTab('file')}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${uploadTab === 'file' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Upload className="h-4 w-4" /> Tải file lên
            </button>
            <button
              type="button"
              onClick={() => setUploadTab('youtube')}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${uploadTab === 'youtube' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Youtube className="h-4 w-4" /> Link YouTube
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tiêu đề <span className="text-red-500">*</span></label>
              <input
                type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="VD: IELTS Listening – Band 7 Strategies"
                disabled={isUploading}
                className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Mô tả</label>
              <textarea
                value={description} onChange={e => setDescription(e.target.value)}
                rows={3} placeholder="Mô tả ngắn về nội dung bài giảng…"
                disabled={isUploading}
                className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
              />
            </div>

            {/* YouTube tab */}
            {uploadTab === 'youtube' && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Link YouTube <span className="text-red-500">*</span></label>
                <input
                  type="url" value={youtubeUrl} onChange={e => handleYoutubeChange(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  disabled={isUploading}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/20 disabled:bg-slate-50"
                />
                {youtubePreviewId && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                    <YoutubeThumbnail videoId={youtubePreviewId} />
                    <p className="bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      ✓ Video ID: <span className="font-mono font-semibold text-slate-700">{youtubePreviewId}</span>
                    </p>
                  </div>
                )}
                {youtubeUrl && !youtubePreviewId && (
                  <p className="mt-1.5 text-xs text-red-500">URL không hợp lệ. Vui lòng kiểm tra lại.</p>
                )}
              </div>
            )}

            {/* File tab */}
            {uploadTab === 'file' && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">File video <span className="text-red-500">*</span></label>
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={e => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer.files[0] ?? null); }}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
                    isDragging ? 'border-blue-500 bg-blue-50' :
                    videoFile ? 'border-emerald-400 bg-emerald-50' :
                    'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40'
                  } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <Upload className={`h-8 w-8 ${videoFile ? 'text-emerald-600' : 'text-slate-400'}`} />
                  {videoFile ? (
                    <>
                      <p className="text-sm font-semibold text-emerald-700">{videoFile.name}</p>
                      <p className="text-xs text-emerald-600">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      <button type="button" onClick={e => { e.stopPropagation(); setVideoFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="text-xs font-medium text-rose-600 underline">Xóa file</button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-700">Kéo thả video vào đây hoặc&nbsp;<span className="text-blue-600 underline">chọn file</span></p>
                      <p className="text-xs text-slate-500">MP4, MOV, AVI – tối đa 500 MB</p>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
                  onChange={e => handleFileSelect(e.target.files?.[0] ?? null)} />
                {isUploading && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span className="flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />Đang tải lên…</span>
                      <span className="font-semibold text-blue-600">{uploadPercent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all" style={{ width: `${uploadPercent}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={isUploading}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60">
                {isUploading ? <><Loader2 className="h-4 w-4 animate-spin" />Đang xử lý…</> : <><Upload className="h-4 w-4" />Lưu bài giảng</>}
              </button>
              <button type="button" onClick={() => { if (!isUploading) { resetForm(); setShowForm(false); } }} disabled={isUploading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50">
                <X className="h-4 w-4" />Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lesson list */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-bold text-slate-900">
            Danh sách bài giảng
            {!isLoading && <span className="ml-2 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">{total}</span>}
          </h3>
          {/* Search */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
                placeholder="Tìm tiêu đề, mô tả…"
                className="h-9 w-56 rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-700">
              <Search className="h-3.5 w-3.5" />Tìm
            </button>
            {search && (
              <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
                className="h-9 rounded-lg border border-slate-300 px-3 text-sm text-slate-600 transition hover:bg-slate-50">Xóa</button>
            )}
          </form>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 h-36 rounded-xl bg-slate-200" />
                <div className="mb-2 h-4 w-3/4 rounded bg-slate-200" />
                <div className="h-3 w-1/2 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : lessons.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Film className="h-8 w-8 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700">{search ? 'Không tìm thấy kết quả' : 'Chưa có bài giảng nào'}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
              {lessons.map(lesson => {
                const ytId = lesson.videoType === 'youtube' ? getYouTubeId(lesson.videoUrl) : null;
                return (
                  <div key={lesson._id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                    <div className="cursor-pointer" onClick={() => setPlayLesson(lesson)}>
                      {ytId
                        ? <YoutubeThumbnail videoId={ytId} />
                        : <CloudinaryThumbnail url={lesson.videoUrl} title={lesson.title} />
                      }
                    </div>
                    <div className="p-4">
                      <h4 className="line-clamp-2 font-semibold text-slate-900">{lesson.title}</h4>
                      {lesson.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{lesson.description}</p>}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <CalendarDays className="h-3.5 w-3.5" />{formatDate(lesson.createdAt)}
                        </span>
                        <button onClick={() => handleDelete(lesson._id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 border-t border-slate-100 px-6 py-4">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="h-8 rounded-lg border border-slate-300 px-3 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-40">← Trước</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`h-8 w-8 rounded-lg text-sm font-semibold transition ${p === page ? 'bg-blue-600 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                    {p}
                  </button>
                ))}
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  className="h-8 rounded-lg border border-slate-300 px-3 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-40">Tiếp →</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Play Modal */}
      {playLesson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setPlayLesson(null)}
        >
          <div className="relative w-full max-w-4xl">
            <button onClick={() => setPlayLesson(null)}
              className="absolute -right-3 -top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg transition hover:bg-red-50">
              <X className="h-5 w-5 text-slate-700" />
            </button>
            <div className="rounded-t-2xl bg-slate-900 px-4 py-3">
              <p className="line-clamp-1 text-sm font-semibold text-white">{playLesson.title}</p>
            </div>
            {playLesson.videoType === 'youtube' && getYouTubeId(playLesson.videoUrl) ? (
              <div className="rounded-b-2xl overflow-hidden bg-black">
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${getYouTubeId(playLesson.videoUrl)}?autoplay=1&rel=0&modestbranding=1`}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={playLesson.title}
                  />
                </div>
                <div className="flex items-center justify-between bg-slate-900 px-4 py-2">
                  <span className="text-xs text-slate-400">📺 Lượt xem được tính về kênh gốc trên YouTube</span>
                  <a
                    href={playLesson.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-red-700"
                  >
                    <Youtube className="h-3.5 w-3.5" /> Xem trên YouTube
                  </a>
                </div>
              </div>
            ) : (
              <video key={playLesson._id} src={playLesson.videoUrl} controls autoPlay
                className="w-full rounded-b-2xl bg-black shadow-2xl" style={{ maxHeight: '75vh' }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
