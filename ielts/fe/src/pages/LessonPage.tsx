import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { CalendarDays, Film, Play, Search, X, Youtube } from 'lucide-react';

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

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));

const getToken = () => localStorage.getItem('token') || localStorage.getItem('accessToken') || '';

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#\s]{11})/);
  return m ? m[1] : null;
}

// Convert Cloudinary video URL to thumbnail image URL (.mp4 → .jpg)
function getCloudinaryThumbnail(videoUrl: string): string {
  if (!videoUrl) return '';
  const [base, query = ''] = videoUrl.trim().split('?');
  const thumb = base.replace(/\.mp4$/i, '.jpg');
  if (thumb === base) return ''; // not an mp4 URL
  return query ? `${thumb}?${query}` : thumb;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="h-44 w-full bg-slate-200" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 rounded bg-slate-200" />
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-2/3 rounded bg-slate-100" />
      </div>
    </div>
  );
}

// ── Lesson Card ───────────────────────────────────────────────────────────────
function LessonCard({ lesson, onPlay }: { lesson: Lesson; onPlay: (l: Lesson) => void }) {
  const [imgErr, setImgErr] = useState(false);
  const ytId = lesson.videoType === 'youtube' ? getYouTubeId(lesson.videoUrl) : null;

  // Thumbnail source: YouTube → hqdefault.jpg | Cloudinary → derived .jpg
  const thumbSrc = ytId
    ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
    : getCloudinaryThumbnail(lesson.videoUrl);

  return (
    <div
      onClick={() => onPlay(lesson)}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Thumbnail */}
      <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
        {thumbSrc && !imgErr && (
          <img src={thumbSrc} alt={lesson.title} className="h-full w-full object-cover" onError={() => setImgErr(true)} />
        )}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute flex h-14 w-14 items-center justify-center rounded-full bg-white/80 shadow-md ring-4 ring-white/40 transition-transform duration-200 group-hover:scale-110">
          <Play className="h-7 w-7 translate-x-0.5 fill-red-600 text-red-600" />
        </div>
        <span className={`absolute bottom-2 right-2 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold text-white ${ytId ? 'bg-red-600' : 'bg-black/60'}`}>
          {ytId ? <><Youtube className="h-3 w-3" />YouTube</> : 'VIDEO'}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="line-clamp-2 font-bold text-slate-900 transition-colors group-hover:text-red-600">{lesson.title}</h3>
        {lesson.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{lesson.description}</p>}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <CalendarDays className="h-3.5 w-3.5" />{formatDate(lesson.createdAt)}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LessonPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);

  const fetchLessons = useCallback(async (pg = 1, q = '') => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/lessons`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        params: { page: pg, search: q },
      });
      const data: Lesson[] = res.data?.data ?? res.data?.lessons ?? (Array.isArray(res.data) ? res.data : []);
      const pag = res.data?.pagination ?? {};
      setLessons(data);
      setTotalPages(pag.totalPages ?? 1);
      setTotal(pag.total ?? data.length);
    } catch (err) {
      console.error('Failed to fetch lessons:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchLessons(page, search); }, [fetchLessons, page, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const closeModal = () => {
    if (videoRef.current) videoRef.current.pause();
    setSelectedLesson(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ytId = selectedLesson ? (selectedLesson.videoType === 'youtube' ? getYouTubeId(selectedLesson.videoUrl) : null) : null;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Thư viện bài giảng</h1>
          <p className="mt-1 text-slate-500">Học từ những giáo viên hàng đầu — tiến tới band IELTS mục tiêu của bạn</p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 rounded-xl bg-red-50 px-4 py-2 sm:flex">
          <Film className="h-5 w-5 text-red-500" />
          <span className="text-sm font-semibold text-red-700">{isLoading ? '…' : total} video</span>
        </div>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder="Tìm kiếm bài giảng theo tiêu đề hoặc mô tả…"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
          />
        </div>
        <button type="submit"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700">
          <Search className="h-4 w-4" />Tìm kiếm
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
            className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-600 transition hover:bg-slate-50">
            Xóa bộ lọc
          </button>
        )}
      </form>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : lessons.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <Film className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-700">{search ? 'Không tìm thấy kết quả' : 'Chưa có bài giảng nào'}</p>
            <p className="mt-1 text-sm text-slate-500">{search ? 'Thử tìm với từ khóa khác.' : 'Giáo viên chưa tải lên bài giảng. Hãy quay lại sau nhé!'}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {lessons.map(lesson => <LessonCard key={lesson._id} lesson={lesson} onPlay={setSelectedLesson} />)}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="h-9 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40">
                ← Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`h-9 w-9 rounded-xl text-sm font-semibold transition ${p === page ? 'bg-red-600 text-white shadow-sm' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
                  {p}
                </button>
              ))}
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="h-9 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40">
                Tiếp →
              </button>
            </div>
          )}
        </>
      )}

      {/* Video Modal */}
      {selectedLesson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && closeModal()}
        >
          <div className="relative w-full max-w-4xl">
            <button onClick={closeModal}
              className="absolute -right-3 -top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg transition hover:bg-red-50">
              <X className="h-5 w-5 text-slate-700" />
            </button>
            <div className="rounded-t-2xl bg-slate-900 px-4 py-3">
              <p className="line-clamp-1 text-sm font-semibold text-white">{selectedLesson.title}</p>
            </div>
            {ytId ? (
              <div className="rounded-b-2xl overflow-hidden bg-black">
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={selectedLesson.title}
                  />
                </div>
                <div className="flex items-center justify-between bg-slate-900 px-4 py-2">
                  <span className="text-xs text-slate-400">📺 Lượt xem được tính về kênh gốc trên YouTube</span>
                  <a
                    href={selectedLesson.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-red-700"
                  >
                    <Youtube className="h-3.5 w-3.5" /> Xem trên YouTube
                  </a>
                </div>
              </div>
            ) : (
              <video ref={videoRef} key={selectedLesson._id} src={selectedLesson.videoUrl}
                controls autoPlay className="w-full rounded-b-2xl bg-black shadow-2xl" style={{ maxHeight: '75vh' }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
