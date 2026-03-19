import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, CircleX, Trophy, ArrowLeft } from 'lucide-react';

type AttemptDetail = {
  questionIndex: number;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
};

type AttemptPayload = {
  _id: string;
  rawScore: number;
  bandScore: number;
  details: AttemptDetail[];
  testId?: { title?: string } | string;
};

type LocationState = {
  attempt?: AttemptPayload;
  module?: 'Reading' | 'Listening';
};

const SCORE_COLORS = {
  primary: '#E31837',
  light: '#FEF2F2',
};

const loadFromSession = (): LocationState => {
  try {
    const raw = sessionStorage.getItem('latestAttemptResult');
    if (!raw) return {};
    return JSON.parse(raw) as LocationState;
  } catch {
    return {};
  }
};

const getTestTitle = (attempt?: AttemptPayload) => {
  if (!attempt?.testId) return 'IELTS Test Result';
  if (typeof attempt.testId === 'string') return 'IELTS Test Result';
  return attempt.testId.title || 'IELTS Test Result';
};

export default function ResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || loadFromSession();
  const attempt = state.attempt;
  const moduleLabel = state.module || 'Reading';

  const sortedDetails = useMemo(() => {
    if (!attempt?.details) return [];
    return [...attempt.details].sort((a, b) => a.questionIndex - b.questionIndex);
  }, [attempt?.details]);

  if (!attempt) {
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border border-red-100 bg-white p-10 text-center shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Không có dữ liệu kết quả</h1>
        <p className="mt-3 text-slate-500">Vui lòng nộp bài để xem trang kết quả chi tiết.</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#E31837] px-5 py-3 font-semibold text-white transition hover:bg-[#c9142f]"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại Dashboard
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[30px] border border-red-100 bg-[linear-gradient(135deg,#ffffff_0%,#fff5f6_50%,#fff0f2_100%)] p-6 shadow-[0_20px_60px_rgba(127,29,29,0.08)] sm:p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
            <Trophy className="h-3.5 w-3.5" />
            {moduleLabel} Result
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{getTestTitle(attempt)}</h1>

          <div
            className="flex h-44 w-44 items-center justify-center rounded-full border-8 text-white shadow-xl"
            style={{ borderColor: SCORE_COLORS.light, backgroundColor: SCORE_COLORS.primary }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-100">Band</p>
              <p className="mt-1 text-5xl font-black leading-none">{Number(attempt.bandScore || 0).toFixed(1)}</p>
            </div>
          </div>

          <p className="text-lg font-bold text-slate-900">
            Raw score: <span className="text-[#E31837]">{attempt.rawScore}/{sortedDetails.length || 40}</span>
          </p>
        </div>
      </div>

      <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-900">Detailed Review</h2>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {sortedDetails.map((detail) => (
            <article
              key={`detail-${detail.questionIndex}`}
              className={`rounded-2xl border p-4 shadow-sm ${
                detail.isCorrect
                  ? 'border-emerald-100 bg-emerald-50/70'
                  : 'border-red-100 bg-red-50/70'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-black text-slate-900">Question {detail.questionIndex}</p>
                {detail.isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <CircleX className="h-4 w-4 text-red-600" />
                )}
              </div>

              {detail.isCorrect ? (
                <p className="text-sm font-semibold text-emerald-700">
                  Your answer: {detail.studentAnswer || '(blank)'}
                </p>
              ) : (
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-red-700">
                    Your answer:{' '}
                    <span className="line-through">{detail.studentAnswer || '(blank)'}</span>
                  </p>
                  <p className="font-semibold text-emerald-700">Correct: {detail.correctAnswer || '(blank)'}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}