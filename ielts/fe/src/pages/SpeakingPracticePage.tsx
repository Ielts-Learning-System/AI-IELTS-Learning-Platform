import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CloudUpload,
  FileAudio,
  LoaderCircle,
  Mic,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';
import { fetchSpeakingTestById, type SpeakingTestDetail } from '../api/speaking.api';
import { apiClient } from '../lib/api/client';
import { useTextToSpeech } from '../hooks/useTextToSpeech';


function AnimatedExaminer({
  isSpeaking,
  size = 80,
}: {
  isSpeaking: boolean;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="select-none"
    >
      <circle
        cx="60"
        cy="60"
        r="58"
        fill={isSpeaking ? '#FEF2F2' : '#F8FAFC'}
        stroke={isSpeaking ? '#DC2626' : '#E2E8F0'}
        strokeWidth="3"
      />
      <ellipse cx="60" cy="38" rx="28" ry="24" fill="#1E293B" />
      <ellipse cx="60" cy="30" rx="24" ry="16" fill="#1E293B" />
      <ellipse cx="60" cy="50" rx="22" ry="24" fill="#FBBF8C" />
      <ellipse cx="38" cy="50" rx="4" ry="6" fill="#F5A76C" />
      <ellipse cx="82" cy="50" rx="4" ry="6" fill="#F5A76C" />
      <ellipse cx="51" cy="47" rx="3" ry="3.5" fill="#1E293B" />
      <ellipse cx="69" cy="47" rx="3" ry="3.5" fill="#1E293B" />
      <circle cx="52" cy="46" r="1" fill="white" />
      <circle cx="70" cy="46" r="1" fill="white" />
      <path d="M46 41 Q51 38 56 41" stroke="#1E293B" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M64 41 Q69 38 74 41" stroke="#1E293B" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M58 52 Q60 56 62 52" stroke="#E8956A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {isSpeaking ? (
        <ellipse cx="60" cy="61" rx="5" ry="4" fill="#1E293B">
          <animate attributeName="ry" values="4;2;5;3;4" dur="0.4s" repeatCount="indefinite" />
          <animate attributeName="rx" values="5;4;6;4;5" dur="0.4s" repeatCount="indefinite" />
        </ellipse>
      ) : (
        <path d="M53 60 Q60 66 67 60" stroke="#1E293B" strokeWidth="2" fill="none" strokeLinecap="round" />
      )}
      <path d="M30 95 Q30 78 60 78 Q90 78 90 95 L90 120 L30 120 Z" fill="#DC2626" />
      <path d="M50 78 L55 90 L60 80 L65 90 L70 78" fill="white" stroke="#F1F5F9" strokeWidth="0.5" />
      <path d="M50 78 L42 95" stroke="#B91C1C" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M70 78 L78 95" stroke="#B91C1C" strokeWidth="1.5" strokeLinecap="round" />
      {isSpeaking && (
        <>
          <circle cx="60" cy="60" r="56" stroke="#DC2626" strokeWidth="1" fill="none" opacity="0.3">
            <animate attributeName="r" values="56;60" dur="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0" dur="1s" repeatCount="indefinite" />
          </circle>
          <circle cx="60" cy="60" r="56" stroke="#DC2626" strokeWidth="1" fill="none" opacity="0.2">
            <animate attributeName="r" values="56;64" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.2;0" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </>
      )}
    </svg>
  );
}


// Stable key for identifying each question's audio slot.
// Part 1: 'p1_0', 'p1_1', ...  Part 2: 'p2'  Part 3: 'p3_0', 'p3_1', ...
function getQuestionKey(part: 1 | 2 | 3, index: number): string {
  return part === 2 ? 'p2' : `p${part}_${index}`;
}

// One audio answer for a single question.
interface AnswerEntry {
  /** Local File — present when uploaded this session, absent for server-loaded entries. */
  file?: File;
  /** Object URL for immediate local playback — must be revoked on removal / unmount. */
  previewUrl?: string;
  /** Cloudinary URL — present once upload succeeds or loaded from server. */
  cloudUrl: string;
}

function getErrorMessage(err: unknown): string {
  if (axios.isCancel(err)) return '';
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 404) return 'Không tìm thấy đề Speaking bạn đang mở.';
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message ?? `Lỗi kết nối (${err.response?.status ?? 'mạng'}).`;
  }
  return err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải dữ liệu.';
}

 
export default function SpeakingPracticePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  /** When true, start a fresh attempt — don't load the existing submission. */
  const isRedo = searchParams.get('redo') === 'true';
  /** Track whether this is the very first upload of a redo session
   *  (so we pass forceNew=true only once, on the first backend call). */
  const isFirstRedoUploadRef = useRef(true);

  // Data
  const [test, setTest] = useState<SpeakingTestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-question audio answers: questionKey → AnswerEntry
  const [answers, setAnswers] = useState<Record<string, AnswerEntry>>({});
  // Set of question keys currently being uploaded to Cloudinary
  const [uploadingKeys, setUploadingKeys] = useState<Set<string>>(new Set());
  // Submission metadata
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<'Pending' | 'Graded' | null>(null);

  // Exam flow
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [currentPart, setCurrentPart] = useState<1 | 2 | 3>(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // TTS — extracted into reusable hook
  const { speak, cancel, isPlaying: isExaminerSpeaking } = useTextToSpeech({ lang: 'en-GB', rate: 0.95 });

  // Drag-over visual state for the current question's upload zone
  const [dragOver, setDragOver] = useState(false);

  // Keep a stable ref to answers so the unmount cleanup can revoke object URLs
  // without capturing a stale closure.
  const answersRef = useRef<Record<string, AnswerEntry>>({});
  useEffect(() => { answersRef.current = answers; }, [answers]);

  //  Load test + check for existing submission for this test  
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      if (!id) {
        setError('Thiếu mã đề Speaking.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const testData = await fetchSpeakingTestById(id, controller.signal);
        setTest(testData);

        // Populate per-question answers from existing submission
        // Skip this when the student explicitly chose to redo.
        if (!isRedo) {
          try {
            const res = await apiClient.get('/speaking/submissions/my-submissions', {
              signal: controller.signal,
            });
            const all = (res.data?.data ?? []) as any[];
            const existing = all.find(
              (s: any) => s.testId?._id === id || String(s.testId) === id,
            );
            if (existing) {
              setSubmissionId(existing._id);
              setSubmissionStatus(existing.status);
              // Hydrate answers from server (no local file, cloudUrl only)
              const loaded: Record<string, AnswerEntry> = {};
              for (const a of (existing.answers ?? [])) {
                loaded[a.questionKey] = { cloudUrl: a.audioUrl };
              }
              // Legacy fallback: single audioUrl submission
              if (!existing.answers?.length && existing.audioUrl) {
                loaded['legacy'] = { cloudUrl: existing.audioUrl };
              }
              setAnswers(loaded);
            }
          } catch {
            // No submission yet — that's fine
          }
        }
      } catch (err) {
        if (!axios.isCancel(err)) setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [id]);


  // Revoke all object URLs when the component unmounts to prevent memory leaks.
  useEffect(() => {
    return () => {
      Object.values(answersRef.current).forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
    };
  }, []); // runs once on mount/unmount only


  // Auto-play intentionally removed — TTS is manual-only (speaker icon).

  //  TTS 
  const getCurrentQuestionText = (): string => {
    if (!test) return '';
    if (currentPart === 1) return test.part1[currentQuestionIndex] ?? '';
    // Part 2: speak the raw topic text — no redundant "Cue card topic:" prefix
    if (currentPart === 2) return test.part2;
    return test.part3[currentQuestionIndex] ?? '';
  };

  //  Navigation 
  const isAtLastQuestion = (): boolean => {
    if (!test) return false;
    if (currentPart === 1) return currentQuestionIndex >= test.part1.length - 1;
    if (currentPart === 2) return false; // always has "next" to Part 3
    return currentQuestionIndex >= test.part3.length - 1;
  };

  const handleNextQuestion = () => {
    cancel(); // stop any in-progress TTS before advancing
    if (!test) return;

    if (currentPart === 1 && currentQuestionIndex < test.part1.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else if (currentPart === 1) {
      setCurrentPart(2);
      setCurrentQuestionIndex(0);
    } else if (currentPart === 2) {
      setCurrentPart(3);
      setCurrentQuestionIndex(0);
    } else if (currentPart === 3 && currentQuestionIndex < test.part3.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else if (currentPart === 3 && isAtLastQuestion()) {
      // Last question of Part 3 — finish the exam
      toast.success('Bạn đã hoàn thành bài thi Speaking!');
      navigate('/history');
    }
  };

  const handleTabChange = (part: 1 | 2 | 3) => {
    cancel(); // stop any in-progress TTS before switching part
    setCurrentPart(part);
    setCurrentQuestionIndex(0);
  };

  //  Cloudinary + Per-question submit 
  const uploadToCloudinary = async (file: File): Promise<string> => {
    const sigRes = await apiClient.get('/media/generate-signature', {
      params: { folderName: 'ielts_platform/speaking' },
    });
    const sig = (sigRes.data?.data ?? sigRes.data) as Record<string, string>;
    const { signature, timestamp, cloud_name, api_key, folder } = sig;
    if (!signature || !timestamp || !cloud_name || !api_key || !folder) {
      throw new Error('Không nhận được chữ ký Cloudinary hợp lệ.');
    }
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', api_key);
    form.append('timestamp', String(timestamp));
    form.append('signature', signature);
    form.append('folder', folder);
    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloud_name}/video/upload`,
      form,
    );
    const url = res.data?.secure_url as string | undefined;
    if (!url) throw new Error('Cloudinary không trả về URL.');
    return url;
  };

  /**
   * Upload the selected file for a specific question key, then persist the full
   * answers map to the backend (upsert). Using the current `answers` ref to build
   * the payload avoids stale closure issues across concurrent uploads.
   */
  const handleFileSelectedForKey = async (qKey: string, file: File) => {
    if (!id) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Chỉ chấp nhận file âm thanh (.mp3, .wav, .m4a, .ogg...)');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error('File quá lớn. Vui lòng chọn file dưới 100 MB.');
      return;
    }

    // Revoke any existing object URL for this question slot.
    const existingEntry = answers[qKey];
    if (existingEntry?.previewUrl) URL.revokeObjectURL(existingEntry.previewUrl);

    const previewUrl = URL.createObjectURL(file);
    // Optimistically set the entry with empty cloudUrl while uploading.
    setAnswers((prev) => ({ ...prev, [qKey]: { file, previewUrl, cloudUrl: '' } }));
    setUploadingKeys((prev) => new Set(prev).add(qKey));

    try {
      const cloudUrl = await uploadToCloudinary(file);

      // Build the full answers payload using the ref (latest state, not stale closure).
      const updatedAnswers = {
        ...answersRef.current,
        [qKey]: { file, previewUrl, cloudUrl },
      };
      const answersPayload = Object.entries(updatedAnswers)
        .filter(([, v]) => v.cloudUrl)
        .map(([key, v]) => ({ questionKey: key, audioUrl: v.cloudUrl }));

      const res = await apiClient.post(`/speaking/tests/${id}/attempt`, {
        answers: answersPayload,
        // On redo: force-create a new submission on the very first upload only.
        ...(isRedo && isFirstRedoUploadRef.current ? { forceNew: true } : {}),
      });
      const sub = (res.data?.data ?? res.data) as { _id: string; status: 'Pending' | 'Graded' };
      // After the first upload in a redo, subsequent uploads update the NEW submission.
      isFirstRedoUploadRef.current = false;

      setAnswers((prev) => ({ ...prev, [qKey]: { file, previewUrl, cloudUrl } }));
      setSubmissionId(sub._id);
      setSubmissionStatus('Pending');
      toast.success('Ghi âm câu này đã được lưu!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Không thể lưu bài ghi âm.');
      // Revert the optimistic entry if upload failed.
      setAnswers((prev) => {
        const next = { ...prev };
        if (!next[qKey]?.cloudUrl) delete next[qKey];
        return next;
      });
    } finally {
      setUploadingKeys((prev) => {
        const next = new Set(prev);
        next.delete(qKey);
        return next;
      });
    }
  };

  const handleDropForKey = (e: React.DragEvent<HTMLLabelElement>, qKey: string) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelectedForKey(qKey, file);
  };

  /** Remove the audio for a specific question and re-sync answers with the backend. */
  const handleRemoveAnswer = async (qKey: string) => {
    const entry = answers[qKey];
    if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl);

    const updated = { ...answersRef.current };
    delete updated[qKey];
    setAnswers(updated);

    if (!id) return;
    const payload = Object.entries(updated)
      .filter(([, v]) => v.cloudUrl)
      .map(([key, v]) => ({ questionKey: key, audioUrl: v.cloudUrl }));

    // If no answers remain, don't call the backend (empty submission meaningless).
    if (payload.length === 0) return;

    try {
      await apiClient.post(`/speaking/tests/${id}/attempt`, { answers: payload });
    } catch {
      // Non-critical: the backend will just keep the old entry. Silently ignore.
    }
  };

  //  Loading 
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
            <LoaderCircle className="h-7 w-7 animate-spin" />
          </div>
          <p className="text-base font-semibold text-slate-900">Đang tải đề Speaking...</p>
        </div>
      </div>
    );
  }

  //  Error 
  if (error || !test) {
    return (
      <div className="min-h-screen bg-white px-4 py-10 md:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-red-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-3 text-red-700">
            <AlertTriangle className="mt-1 h-5 w-5 text-red-500" />
            <div>
              <h1 className="text-xl font-bold">Không thể mở đề Speaking</h1>
              <p className="mt-2 text-sm">{error ?? 'Dữ liệu đề thi không hợp lệ.'}</p>
              <Link
                to="/speaking"
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại danh sách đề
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  //  Welcome screen 
  if (!isExamStarted) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Link
          to="/speaking"
          className="m-6 inline-flex w-fit items-center gap-2 text-sm font-semibold text-red-600 transition hover:text-red-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách đề
        </Link>

        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8 text-center">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-red-50 opacity-60 blur-xl" />
            <div className="relative">
              <AnimatedExaminer isSpeaking={false} size={160} />
            </div>
          </div>

          <div className="max-w-lg space-y-3">
            <h1 className="text-3xl font-bold text-slate-900">{test.title}</h1>
            <p className="text-lg leading-relaxed text-slate-500">
              Giám khảo AI sẽ đọc từng câu hỏi theo 3 phần. Hãy đảm bảo micro và loa đã sẵn sàng.
            </p>
          </div>

          <button
            onClick={() => setIsExamStarted(true)}
            className="mt-2 inline-flex items-center gap-3 rounded-2xl bg-red-600 px-10 py-4 text-lg font-bold text-white shadow-lg shadow-red-200 transition-all hover:bg-red-700 active:scale-95"
          >
            <Mic className="h-5 w-5" />
            Bắt đầu luyện tập
          </button>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {['Part 1: Interview', 'Part 2: Cue Card', 'Part 3: Discussion'].map((label) => (
              <span
                key={label}
                className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-600"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  //  Exam interface 
  return (
    <div
      className="flex min-h-screen flex-col bg-slate-50"
      style={{ fontFamily: '"Segoe UI", Tahoma, sans-serif' }}
    >
      <Toaster position="top-right" />

      {/*  Header  */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm md:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            to="/speaking"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden md:inline">Danh sách đề</span>
          </Link>
          <h1 className="line-clamp-1 text-base font-bold text-slate-800 md:text-xl">
            {test.title}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-100 p-1">
          {([1, 2, 3] as const).map((part) => (
            <button
              key={part}
              onClick={() => handleTabChange(part)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                currentPart === part
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'
              }`}
            >
              Part {part}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto max-w-4xl space-y-6">

          {/*  Examiner area  */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            {isExaminerSpeaking && (
              <div className="absolute left-0 top-0 h-1 w-full overflow-hidden bg-red-100">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-red-500" />
              </div>
            )}

            <div className="flex items-start gap-6">
              <div className="flex shrink-0 flex-col items-center gap-2">
                <AnimatedExaminer isSpeaking={isExaminerSpeaking} size={80} />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Examiner
                </span>
              </div>

              <div className="flex-1 rounded-2xl rounded-tl-none border border-slate-100 bg-slate-50 p-5 md:p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-700">
                    {currentPart === 2
                      ? 'Cue Card'
                      : `Part ${currentPart} — Câu ${currentQuestionIndex + 1}`}
                  </span>
                  <button
                    onClick={() => speak(getCurrentQuestionText())}
                    className={`shrink-0 transition ${
                      isExaminerSpeaking
                        ? 'animate-pulse text-red-600'
                        : 'text-slate-400 hover:text-red-600'
                    }`}
                    title={isExaminerSpeaking ? 'Đang đọc câu hỏi...' : 'Nghe lại câu hỏi'}
                  >
                    <Volume2 className="h-5 w-5" />
                  </button>
                </div>

                {/* Part 2: show only the structured cue-card box — no plain-text duplicate */}
                {currentPart === 2 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">
                      Chủ đề
                    </p>
                    <p className="mt-2 text-base leading-8 text-slate-800">{test.part2}</p>
                    <div className="mt-4 space-y-1 text-sm text-slate-500">
                      <p>&#9203; 1 phút chuẩn bị bài nói</p>
                      <p>&#127908; 1–2 phút phát biểu</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xl font-medium leading-relaxed text-slate-800">
                    {getCurrentQuestionText()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/*  Navigation + progress  */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            {/* Progress indicator */}
            {(() => {
              const total = test
                ? test.part1.length + 1 + test.part3.length
                : 0;
              const done = Object.values(answers).filter((a) => a.cloudUrl).length;
              return (
                <div className="flex items-center gap-2">
                  {done > 0 && done === total ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {done}/{total}
                    </span>
                  )}
                  <span className="text-sm font-medium text-slate-500">
                    {done === total && total > 0
                      ? 'Tất cả câu đã ghi âm'
                      : `${done}/${total} câu đã ghi âm`}
                  </span>
                </div>
              );
            })()}

            <button
              onClick={handleNextQuestion}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700"
            >
              {currentPart === 3 && isAtLastQuestion()
                ? 'Hoàn thành bài thi'
                : 'Câu hỏi tiếp theo'}
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/*  Per-question audio upload  */}
          {(() => {
            const qKey = getQuestionKey(currentPart, currentQuestionIndex);
            const entry = answers[qKey];
            const isUploading = uploadingKeys.has(qKey);
            const audioSrc = entry?.previewUrl ?? entry?.cloudUrl;

            return (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
                      Audio Submission
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900">
                      {currentPart === 2 ? 'Ghi âm (Part 2)' : `Ghi âm câu ${currentQuestionIndex + 1} — Part ${currentPart}`}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Ghi âm riêng từng câu. Mỗi câu được lưu độc lập — tối đa 100 MB.
                    </p>
                  </div>

                  {entry?.cloudUrl ? (
                    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      ✓ Đã lưu audio
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                      Chưa ghi âm
                    </span>
                  )}
                </div>

                {/* Upload zone — always visible so user can re-record */}
                <label
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => handleDropForKey(e, qKey)}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[22px] border-2 border-dashed px-6 py-8 text-center transition ${
                    dragOver
                      ? 'border-red-400 bg-red-50'
                      : 'border-slate-200 bg-slate-50 hover:border-red-300 hover:bg-red-50/30'
                  }`}
                >
                  <div className="rounded-2xl bg-red-50 p-4 text-red-600">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {dragOver ? 'Thả file vào đây...' : entry?.cloudUrl ? 'Ghi âm lại câu này' : 'Kéo thả hoặc nhấn để chọn file âm thanh'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Hỗ trợ .mp3 · .wav · .m4a · .ogg — tối đa 100 MB
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelectedForKey(qKey, f);
                      // Reset input so re-selecting the same file triggers onChange
                      e.target.value = '';
                    }}
                    disabled={isUploading}
                  />
                </label>

                {/* Playback + remove */}
                {audioSrc && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2 font-semibold text-slate-800">
                        <FileAudio className="h-4 w-4 shrink-0 text-red-500" />
                        <span className="truncate">
                          {entry?.file?.name || 'Bản ghi âm đã lưu'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAnswer(qKey)}
                        disabled={isUploading}
                        title="Xóa ghi âm câu này"
                        className="shrink-0 rounded-xl border border-red-200 bg-white p-1.5 text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <audio controls src={audioSrc} className="mt-3 w-full" />
                  </div>
                )}

                {isUploading && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                    <LoaderCircle className="h-4 w-4 animate-spin text-red-600" />
                    <CloudUpload className="h-4 w-4 text-red-600" />
                    Đang lưu bài ghi âm...
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
}

