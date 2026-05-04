/**
 * MockExamGradingModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen modal for teacher to review and grade a student's mock exam.
 *
 * R / L: auto-graded by the system (gradedBand pre-filled); teacher can override.
 * W / S: teacher must manually review content and enter a band score.
 */

import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Split from 'react-split';
import {
  BookOpen,
  CheckCircle2,
  FileAudio,
  Headphones,
  LoaderCircle,
  Mic,
  PencilLine,
  Save,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { gradeTeacherAttempt, type TeacherAttemptDetail, type SkillType } from '../../api/exam.api';
import { fetchSpeakingTestById, type SpeakingTestDetail } from '../../api/speaking.api';
import { apiClient } from '../../lib/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// Resource types (mirrors MockExamExecutionPage)
// ─────────────────────────────────────────────────────────────────────────────

type ReadingQuestion = {
  _id: string;
  text: string;
  type: string;
  options?: string[];
  correctAnswer?: string;
  questionNumber?: number;
};

type ReadingPassage = {
  _id: string;
  title: string;
  content: string;
  questions: ReadingQuestion[];
};

type ReadingDetail = {
  _id: string;
  title: string;
  passages: ReadingPassage[];
};

type ListeningQuestion = {
  _id: string;
  questionText: string;
  type: string;
  options?: string[];
  correctAnswer?: string;
};

type ListeningPart = {
  partNumber: number;
  title: string;
  description: string;
  audioUrl: string;
  questions: ListeningQuestion[];
};

type ListeningDetail = {
  _id: string;
  title: string;
  parts: ListeningPart[];
};

type WritingDetail = {
  _id: string;
  title: string;
  type: string;
  category?: string;
  contentHtml: string;
};

type SkillResource = ReadingDetail | ListeningDetail | WritingDetail | SpeakingTestDetail;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function unwrapData<T>(payload: { data?: T } | T): T {
  return (payload as { data?: T })?.data ?? (payload as T);
}

async function loadSkillResource(skillType: SkillType, skillRefId: string): Promise<SkillResource> {
  if (skillType === 'reading') {
    const res = await apiClient.get(`/reading/${skillRefId}`);
    return unwrapData<ReadingDetail>(res.data);
  }
  if (skillType === 'listening') {
    const res = await apiClient.get(`/listening/${skillRefId}`);
    return unwrapData<ListeningDetail>(res.data);
  }
  if (skillType === 'writing') {
    const res = await apiClient.get(`/writing/items/${skillRefId}`);
    return unwrapData<WritingDetail>(res.data);
  }
  return fetchSpeakingTestById(skillRefId);
}

function getReadingAnswers(snapshot?: Record<string, unknown>): Record<string, string> {
  const raw = snapshot?.answers;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as Record<string, string>;
}

function getListeningAnswers(snapshot?: Record<string, unknown>): Record<string, string> {
  return getReadingAnswers(snapshot);
}

function getWritingContent(snapshot?: Record<string, unknown>): string {
  return String(snapshot?.content || '');
}

type AudioAnswer = { questionKey: string; audioUrl: string };
function getSpeakingAudios(snapshot?: Record<string, unknown>): AudioAnswer[] {
  const raw = snapshot?.answers;
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .map((item) => ({
      questionKey: String((item as AudioAnswer)?.questionKey || ''),
      audioUrl: String((item as AudioAnswer)?.audioUrl || ''),
    }))
    .filter((a) => a.questionKey && a.audioUrl);
}

function getSpeakingPrompts(detail: SpeakingTestDetail) {
  return [
    ...detail.part1.map((text, i) => ({ key: `p1_${i}`, label: `Part 1 · Câu ${i + 1}`, text })),
    { key: 'p2', label: 'Part 2 · Cue Card', text: detail.part2 },
    ...detail.part3.map((text, i) => ({ key: `p3_${i}`, label: `Part 3 · Câu ${i + 1}`, text })),
  ];
}

const SKILL_ORDER: SkillType[] = ['reading', 'listening', 'writing', 'speaking'];

const SKILL_ICON: Record<SkillType, React.ElementType> = {
  reading: BookOpen,
  listening: Headphones,
  writing: PencilLine,
  speaking: Mic,
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function AnswerBadge({ student, correct }: { student: string; correct?: string }) {
  const hasCorrect = correct != null && correct !== '';
  const isCorrect = hasCorrect && student.trim().toLowerCase() === correct.trim().toLowerCase();

  if (!student) {
    return <span className="italic text-slate-400">— chưa trả lời —</span>;
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`rounded px-2 py-0.5 text-xs font-semibold ${
          !hasCorrect
            ? 'bg-slate-100 text-slate-700'
            : isCorrect
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-red-100 text-red-700'
        }`}
      >
        {student}
      </span>
      {hasCorrect && (
        isCorrect
          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          : <XCircle className="h-3.5 w-3.5 text-red-400" />
      )}
      {hasCorrect && !isCorrect && (
        <span className="text-xs text-slate-400">
          → <span className="font-semibold text-emerald-700">{correct}</span>
        </span>
      )}
    </span>
  );
}

function ReadingView({ detail, snapshot }: { detail: ReadingDetail; snapshot?: Record<string, unknown> }) {
  const answers = getReadingAnswers(snapshot);
  const [listeningPartIndex] = useState(0);
  void listeningPartIndex;

  return (
    <Split
      className="flex flex-1 w-full overflow-hidden"
      sizes={[55, 45]}
      minSize={200}
      gutterSize={8}
      direction="horizontal"
      cursor="col-resize"
    >
      {/* Passages */}
      <div className="overflow-y-auto bg-white px-5 py-4 space-y-4">
        {detail.passages.map((p, pi) => (
          <article key={p._id} className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Passage {pi + 1}</p>
              <h3 className="mt-1 text-sm font-bold text-slate-900">{p.title}</h3>
            </div>
            <div
              className="prose prose-slate max-w-none px-4 py-4 text-sm"
              dangerouslySetInnerHTML={{ __html: p.content }}
            />
          </article>
        ))}
      </div>

      {/* Q&A */}
      <div className="overflow-y-auto bg-slate-50 px-4 py-4 space-y-4">
        {detail.passages.map((p) => (
          <article key={`qa-${p._id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">{p.title}</h4>
            <div className="space-y-2">
              {p.questions.map((q, qi) => (
                <div key={q._id} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white">
                      {q.questionNumber ?? qi + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs font-medium text-slate-700">{q.text}</p>
                      <AnswerBadge student={answers[q._id] || ''} correct={q.correctAnswer} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </Split>
  );
}

function ListeningView({ detail, snapshot }: { detail: ListeningDetail; snapshot?: Record<string, unknown> }) {
  const answers = getListeningAnswers(snapshot);
  const [partIdx, setPartIdx] = useState(0);
  const part = detail.parts[partIdx];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Part tabs + audio */}
      <div className="flex-none border-b border-slate-200 bg-white px-4 py-2 flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {detail.parts.map((p, i) => (
            <button
              key={p.partNumber}
              onClick={() => setPartIdx(i)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                partIdx === i ? 'bg-red-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-red-50 hover:text-red-600'
              }`}
            >
              Part {p.partNumber}
            </button>
          ))}
        </div>
        <audio controls preload="none" src={part.audioUrl} className="flex-1 h-8 min-w-[200px]" />
      </div>

      <Split
        className="flex flex-1 w-full overflow-hidden"
        sizes={[50, 50]}
        minSize={200}
        gutterSize={8}
        direction="horizontal"
        cursor="col-resize"
      >
        {/* Description */}
        <div className="overflow-y-auto bg-white px-4 py-4">
          <h3 className="mb-2 text-sm font-bold text-slate-800">{part.title}</h3>
          <div
            className="prose prose-slate max-w-none text-sm"
            dangerouslySetInnerHTML={{ __html: part.description }}
          />
        </div>

        {/* Questions */}
        <div className="overflow-y-auto bg-slate-50 px-4 py-4 space-y-2">
          {part.questions.map((q, qi) => {
            const offset = detail.parts.slice(0, partIdx).reduce((s, p) => s + p.questions.length, 0);
            return (
              <div key={q._id} className="rounded-lg border border-slate-100 bg-white p-2.5">
                <div className="flex items-start gap-2">
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                    {offset + qi + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-medium text-slate-700">{q.questionText.replace(/^\d+\.\s*/, '')}</p>
                    <AnswerBadge student={answers[q._id] || ''} correct={q.correctAnswer} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Split>
    </div>
  );
}

function WritingView({ detail, snapshot }: { detail: WritingDetail; snapshot?: Record<string, unknown> }) {
  const content = getWritingContent(snapshot);
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <Split
      className="flex flex-1 w-full overflow-hidden"
      sizes={[45, 55]}
      minSize={200}
      gutterSize={8}
      direction="horizontal"
      cursor="col-resize"
    >
      {/* Prompt */}
      <div className="overflow-y-auto bg-white px-5 py-4">
        <div className="mb-3 border-b border-slate-100 pb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-red-500">Writing Prompt</p>
          <h3 className="mt-1 text-sm font-bold text-slate-900">{detail.title}</h3>
          <p className="text-xs text-slate-500">{detail.type}{detail.category ? ` · ${detail.category}` : ''}</p>
        </div>
        <div
          className="prose prose-slate max-w-none text-sm"
          dangerouslySetInnerHTML={{ __html: detail.contentHtml }}
        />
      </div>

      {/* Student essay */}
      <div className="flex flex-col overflow-hidden bg-slate-50 px-4 py-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Bài làm học sinh</h3>
          <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600">{wordCount} từ</span>
        </div>
        {content ? (
          <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 whitespace-pre-wrap">
            {content}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400">
            Học sinh chưa nộp bài viết.
          </div>
        )}
      </div>
    </Split>
  );
}

function SpeakingView({ detail, snapshot }: { detail: SpeakingTestDetail; snapshot?: Record<string, unknown> }) {
  const audios = getSpeakingAudios(snapshot);
  const audioMap = new Map(audios.map((a) => [a.questionKey, a.audioUrl]));
  const prompts = getSpeakingPrompts(detail);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4">
      <div className="grid gap-3 xl:grid-cols-2">
        {prompts.map((p) => {
          const url = audioMap.get(p.key);
          return (
            <article key={p.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700 flex-none">
                  <Mic className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-600">{p.label}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{p.text}</p>
                </div>
              </div>
              <div className="mt-3">
                {url ? (
                  <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                      <FileAudio className="h-3.5 w-3.5" />
                      Audio nộp
                    </div>
                    <audio controls src={url} className="w-full" />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">
                    Chưa nộp audio
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  attempt: TeacherAttemptDetail;
  onClose: () => void;
  onGraded: () => void;
}

export function MockExamGradingModal({ attempt, onClose, onGraded }: Props) {
  const [tab, setTab] = useState<SkillType>('reading');
  const [resources, setResources] = useState<Partial<Record<SkillType, SkillResource>>>({});
  const [resLoading, setResLoading] = useState<Partial<Record<SkillType, boolean>>>({});
  const [bands, setBands] = useState<Record<SkillType, string>>(() => {
    const out: Record<SkillType, string> = { reading: '', listening: '', writing: '', speaking: '' };
    for (const s of attempt.skills) {
      if (s.gradedBand != null) out[s.skillType] = String(s.gradedBand);
    }
    if (attempt.overallBandScores) {
      for (const [k, v] of Object.entries(attempt.overallBandScores)) {
        if (k !== 'overall' && v != null && !out[k as SkillType]) {
          out[k as SkillType] = String(v);
        }
      }
    }
    return out;
  });
  const [saving, setSaving] = useState(false);

  // Load skill resource when tab changes
  useEffect(() => {
    if (resources[tab] || resLoading[tab]) return;
    const skillAttempt = attempt.skills.find((s) => s.skillType === tab);
    if (!skillAttempt?.skillRefId) return;

    setResLoading((prev) => ({ ...prev, [tab]: true }));
    loadSkillResource(tab, skillAttempt.skillRefId)
      .then((res) => setResources((prev) => ({ ...prev, [tab]: res })))
      .catch((err: unknown) => {
        const msg = axios.isAxiosError(err) ? err.response?.data?.message || err.message : 'Không tải được nội dung kỹ năng.';
        toast.error(msg);
      })
      .finally(() => setResLoading((prev) => ({ ...prev, [tab]: false })));
  }, [tab, attempt.skills, resources, resLoading]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: { writingBand?: number; speakingBand?: number; readingBand?: number; listeningBand?: number } = {};
      if (bands.writing !== '')   payload.writingBand   = Number(bands.writing);
      if (bands.speaking !== '')  payload.speakingBand  = Number(bands.speaking);
      if (bands.reading !== '')   payload.readingBand   = Number(bands.reading);
      if (bands.listening !== '') payload.listeningBand = Number(bands.listening);
      await gradeTeacherAttempt(attempt._id, payload);
      toast.success('Đã lưu điểm thành công!');
      onGraded();
      onClose();
    } catch {
      toast.error('Không thể lưu điểm.');
    } finally {
      setSaving(false);
    }
  };

  const currentSkillAttempt = attempt.skills.find((s) => s.skillType === tab);
  const isAutoGraded = tab === 'reading' || tab === 'listening';
  const resource = resources[tab];
  const loading = resLoading[tab];

  const studentId = attempt.userId?.slice(-8) ?? attempt._id.slice(-8);
  const examTitle = attempt.exam?.title ?? `Exam …${attempt.examId.slice(-6)}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* ── Header ── */}
      <div className="flex h-14 flex-none items-center gap-3 border-b border-slate-200 bg-white px-4">
        <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
          <X className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold text-slate-900">{examTitle}</h1>
          <p className="text-xs text-slate-500">Học viên: …{studentId}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            attempt.status === 'GRADED'
              ? 'bg-emerald-100 text-emerald-700'
              : attempt.status === 'IN_PROGRESS'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {attempt.status}
        </span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Lưu điểm
        </button>
      </div>

      {/* ── Skill tabs ── */}
      <div className="flex h-11 flex-none items-center gap-1 border-b border-slate-200 bg-white px-4">
        {SKILL_ORDER.map((skill) => {
          const node = attempt.skills.find((s) => s.skillType === skill);
          const Icon = SKILL_ICON[skill];
          const isSelected = tab === skill;
          const submitted = node && ['SUBMITTED', 'EXPIRED', 'GRADED'].includes(node.status);

          return (
            <button
              key={skill}
              onClick={() => setTab(skill)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold transition ${
                isSelected
                  ? 'bg-slate-900 text-white'
                  : submitted
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {skill.charAt(0).toUpperCase() + skill.slice(1)}
              {node?.gradedBand != null && (
                <span className={`rounded-full px-1.5 text-[10px] font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                  {Number(node.gradedBand).toFixed(1)}
                </span>
              )}
            </button>
          );
        })}

        {/* Band score inputs (inline, right side of tab bar) */}
        <div className="ml-auto flex items-center gap-3">
          {SKILL_ORDER.map((skill) => {
            const auto = skill === 'reading' || skill === 'listening';
            return (
              <div key={skill} className="flex items-center gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">{skill.slice(0, 1).toUpperCase()}</label>
                <div className="relative">
                  {auto && (
                    <span title="Hệ thống chấm tự động" className="absolute -top-1 -right-1 z-10">
                      <Zap className="h-2.5 w-2.5 text-amber-400" />
                    </span>
                  )}
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={9}
                    value={bands[skill]}
                    onChange={(e) => setBands((b) => ({ ...b, [skill]: e.target.value }))}
                    placeholder="—"
                    className={`w-14 rounded-lg border px-2 py-1 text-xs font-semibold text-center outline-none ${
                      auto
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-slate-300 bg-white text-slate-800 focus:border-slate-600'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="flex flex-1 overflow-hidden">
        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-400">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Đang tải nội dung...
          </div>
        ) : !currentSkillAttempt || currentSkillAttempt.status === 'NOT_STARTED' ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            Học sinh chưa làm kỹ năng này.
          </div>
        ) : !resource ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            Không tải được nội dung.
          </div>
        ) : isAutoGraded && tab === 'reading' ? (
          <ReadingView detail={resource as ReadingDetail} snapshot={currentSkillAttempt.answerSnapshot} />
        ) : isAutoGraded && tab === 'listening' ? (
          <ListeningView detail={resource as ListeningDetail} snapshot={currentSkillAttempt.answerSnapshot} />
        ) : tab === 'writing' ? (
          <WritingView detail={resource as WritingDetail} snapshot={currentSkillAttempt.answerSnapshot} />
        ) : (
          <SpeakingView detail={resource as SpeakingTestDetail} snapshot={currentSkillAttempt.answerSnapshot} />
        )}
      </div>

      {/* ── Bottom grading hint ── */}
      {!isAutoGraded && (
        <div className="flex-none border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{tab.toUpperCase()}</span> — Giáo viên chấm điểm thủ công. Nhập band score ở ô phía trên rồi bấm <span className="font-semibold">Lưu điểm</span>.
        </div>
      )}
      {isAutoGraded && (
        <div className="flex-none border-t border-slate-100 bg-amber-50 px-4 py-2 text-xs text-amber-700 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5" />
          <span className="font-semibold">{tab.toUpperCase()}</span> — Hệ thống đã chấm tự động. Giáo viên có thể chỉnh điểm nếu cần.
        </div>
      )}
    </div>
  );
}
