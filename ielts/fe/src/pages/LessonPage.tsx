import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { CalendarDays, Film, Play, X } from 'lucide-react';

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

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));

const getToken = () =>
  localStorage.getItem('token') || localStorage.getItem('accessToken') || '';

const getThumbnailUrl = (videoUrl?: string): string => {
  if (!videoUrl) return '';

  const trimmedUrl = videoUrl.trim();
  if (!trimmedUrl) return '';

  // Preserve query string while converting Cloudinary video extension to jpg.
  const [baseUrl, query = ''] = trimmedUrl.split('?');
  const thumbnailBase = baseUrl.replace(/\.mp4$/i, '.jpg');

  if (thumbnailBase === baseUrl) return '';

  return query ? `${thumbnailBase}?${query}` : thumbnailBase;
};

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Video card
// ---------------------------------------------------------------------------
function LessonCard({
  lesson,
  onPlay,
}: {
  lesson: Lesson;
  onPlay: (lesson: Lesson) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const thumbnailUrl = getThumbnailUrl(lesson.videoUrl);
  const showImage = Boolean(thumbnailUrl) && !imageError;

  return (
    <div
      onClick={() => onPlay(lesson)}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Thumbnail */}
      <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-red-50 to-red-100">
        {showImage && (
          <img
            src={thumbnailUrl}
            alt={lesson.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        )}

        <div className="absolute inset-0 bg-black/30" />

        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 shadow-md ring-4 ring-white/40 transition-transform duration-200 group-hover:scale-110">
          <Play className="h-7 w-7 translate-x-0.5 fill-red-600 text-red-600" />
        </div>

        {/* Duration badge – placeholder */}
        <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-white">
          VIDEO
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="line-clamp-2 font-bold text-slate-900 transition-colors group-hover:text-red-600">
          {lesson.title}
        </h3>

        {lesson.description && (
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{lesson.description}</p>
        )}

        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(lesson.createdAt)}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function LessonPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchLessons = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/lessons`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data: Lesson[] =
        res.data?.data ?? res.data?.lessons ?? (Array.isArray(res.data) ? res.data : []);
      setLessons(data);
    } catch (err) {
      console.error('Failed to fetch lessons:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  // ── Modal helpers ──────────────────────────────────────────────────────
  const openModal = (lesson: Lesson) => setSelectedLesson(lesson);

  const closeModal = () => {
    // Pause video before closing to avoid audio leaking after modal unmounts
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setSelectedLesson(null);
  };

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Thư viện bài giảng</h1>
          <p className="mt-1 text-slate-500">
            Học từ những giáo viên hàng đầu — tiến tới band IELTS mục tiêu của bạn
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-2 rounded-xl bg-red-50 px-4 py-2 sm:flex">
          <Film className="h-5 w-5 text-red-500" />
          <span className="text-sm font-semibold text-red-700">
            {isLoading ? '…' : lessons.length} video
          </span>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : lessons.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <Film className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-700">Chưa có bài giảng nào</p>
            <p className="mt-1 text-sm text-slate-500">
              Giáo viên chưa tải lên bài giảng. Hãy quay lại sau nhé!
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson) => (
            <LessonCard key={lesson._id} lesson={lesson} onPlay={openModal} />
          ))}
        </div>
      )}

      {/* ── Video Modal ─────────────────────────────────────────────────── */}
      {selectedLesson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="relative w-full max-w-4xl">
            {/* Close button */}
            <button
              type="button"
              onClick={closeModal}
              className="absolute -right-3 -top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg transition hover:bg-red-50"
              aria-label="Đóng video"
            >
              <X className="h-5 w-5 text-slate-700" />
            </button>

            {/* Title bar */}
            <div className="rounded-t-2xl bg-slate-900 px-4 py-3">
              <p className="line-clamp-1 text-sm font-semibold text-white">
                {selectedLesson.title}
              </p>
            </div>

            {/* Video */}
            <video
              ref={videoRef}
              key={selectedLesson._id}
              src={selectedLesson.videoUrl}
              controls
              autoPlay
              className="w-full rounded-b-2xl bg-black shadow-2xl"
              style={{ maxHeight: '75vh' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
