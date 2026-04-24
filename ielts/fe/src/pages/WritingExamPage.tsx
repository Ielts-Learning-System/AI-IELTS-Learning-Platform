import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Split from 'react-split';
import toast, { Toaster } from 'react-hot-toast';
import {
  AlarmClock,
  BookOpen,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  PenLine,
  Send,
  Star,
  User,
} from 'lucide-react';
import { useUserStore } from '../store/useUserStore';

interface Writing {
  _id: string;
  title: string;
  type: 'Task 1' | 'Task 2';
  category: string;
  timeLimit: number;
  contentHtml: string;
  isSample: boolean;
  sampleInfo?: {
    bandScore: number;
    contentHtml: string;
    author: string;
  };
  tags: string[];
}

const WRITING_API_BASE = 'http://localhost:3000/api/writing';

const getToken = (fallbackToken: string | null) =>
  fallbackToken || localStorage.getItem('token') || localStorage.getItem('accessToken') || '';

const getWordCount = (text: string): number =>
  text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

const extractFirstImage = (html: string) => {
  const match = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  return match ? match[1] : null;
};

const removeImagesFromHtml = (html: string) => html.replace(/<img[^>]*>/gi, '');

export function WritingExamPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { token } = useUserStore();
  const [writing, setWriting] = useState<Writing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [essay, setEssay] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const promptImage = useMemo(
    () => (writing ? extractFirstImage(writing.contentHtml) : null),
    [writing],
  );

  const instructionHtml = useMemo(
    () => (writing ? removeImagesFromHtml(writing.contentHtml) : ''),
    [writing],
  );

  useEffect(() => {
    const controller = new AbortController();

    const fetchWriting = async () => {
      try {
        setIsLoading(true);
        const res = await axios.get(`${WRITING_API_BASE}/items/${id}`, {
          signal: controller.signal,
        });
        setWriting(res.data?.data ?? res.data);
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error('Error fetching writing:', err);
          toast.error('Không thể tải đề Writing.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchWriting();
    }

    return () => controller.abort();
  }, [id]);

  const wordCount = useMemo(() => getWordCount(essay), [essay]);
  const minWords = writing?.type === 'Task 1' ? 150 : 250;
  const isWordCountValid = wordCount >= minWords;

  const handleSubmit = async () => {
    if (!writing) return;

    const normalizedEssay = essay.trim();
    if (!normalizedEssay) {
      toast.error('Bạn chưa nhập bài viết.');
      return;
    }

    if (!getToken(token)) {
      toast.error('Bạn cần đăng nhập để nộp bài.');
      return;
    }

    try {
      setIsSubmitting(true);

      await axios.post(
        `${WRITING_API_BASE}/submissions`,
        {
          writingId: writing._id,
          taskType: writing.type,
          content: normalizedEssay,
        },
        {
          headers: {
            Authorization: `Bearer ${getToken(token)}`,
          },
        },
      );

      toast.success('Nộp bài thành công. Đang chuyển đến lịch sử bài viết...');
      setTimeout(() => navigate('/history'), 900);
    } catch (error: any) {
      console.error('Failed to submit writing:', error);
      toast.error(error.response?.data?.message || 'Không thể nộp bài. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center rounded-[28px] border border-red-100 bg-white">
        <div className="flex items-center gap-3 text-red-600">
          <LoaderCircle className="h-6 w-6 animate-spin" />
          <p className="text-lg font-semibold">Đang nạp đề thi...</p>
        </div>
      </div>
    );
  }

  if (!writing) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center rounded-[28px] border border-red-100 bg-white px-6 text-center">
        <div>
          <FileText className="mx-auto mb-4 h-10 w-10 text-red-500" />
          <p className="text-lg font-semibold text-red-600">Không tìm thấy đề thi</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <div className="overflow-hidden rounded-[32px] border border-red-100 bg-[linear-gradient(135deg,#fff7f7_0%,#ffffff_42%,#fff1f2_100%)] shadow-[0_24px_80px_rgba(127,29,29,0.08)]">
        <div className="border-b border-red-100/80 bg-white/85 px-6 py-5 backdrop-blur sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              {writing.isSample ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
                  <BookOpen className="h-3.5 w-3.5" />
                  Bài mẫu
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-600">
                  <PenLine className="h-3.5 w-3.5" />
                  Writing Exam
                </div>
              )}
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{writing.title}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {writing.type} · {writing.category || 'Mixed'}
                  {!writing.isSample && ` · ${writing.timeLimit} phút`}
                  {writing.isSample && writing.sampleInfo && (
                    <> · <span className="font-semibold text-amber-600">Band {writing.sampleInfo.bandScore.toFixed(1)}</span> · {writing.sampleInfo.author}</>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!writing.isSample && (
                <>
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                    <AlarmClock className="h-4 w-4" />
                    {writing.timeLimit} phút
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#E31837] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-[#c9142f] disabled:cursor-not-allowed disabled:bg-red-300"
                  >
                    {isSubmitting ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Nộp bài
                  </button>
                </>
              )}
              {writing.isSample && writing.sampleInfo && (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  Band {writing.sampleInfo.bandScore.toFixed(1)}
                </div>
              )}
            </div>
          </div>
        </div>

        <Split
          className="flex min-h-[calc(100vh-14rem)] w-full overflow-hidden"
          sizes={[46, 54]}
          minSize={360}
          gutterSize={10}
          gutterAlign="center"
          snapOffset={30}
          dragInterval={1}
          direction="horizontal"
          cursor="col-resize"
        >
          <section className="overflow-y-auto bg-white px-6 py-6 sm:px-8">
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="rounded-[28px] border border-red-100 bg-[radial-gradient(circle_at_top_left,_rgba(227,24,55,0.08),_transparent_45%),linear-gradient(180deg,#ffffff_0%,#fff8f8_100%)] p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-red-50 p-3 text-red-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-500">Đề bài</p>
                    <h2 className="mt-2 text-xl font-bold text-slate-900">{writing.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Đọc kỹ yêu cầu, quan sát biểu đồ hoặc hình minh họa nếu có, sau đó hoàn thành bài viết ở khung bên phải.
                    </p>
                  </div>
                </div>
              </div>

              {promptImage && (
                <div className="overflow-hidden rounded-[28px] border border-red-100 bg-white shadow-sm">
                  <div className="flex items-center gap-2 border-b border-red-50 px-5 py-4 text-sm font-semibold text-slate-700">
                    <ImageIcon className="h-4 w-4 text-red-500" />
                    Hình minh họa
                  </div>
                  <div className="bg-[linear-gradient(180deg,#fff8f8_0%,#ffffff_100%)] p-5">
                    <img
                      src={promptImage}
                      alt={writing.title}
                      className="mx-auto max-h-[360px] w-full rounded-2xl object-contain"
                    />
                  </div>
                </div>
              )}

              <div className="rounded-[28px] border border-red-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-red-500">
                  <FileText className="h-4 w-4" />
                  Instructions
                </div>
                <div
                  className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-strong:text-slate-900 prose-a:text-red-600"
                  dangerouslySetInnerHTML={{ __html: instructionHtml }}
                />
              </div>
            </div>
          </section>

          <section className="flex min-h-full flex-col bg-[linear-gradient(180deg,#fff5f5_0%,#ffffff_100%)] px-6 py-6 sm:px-8">
            <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-5">

              {/* Stats row — practice only */}
              {!writing.isSample && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[24px] border border-red-100 bg-white px-4 py-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Task</p>
                    <p className="mt-2 text-lg font-bold text-slate-900">{writing.type}</p>
                  </div>
                  <div className="rounded-[24px] border border-amber-100 bg-amber-50 px-4 py-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Tối thiểu</p>
                    <p className="mt-2 text-lg font-bold text-amber-900">{minWords} từ</p>
                  </div>
                  <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 px-4 py-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Mục tiêu</p>
                    <p className="mt-2 text-lg font-bold text-emerald-900">Band 7+</p>
                  </div>
                </div>
              )}

              {/* Sample meta row */}
              {writing.isSample && writing.sampleInfo && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[24px] border border-amber-100 bg-amber-50 px-4 py-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Band Score</p>
                    <p className="mt-2 text-lg font-bold text-amber-900">{writing.sampleInfo.bandScore.toFixed(1)}</p>
                  </div>
                  <div className="rounded-[24px] border border-red-100 bg-white px-4 py-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Task</p>
                    <p className="mt-2 text-lg font-bold text-slate-900">{writing.type}</p>
                  </div>
                  <div className="rounded-[24px] border border-slate-100 bg-slate-50 px-4 py-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tác giả</p>
                    <p className="mt-2 text-sm font-bold text-slate-700 truncate">{writing.sampleInfo.author}</p>
                  </div>
                </div>
              )}

              {/* ---- Sample essay viewer ---- */}
              {writing.isSample ? (
                <div className="flex-1 overflow-hidden rounded-[30px] border border-red-100 bg-white shadow-[0_20px_60px_rgba(127,29,29,0.08)]">
                  <div className="flex items-center gap-3 border-b border-red-50 px-5 py-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
                      <BookOpen className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Bài mẫu tham khảo</p>
                      {writing.sampleInfo && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {writing.sampleInfo.author}
                          <span className="mx-1">·</span>
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          Band {writing.sampleInfo.bandScore.toFixed(1)}
                        </p>
                      )}
                    </div>
                  </div>

                  {writing.sampleInfo?.contentHtml ? (
                    <div
                      className="h-[calc(100%-4.5rem)] overflow-y-auto px-6 py-6 text-[15px] leading-8 text-slate-700 prose prose-slate max-w-none prose-headings:text-slate-900 prose-strong:text-slate-900 prose-a:text-red-600"
                      dangerouslySetInnerHTML={{ __html: writing.sampleInfo.contentHtml }}
                    />
                  ) : (
                    <div className="flex h-[calc(100%-4.5rem)] flex-col items-center justify-center gap-3 text-slate-400">
                      <FileText className="h-10 w-10" />
                      <p className="text-sm font-medium">Chưa có nội dung bài mẫu</p>
                    </div>
                  )}
                </div>
              ) : (
                /* ---- Practice essay textarea ---- */
                <>
                  <div className="flex-1 overflow-hidden rounded-[30px] border border-red-100 bg-white shadow-[0_20px_60px_rgba(127,29,29,0.08)]">
                    <div className="flex items-center justify-between border-b border-red-50 px-5 py-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Bài viết của bạn</p>
                        <p className="text-xs text-slate-500">Viết trực tiếp trong khung này và theo dõi số từ bên dưới.</p>
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          isWordCountValid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {isWordCountValid ? 'Đã đủ từ' : 'Chưa đủ từ'}
                      </div>
                    </div>

                    <textarea
                      value={essay}
                      onChange={(event) => setEssay(event.target.value)}
                      placeholder="Bắt đầu viết bài luận IELTS của bạn tại đây..."
                      className="h-[calc(100%-4.5rem)] min-h-[420px] w-full resize-none bg-transparent px-6 py-6 text-[15px] leading-8 text-slate-700 outline-none placeholder:text-slate-300"
                    />
                  </div>

                  <div className="flex flex-col gap-4 rounded-[26px] border border-red-100 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">Số từ hiện tại: {wordCount}</p>
                      <p className="text-xs text-slate-500">
                        {isWordCountValid
                          ? 'Bạn đã đạt mức tối thiểu. Hãy dành thời gian rà soát luận điểm và ngữ pháp.'
                          : `Bạn cần thêm ít nhất ${Math.max(minWords - wordCount, 0)} từ để đạt mức khuyến nghị.`}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#E31837] px-5 py-3 text-sm font-bold text-[#E31837] transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-red-200 disabled:text-red-300"
                    >
                      {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Nộp bài
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        </Split>
      </div>
    </div>
  );
}
