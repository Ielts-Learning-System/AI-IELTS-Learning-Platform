import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  FileUp,
  Headphones,
  Mic,
  PlusCircle,
  Rocket,
  Search,
  Trash2,
  UploadCloud,
  BookOpen,
  PencilLine,
} from 'lucide-react';
import { apiClient } from '../../lib/api/client';
import {
  createTeacherExam,
  deleteTeacherExam,
  fetchMonitoringAttempts,
  fetchTeacherAttemptDetail,
  fetchTeacherExams,
  gradeTeacherAttempt,
  orchestrateExamFromPdf,
  publishTeacherExam,
  type ExamItem,
  type MonitoringAttempt,
  type SkillType,
  type TeacherAttemptDetail,
} from '../../api/exam.api';

type OptionItem = { _id: string; title: string };

interface BuilderForm {
  title: string;
  description: string;
  durationMinutes: number;
  globalLimitHours: number;
  publish: boolean;
  readingId: string;
  listeningId: string;
  writingId: string;
  speakingId: string;
}

const initialForm: BuilderForm = {
  title: '',
  description: '',
  durationMinutes: 165,
  globalLimitHours: 24,
  publish: false,
  readingId: '',
  listeningId: '',
  writingId: '',
  speakingId: '',
};

async function fetchSkillOptions() {
  const [reading, listening, writing, speaking] = await Promise.all([
    apiClient.get('/reading'),
    apiClient.get('/listening'),
    apiClient.get('/writing'),
    apiClient.get('/speaking/tests'),
  ]);

  const normalize = (raw: any): OptionItem[] => {
    const list = raw?.data?.data || raw?.data || [];
    return (Array.isArray(list) ? list : []).map((item: any) => ({
      _id: String(item._id),
      title: String(item.title || item.name || `Test ${item._id}`),
    }));
  };

  return {
    reading: normalize(reading),
    listening: normalize(listening),
    writing: normalize(writing),
    speaking: normalize(speaking),
  };
}

export default function MockExamBuilderPage() {
  const [form, setForm] = useState<BuilderForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [orchestrating, setOrchestrating] = useState(false);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [monitoringAttempts, setMonitoringAttempts] = useState<MonitoringAttempt[]>([]);
  const [gradingDetail, setGradingDetail] = useState<TeacherAttemptDetail | null>(null);
  const [gradingAttemptId, setGradingAttemptId] = useState('');
  const [detailSearchQuestion, setDetailSearchQuestion] = useState('');

  const [readingOptions, setReadingOptions] = useState<OptionItem[]>([]);
  const [listeningOptions, setListeningOptions] = useState<OptionItem[]>([]);
  const [writingOptions, setWritingOptions] = useState<OptionItem[]>([]);
  const [speakingOptions, setSpeakingOptions] = useState<OptionItem[]>([]);

  const [fullExamPdf, setFullExamPdf] = useState<File | null>(null);
  const [answerKeyPdf, setAnswerKeyPdf] = useState<File | null>(null);

  const canCreateBySelection = useMemo(() => {
    return Boolean(
      form.title.trim() && form.readingId && form.listeningId && form.writingId && form.speakingId
    );
  }, [form]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [options, teacherExams] = await Promise.all([fetchSkillOptions(), fetchTeacherExams()]);
        const monitoring = await fetchMonitoringAttempts();
        setReadingOptions(options.reading);
        setListeningOptions(options.listening);
        setWritingOptions(options.writing);
        setSpeakingOptions(options.speaking);
        setExams(teacherExams);
        setMonitoringAttempts(monitoring);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Không thể tải dữ liệu builder.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const refreshTeacherExams = async () => {
    const [data, monitoring] = await Promise.all([fetchTeacherExams(), fetchMonitoringAttempts()]);
    setExams(data);
    setMonitoringAttempts(monitoring);
  };

  const openGradingContext = async (attemptId: string) => {
    try {
      const detail = await fetchTeacherAttemptDetail(attemptId);
      setGradingDetail(detail);
      setGradingAttemptId(attemptId);
      toast.success('Đã tải grading context.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải grading context.');
    }
  };

  const handleMarkGraded = async () => {
    if (!gradingAttemptId) return;
    try {
      const result = await gradeTeacherAttempt(gradingAttemptId, {});
      const completed = Boolean(result?.completed);
      toast.success(
        completed
          ? 'Đã đồng bộ chấm điểm và cập nhật overall band.'
          : 'Đã đồng bộ trạng thái. Writing/Speaking vẫn chưa chấm đủ.'
      );

      const refreshed = await fetchTeacherAttemptDetail(gradingAttemptId);
      setGradingDetail(refreshed);
      await refreshTeacherExams();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể đồng bộ grading.');
    }
  };

  const getSkillCardColor = (skillType: SkillType) => {
    if (skillType === 'reading') return 'border-blue-100 bg-blue-50/50 text-blue-700';
    if (skillType === 'listening') return 'border-red-100 bg-red-50/50 text-red-700';
    if (skillType === 'writing') return 'border-amber-100 bg-amber-50/60 text-amber-700';
    return 'border-purple-100 bg-purple-50/60 text-purple-700';
  };

  const skillIcon = (skillType: SkillType) => {
    if (skillType === 'reading') return <BookOpen className="h-4 w-4" />;
    if (skillType === 'listening') return <Headphones className="h-4 w-4" />;
    if (skillType === 'writing') return <PencilLine className="h-4 w-4" />;
    return <Mic className="h-4 w-4" />;
  };

  const readSkillExternal = (skillType: SkillType) => {
    const skill = gradingDetail?.skills.find((item) => item.skillType === skillType);
    const external = (skill?.gradingMetadata?.externalResult || {}) as Record<string, any>;
    return { skill, external };
  };

  const resolvedOverallBand =
    gradingDetail?.overallBand ?? gradingDetail?.overallBandScores?.overall ?? null;

  const formatSkillStatus = (status?: string) => {
    if (!status) return 'N/A';
    if (status === 'NOT_STARTED') return 'Chưa bắt đầu';
    if (status === 'IN_PROGRESS') return 'Đang làm';
    if (status === 'SUBMITTED') return 'Đã nộp';
    if (status === 'EXPIRED') return 'Hết giờ';
    if (status === 'GRADED') return 'Đã chấm';
    return status;
  };

  const handleCreateFromSelection = async () => {
    if (!canCreateBySelection) return;

    try {
      setLoading(true);
      await createTeacherExam({
        title: form.title,
        description: form.description,
        durationMinutes: form.durationMinutes,
        globalLimitHours: form.globalLimitHours,
        publish: form.publish,
        skillRefs: {
          readingId: form.readingId,
          listeningId: form.listeningId,
          writingId: form.writingId,
          speakingId: form.speakingId,
        },
      });
      toast.success('Đã tạo full exam thành công.');
      setForm(initialForm);
      await refreshTeacherExams();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tạo full exam.');
    } finally {
      setLoading(false);
    }
  };

  const handleOrchestratePdf = async () => {
    if (!fullExamPdf || !answerKeyPdf) {
      toast.error('Vui lòng upload đủ 2 file PDF (đề + đáp án).');
      return;
    }

    try {
      setOrchestrating(true);
      await orchestrateExamFromPdf({
        fullExamPdf,
        answerKeyPdf,
        title: form.title || undefined,
        description: form.description || undefined,
        durationMinutes: form.durationMinutes,
        globalLimitHours: form.globalLimitHours,
        publish: form.publish,
      });

      toast.success('Orchestration thành công: đã tách và tạo đủ 4 skill + full exam.');
      setFullExamPdf(null);
      setAnswerKeyPdf(null);
      setForm(initialForm);
      await refreshTeacherExams();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Orchestration PDF thất bại.');
    } finally {
      setOrchestrating(false);
    }
  };

  const handlePublish = async (examId: string) => {
    try {
      await publishTeacherExam(examId);
      toast.success('Đã publish full exam.');
      await refreshTeacherExams();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể publish exam.');
    }
  };

  const handleDeleteExam = async (examId: string) => {
    try {
      await deleteTeacherExam(examId);
      toast.success('Đã xóa mock test.');
      await refreshTeacherExams();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể xóa mock test.');
    }
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Mock Exam Builder</h1>
        <p className="mt-2 text-slate-600">
          Tạo Full IELTS Mock Test bằng cách chọn sẵn test IDs hoặc orchestration từ 2 PDF.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            Option A - Builder From Existing Tests
          </h2>

          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Exam title"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          />

          <textarea
            className="w-full min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.durationMinutes}
              min={1}
              onChange={(e) => setForm((prev) => ({ ...prev, durationMinutes: Number(e.target.value || 165) }))}
            />
            <input
              type="number"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.globalLimitHours}
              min={1}
              onChange={(e) => setForm((prev) => ({ ...prev, globalLimitHours: Number(e.target.value || 24) }))}
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.publish}
              onChange={(e) => setForm((prev) => ({ ...prev, publish: e.target.checked }))}
            />
            Publish ngay sau khi tạo
          </label>

          <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.readingId} onChange={(e) => setForm((p) => ({ ...p, readingId: e.target.value }))}>
            <option value="">Select Reading Test</option>
            {readingOptions.map((item) => (
              <option key={item._id} value={item._id}>{item.title}</option>
            ))}
          </select>

          <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.listeningId} onChange={(e) => setForm((p) => ({ ...p, listeningId: e.target.value }))}>
            <option value="">Select Listening Test</option>
            {listeningOptions.map((item) => (
              <option key={item._id} value={item._id}>{item.title}</option>
            ))}
          </select>

          <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.writingId} onChange={(e) => setForm((p) => ({ ...p, writingId: e.target.value }))}>
            <option value="">Select Writing Test</option>
            {writingOptions.map((item) => (
              <option key={item._id} value={item._id}>{item.title}</option>
            ))}
          </select>

          <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.speakingId} onChange={(e) => setForm((p) => ({ ...p, speakingId: e.target.value }))}>
            <option value="">Select Speaking Test</option>
            {speakingOptions.map((item) => (
              <option key={item._id} value={item._id}>{item.title}</option>
            ))}
          </select>

          <button
            onClick={handleCreateFromSelection}
            disabled={!canCreateBySelection || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Rocket className="h-4 w-4" />
            Create Full Exam
          </button>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Option B - AI PDF Orchestration
          </h2>

          <label className="block rounded-xl border border-dashed border-slate-300 p-4 text-sm">
            <span className="mb-2 block text-slate-700">Full IELTS PDF (4 skills)</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFullExamPdf(e.target.files?.[0] || null)}
            />
          </label>

          <label className="block rounded-xl border border-dashed border-slate-300 p-4 text-sm">
            <span className="mb-2 block text-slate-700">Answer Key PDF</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setAnswerKeyPdf(e.target.files?.[0] || null)}
            />
          </label>

          <button
            onClick={handleOrchestratePdf}
            disabled={orchestrating}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            <UploadCloud className="h-4 w-4" />
            {orchestrating ? 'Đang orchestration...' : 'Upload + Orchestrate'}
          </button>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Preview / Publish</h2>

        {exams.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có full exam nào.</p>
        ) : (
          <div className="space-y-3">
            {exams.map((exam) => (
              <div key={exam._id} className="rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{exam.title}</p>
                  <p className="text-sm text-slate-500">Status: {exam.status}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
                    disabled={exam.status === 'PUBLISHED'}
                    onClick={() => handlePublish(exam._id)}
                  >
                    Publish
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
                    onClick={() => handleDeleteExam(exam._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Monitoring Dashboard</h2>
        {monitoringAttempts.length === 0 ? (
          <p className="text-sm text-slate-500">Không có attempt đang chạy/chờ chấm.</p>
        ) : (
          <div className="space-y-3">
            {monitoringAttempts.map((attempt) => (
              <div key={attempt._id} className="rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">Attempt: {attempt._id.slice(-8)}</p>
                  <p className="text-sm text-slate-600">User: {attempt.userId}</p>
                  <p className="text-sm text-slate-600">Status: {attempt.status}</p>
                  {attempt.activeSkill ? (
                    <p className="text-sm text-blue-700">
                      {attempt.activeSkill.skillType.toUpperCase()} - {Math.ceil(attempt.activeSkill.timeRemainingSeconds / 60)}m remaining
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(attempt.skillSummaries || []).map((summary) => (
                      <span
                        key={`${attempt._id}-${summary.skillType}`}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${getSkillCardColor(summary.skillType)}`}
                      >
                        {skillIcon(summary.skillType)}
                        {summary.skillType.toUpperCase()} · {formatSkillStatus(summary.status)}
                        {summary.band != null ? ` · Band ${Number(summary.band).toFixed(1)}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => openGradingContext(attempt._id)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                >
                  Open grading context
                </button>
              </div>
            ))}
          </div>
        )}
      </article>

      {gradingDetail ? (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Teacher Grading Context</h2>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Attempt status</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatSkillStatus(gradingDetail.status)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Reading</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {gradingDetail.overallBandScores?.reading != null
                  ? `Band ${Number(gradingDetail.overallBandScores.reading).toFixed(1)}`
                  : 'Chưa có'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Listening</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {gradingDetail.overallBandScores?.listening != null
                  ? `Band ${Number(gradingDetail.overallBandScores.listening).toFixed(1)}`
                  : 'Chưa có'}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">Overall</p>
              <p className="mt-1 text-sm font-semibold text-emerald-900">
                {resolvedOverallBand != null
                  ? `Band ${Number(resolvedOverallBand).toFixed(1)}`
                  : 'Chưa đủ 4 kỹ năng'}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <a
              href={gradingDetail.gradingLinks?.writing || '/teacher/writing'}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Open Writing grading UI
            </a>
            <a
              href={gradingDetail.gradingLinks?.speaking || '/teacher/speaking'}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Open Speaking grading UI
            </a>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Search className="h-4 w-4" />
              Lọc câu Reading/Listening theo số thứ tự (ví dụ: 13)
            </div>
            <input
              value={detailSearchQuestion}
              onChange={(event) => setDetailSearchQuestion(event.target.value)}
              placeholder="Nhập số câu cần xem"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {(['reading', 'listening'] as SkillType[]).map((skillType) => {
              const { skill, external } = readSkillExternal(skillType);
              const details = Array.isArray(external?.details) ? external.details : [];
              const filterNumber = Number(detailSearchQuestion);
              const filteredDetails = Number.isFinite(filterNumber) && filterNumber > 0
                ? details.filter((item: any) => Number(item.questionIndex) === filterNumber)
                : details;

              return (
                <article key={skillType} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{skillType.toUpperCase()} auto-graded</p>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getSkillCardColor(skillType)}`}>
                      {formatSkillStatus(skill?.status)}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
                    <p className="rounded-lg bg-slate-50 px-3 py-2">Raw: <span className="font-semibold">{external?.rawScore ?? '-'}</span></p>
                    <p className="rounded-lg bg-slate-50 px-3 py-2">Band: <span className="font-semibold">{external?.bandScore != null ? Number(external.bandScore).toFixed(1) : '-'}</span></p>
                    <p className="rounded-lg bg-slate-50 px-3 py-2">Câu chi tiết: <span className="font-semibold">{details.length}</span></p>
                  </div>

                  {filteredDetails.length > 0 ? (
                    <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-2 py-2 text-left">Q</th>
                            <th className="px-2 py-2 text-left">Student</th>
                            <th className="px-2 py-2 text-left">Correct</th>
                            <th className="px-2 py-2 text-left">Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredDetails.map((item: any) => (
                            <tr key={`${skillType}-${item.questionIndex}`}>
                              <td className="px-2 py-2 font-semibold">{item.questionIndex}</td>
                              <td className="px-2 py-2">{item.studentAnswer || '(blank)'}</td>
                              <td className="px-2 py-2">{item.correctAnswer || '(blank)'}</td>
                              <td className="px-2 py-2">
                                {item.isCorrect ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Đúng</span>
                                ) : (
                                  <span className="text-red-600">Sai</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">Chưa có dữ liệu chi tiết hoặc không khớp bộ lọc.</p>
                  )}
                </article>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {(['writing', 'speaking'] as SkillType[]).map((skillType) => {
              const { skill, external } = readSkillExternal(skillType);
              const grading = external?.grading || {};
              const feedback = skillType === 'writing'
                ? grading?.teacherFeedback?.overall_feedback || grading?.teacherFeedback?.content || ''
                : grading?.teacherFeedback || '';

              return (
                <article key={skillType} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{skillType.toUpperCase()} manual grading</p>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getSkillCardColor(skillType)}`}>
                      {formatSkillStatus(skill?.status)}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                    <p className="rounded-lg bg-slate-50 px-3 py-2">Submission ID: <span className="font-semibold">{skill?.gradingMetadata?.externalSubmissionId || '-'}</span></p>
                    <p className="rounded-lg bg-slate-50 px-3 py-2">Band: <span className="font-semibold">{skill?.gradedBand != null ? Number(skill.gradedBand).toFixed(1) : '-'}</span></p>
                  </div>
                  <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-600">
                    {feedback ? String(feedback) : 'Chưa có feedback từ giáo viên cho kỹ năng này.'}
                  </p>
                </article>
              );
            })}
          </div>

          <button
            onClick={handleMarkGraded}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Đồng bộ kết quả chấm + cập nhật overall band
          </button>
        </article>
      ) : null}
    </section>
  );
}
