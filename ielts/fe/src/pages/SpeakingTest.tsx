import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  CheckCircle2,
  CircleHelp,
  CloudUpload,
  FileAudio,
  LoaderCircle,
  Mic,
  Upload,
} from 'lucide-react';
import { useUserStore } from '../store/useUserStore';

type SpeakingStatus = 'Pending' | 'Graded';

interface SpeakingSubmission {
  _id: string;
  studentId: string;
  questions: string[];
  audioUrl: string;
  status: SpeakingStatus;
  createdAt: string;
}

interface QuestionParts {
  part1: string[];
  part2: string[];
  part3: string[];
}

const API_BASE = 'http://localhost:3000';

const getToken = (fallbackToken: string | null) =>
  fallbackToken || localStorage.getItem('token') || localStorage.getItem('accessToken') || '';

const splitQuestionsIntoParts = (questions: string[]): QuestionParts => {
  const parts: QuestionParts = { part1: [], part2: [], part3: [] };

  const hasPartPrefix = questions.some((question) => /^\s*part\s*[123]\b/i.test(question));

  if (hasPartPrefix) {
    questions.forEach((question) => {
      const clean = String(question || '').trim();
      const match = clean.match(/^\s*part\s*([123])\s*[:\-.]?\s*(.*)$/i);

      if (!match) {
        parts.part1.push(clean);
        return;
      }

      const part = Number(match[1]);
      const text = match[2] || clean;

      if (part === 1) parts.part1.push(text);
      if (part === 2) parts.part2.push(text);
      if (part === 3) parts.part3.push(text);
    });

    return parts;
  }

  if (questions.length <= 3) {
    parts.part1 = questions;
    return parts;
  }

  if (questions.length === 4) {
    parts.part1 = questions.slice(0, 3);
    parts.part2 = questions.slice(3, 4);
    return parts;
  }

  parts.part1 = questions.slice(0, 3);
  parts.part2 = questions.slice(3, 4);
  parts.part3 = questions.slice(4);

  return parts;
};

function PartCard({ title, questions }: { title: string; questions: string[] }) {
  return (
    <div className="rounded-[26px] border border-red-100 bg-white p-5 shadow-sm">
      <div className="mb-4 inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-600">
        {title}
      </div>

      {questions.length === 0 ? (
        <p className="text-sm text-slate-400">Chưa có câu hỏi cho phần này.</p>
      ) : (
        <ol className="space-y-3 pl-4 text-sm leading-7 text-slate-700 marker:font-semibold marker:text-red-500">
          {questions.map((question, index) => (
            <li key={`${title}-${index}`}>{question}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function SpeakingTest() {
  const { token } = useUserStore();
  const [submission, setSubmission] = useState<SpeakingSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const questionParts = useMemo(
    () => splitQuestionsIntoParts(submission?.questions || []),
    [submission],
  );

  const fetchMyPendingTest = async () => {
    if (!getToken(token)) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.get(`${API_BASE}/api/speaking/my-pending`, {
        headers: {
          Authorization: `Bearer ${getToken(token)}`,
        },
      });

      setSubmission(response.data?.data ?? response.data);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setSubmission(null);
      } else {
        console.error('Failed to load pending speaking test:', error);
        toast.error(error.response?.data?.message || 'Không thể tải đề Speaking.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPendingTest();
  }, [token]);

  const uploadAudioToCloudinary = async (file: File) => {
    const sigRes = await axios.get(`${API_BASE}/api/media/generate-signature`, {
      params: { folderName: 'ielts_platform/speaking' },
      headers: {
        Authorization: `Bearer ${getToken(token)}`,
      },
    });

    const signatureData = sigRes.data?.data ?? sigRes.data;
    const signature = signatureData?.signature;
    const timestamp = signatureData?.timestamp;
    const cloudName = signatureData?.cloud_name;
    const apiKey = signatureData?.api_key;
    const folder = signatureData?.folder;

    if (!signature || !timestamp || !cloudName || !apiKey || !folder) {
      throw new Error('Không nhận được thông tin chữ ký Cloudinary hợp lệ');
    }

    const cloudFormData = new FormData();
    cloudFormData.append('file', file);
    cloudFormData.append('api_key', apiKey);
    cloudFormData.append('timestamp', String(timestamp));
    cloudFormData.append('signature', signature);
    cloudFormData.append('folder', folder);

    const cloudinaryUploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;
    const cloudRes = await axios.post(cloudinaryUploadUrl, cloudFormData);

    const secureUrl = cloudRes.data?.secure_url;
    if (!secureUrl) {
      throw new Error('Cloudinary không trả về secure_url');
    }

    return secureUrl;
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);

    if (!file || !submission) return;

    try {
      setIsUploading(true);

      const secureUrl = await uploadAudioToCloudinary(file);

      await axios.put(
        `${API_BASE}/api/speaking/${submission._id}/submit`,
        { audioUrl: secureUrl },
        {
          headers: {
            Authorization: `Bearer ${getToken(token)}`,
          },
        },
      );

      toast.success('Nộp bài nói thành công. Giáo viên sẽ chấm sớm nhất có thể.');
      setSubmission((prev) => (prev ? { ...prev, audioUrl: secureUrl } : prev));
    } catch (error: any) {
      console.error('Failed to upload speaking audio:', error);
      toast.error(error.response?.data?.message || error.message || 'Không thể nộp bài nói.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-[30px] border border-red-100 bg-white">
        <div className="flex items-center gap-3 text-red-600">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <span className="font-semibold">Đang tải đề Speaking...</span>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <Toaster position="top-right" />

      <div className="overflow-hidden rounded-[30px] border border-red-100 bg-[linear-gradient(135deg,#fff7f7_0%,#ffffff_48%,#f8fafc_100%)] shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="border-b border-red-100 bg-white/85 px-6 py-6 backdrop-blur sm:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-600">
                <Mic className="h-3.5 w-3.5" />
                Speaking Test
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">IELTS Speaking Assignment</h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-500">
                Đọc kỹ các câu hỏi được giáo viên giao theo 3 phần, sau đó tải lên bản ghi âm MP3/WAV để hoàn tất bài nói.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchMyPendingTest}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <CircleHelp className="h-4 w-4" />
              Làm mới đề
            </button>
          </div>
        </div>

        <div className="space-y-5 px-4 py-6 sm:px-6 lg:px-8">
          {!submission ? (
            <div className="rounded-[26px] border border-dashed border-red-200 bg-white px-6 py-14 text-center">
              <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-500" />
              <p className="text-lg font-bold text-slate-900">Hiện chưa có đề Speaking đang chờ bạn nộp</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Khi giáo viên giao bài mới, nội dung sẽ xuất hiện tại đây cùng khu vực tải file ghi âm.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <PartCard title="Part 1" questions={questionParts.part1} />
                <PartCard title="Part 2" questions={questionParts.part2} />
                <PartCard title="Part 3" questions={questionParts.part3} />
              </div>

              <div className="rounded-[26px] border border-red-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Audio Submission</p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900">Tải lên bài ghi âm của bạn</h3>
                  </div>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      submission.audioUrl
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                    }`}
                  >
                    {submission.audioUrl ? 'Đã nộp audio' : 'Chưa nộp audio'}
                  </span>
                </div>

                <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[22px] border border-dashed border-red-200 bg-[linear-gradient(180deg,#fff9f9_0%,#ffffff_100%)] px-6 py-10 text-center transition hover:border-red-300">
                  <div className="rounded-2xl bg-red-50 p-4 text-red-600">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Chọn file âm thanh (.mp3, .wav, .m4a)</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Hệ thống sẽ upload trực tiếp lên Cloudinary và tự động nộp bài cho bạn.
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
                  <div className="mt-4 rounded-2xl border border-red-100 bg-red-50/40 px-4 py-3 text-sm text-slate-700">
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
                  <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <CloudUpload className="h-4 w-4" />
                    Đang upload và nộp bài nói...
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
