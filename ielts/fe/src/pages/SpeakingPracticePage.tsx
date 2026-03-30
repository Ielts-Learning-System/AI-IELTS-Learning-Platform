import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  CloudUpload,
  FileAudio,
  LoaderCircle,
  Mic,
  Square,
  Upload,
  Volume2,
} from 'lucide-react';
import { fetchSpeakingTestById, type SpeakingTestDetail } from '../api/speaking.api';
import { apiClient } from '../lib/api/client';


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


interface PendingSubmission {
  _id: string;
  audioUrl?: string;
  status: 'Pending' | 'Graded';
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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

 
export default function SpeakingPracticePage() {
  const { id } = useParams<{ id: string }>();

  // Data
  const [test, setTest] = useState<SpeakingTestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<PendingSubmission | null>(null);

  // Exam flow
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [currentPart, setCurrentPart] = useState<1 | 2 | 3>(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isExaminerSpeaking, setIsExaminerSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  //  Load test + pending submission in parallel 
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

        const [testResult, submissionResult] = await Promise.allSettled([
          fetchSpeakingTestById(id, controller.signal),
          apiClient.get('/speaking/my-pending', { signal: controller.signal }),
        ]);

        if (testResult.status === 'fulfilled') {
          setTest(testResult.value);
        } else if (!axios.isCancel(testResult.reason)) {
          setError(getErrorMessage(testResult.reason));
        }

        if (submissionResult.status === 'fulfilled') {
          const body = submissionResult.value.data as any;
          setSubmission(body?.data ?? body ?? null);
        }
        // 404 on my-pending is normal (no teacher assignment) - silently ignore
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [id]);

  //  Recording timer 
  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return;
    }
    const interval = setInterval(() => setRecordingSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  //  TTS 
  const getCurrentQuestionText = (): string => {
    if (!test) return '';
    if (currentPart === 1) return test.part1[currentQuestionIndex] ?? '';
    if (currentPart === 2) return `Cue card topic: ${test.part2}`;
    return test.part3[currentQuestionIndex] ?? '';
  };

  const speakQuestion = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const ukVoice = voices.find((v) => v.lang.includes('en-GB'));
    if (ukVoice) utterance.voice = ukVoice;
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => setIsExaminerSpeaking(true);
    utterance.onend = () => setIsExaminerSpeaking(false);
    utterance.onerror = () => setIsExaminerSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!isExamStarted) return;
    const text = getCurrentQuestionText();
    if (!text) return;
    const timer = setTimeout(() => speakQuestion(text), 500);
    return () => {
      clearTimeout(timer);
      window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPart, currentQuestionIndex, isExamStarted]);

  //  Navigation 
  const isAtLastQuestion = (): boolean => {
    if (!test) return false;
    if (currentPart === 1) return currentQuestionIndex >= test.part1.length - 1;
    if (currentPart === 2) return false; // always has "next" to Part 3
    return currentQuestionIndex >= test.part3.length - 1;
  };

  const handleNextQuestion = () => {
    window.speechSynthesis.cancel();
    setIsRecording(false);
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
    }
  };

  const handleTabChange = (part: 1 | 2 | 3) => {
    window.speechSynthesis.cancel();
    setCurrentPart(part);
    setCurrentQuestionIndex(0);
    setIsRecording(false);
  };

  //  Cloudinary + Submit 
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

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (!file || !submission) return;

    try {
      setIsUploading(true);
      const audioUrl = await uploadToCloudinary(file);
      await apiClient.put(`/speaking/${submission._id}/submit`, { audioUrl });
      toast.success('Nộp bài nói thành công! Giáo viên sẽ chấm sớm nhất có thể.');
      setSubmission((prev) => (prev ? { ...prev, audioUrl } : prev));
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Không thể nộp bài nói.',
      );
    } finally {
      setIsUploading(false);
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
                    onClick={() => speakQuestion(getCurrentQuestionText())}
                    className="shrink-0 text-slate-400 transition hover:text-red-600"
                    title="Nghe lại câu hỏi"
                  >
                    <Volume2 className="h-5 w-5" />
                  </button>
                </div>

                <p className="text-xl font-medium leading-relaxed text-slate-800">
                  {getCurrentQuestionText()}
                </p>

                {currentPart === 2 && (
                  <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">
                      Chủ đề
                    </p>
                    <p className="mt-2 text-base leading-8 text-slate-800">{test.part2}</p>
                    <div className="mt-4 space-y-1 text-sm text-slate-500">
                      <p>&#9203; 1 phút chuẩn bị bài nói</p>
                      <p>&#127908; 1–2 phút phát biểu</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/*  User recording area  */}
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">Your Turn</h2>

            <p className="text-sm font-medium text-slate-500">
              {isExaminerSpeaking
                ? 'Đang nghe giám khảo đọc câu hỏi...'
                : isRecording
                ? 'Đang ghi âm câu trả lời của bạn...'
                : 'Bấm vào Micro để bắt đầu trả lời'}
            </p>

            <button
              onClick={() => setIsRecording((prev) => !prev)}
              disabled={isExaminerSpeaking}
              className={`flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition-all ${
                isExaminerSpeaking
                  ? 'cursor-not-allowed bg-slate-200 text-slate-400 shadow-none'
                  : isRecording
                  ? 'animate-pulse bg-red-500 text-white shadow-red-200 hover:bg-red-600'
                  : 'bg-slate-800 text-white shadow-slate-200 hover:bg-slate-900'
              }`}
            >
              {isRecording ? (
                <Square className="h-8 w-8 fill-current" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </button>

            {isRecording && (
              <div className="font-mono text-2xl font-bold text-red-600">
                {formatTime(recordingSeconds)}
              </div>
            )}

            {!isRecording && !isExaminerSpeaking && (
              <button
                onClick={handleNextQuestion}
                disabled={currentPart === 3 && isAtLastQuestion()}
                className="mt-2 flex items-center gap-2 rounded-xl bg-red-600 px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {currentPart === 3 && isAtLastQuestion()
                  ? 'Hoàn thành bài thi'
                  : 'Câu hỏi tiếp theo'}
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>

          {/*  Audio submission area  */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
                  Audio Submission
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  Tải lên bài ghi âm của bạn
                </h3>
              </div>

              {submission ? (
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    submission.audioUrl
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                  }`}
                >
                  {submission.audioUrl ? 'Đã nộp audio' : 'Chưa nộp audio'}
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                  Luyện tập tự do
                </span>
              )}
            </div>

            {submission ? (
              <>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[22px] border border-dashed border-red-200 bg-slate-50 px-6 py-10 text-center transition hover:border-red-300 hover:bg-red-50/30">
                  <div className="rounded-2xl bg-red-50 p-4 text-red-600">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      Chọn file âm thanh (.mp3, .wav, .m4a)
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Hệ thống sẽ upload lên Cloudinary và tự động nộp bài cho bạn.
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleFileSelected}
                    disabled={isUploading}
                  />
                </label>

                {(selectedFile || submission.audioUrl) && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                      <FileAudio className="h-4 w-4 text-red-500" />
                      {selectedFile?.name || 'Bản ghi âm đã nộp'}
                    </div>
                    {submission.audioUrl && (
                      <audio controls src={submission.audioUrl} className="mt-3 w-full" />
                    )}
                  </div>
                )}

                {isUploading && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                    <LoaderCircle className="h-4 w-4 animate-spin text-red-600" />
                    <CloudUpload className="h-4 w-4 text-red-600" />
                    Đang upload và nộp bài nói...
                  </div>
                )}
              </>
            ) : null}

            {!submission && (
              <div className="rounded-[22px] border border-dashed border-blue-200 bg-blue-50/40 px-6 py-6 text-center">
                <p className="font-semibold text-slate-800">
                  Bạn đang ở chế độ luyện tập tự do.
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Muốn nộp bài để giáo viên chấm, vui lòng vào mục bài tập được giao.
                </p>
                <Link
                  to="/speaking/assignment"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                >
                  Mở trang bài tập được giao
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}


