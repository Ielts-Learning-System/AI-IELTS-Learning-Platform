import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Split from 'react-split';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileAudio,
  Headphones,
  LoaderCircle,
  Lock,
  Mic,
  PencilLine,
  Play,
  Save,
  Send,
  Trash2,
} from 'lucide-react';
import {
  getExamAttempt,
  saveSkillSnapshot,
  startSkillAttempt,
  submitExamAttempt,
  submitSkillAttempt,
  type ExamAttemptDetail,
  type SkillType,
} from '../../api/exam.api';
import { fetchSpeakingTestById, type SpeakingTestDetail } from '../../api/speaking.api';
import { apiClient } from '../../lib/api/client';

const SKILL_ORDER: SkillType[] = ['reading', 'listening', 'writing', 'speaking'];

type ReadingQuestion = {
  _id: string;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'FILL_IN_BLANK' | 'MATCHING' | 'TFNG' | 'YNNG';
  options?: string[];
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
  description?: string;
  passages: ReadingPassage[];
};

type ListeningQuestion = {
  _id: string;
  questionText: string;
  type: 'multiple_choice' | 'fill_blank' | 'map_labeling' | 'matching';
  options?: string[];
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
  description?: string;
  parts: ListeningPart[];
};

type WritingDetail = {
  _id: string;
  title: string;
  type: 'Task 1' | 'Task 2';
  category?: string;
  timeLimit?: number;
  contentHtml: string;
};

type SkillResourceMap = {
  reading: ReadingDetail;
  listening: ListeningDetail;
  writing: WritingDetail;
  speaking: SpeakingTestDetail;
};

type AudioAnswer = {
  questionKey: string;
  audioUrl: string;
};

type SkillSnapshot = Record<string, unknown>;

function formatSeconds(seconds: number) {
  const sec = Math.max(0, seconds);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function unwrapData<T>(payload: { data?: T } | T): T {
  return (payload as { data?: T })?.data ?? (payload as T);
}

function flattenReadingQuestions(detail?: ReadingDetail) {
  return detail?.passages.flatMap((passage) => passage.questions) ?? [];
}

function flattenListeningQuestions(detail?: ListeningDetail) {
  return detail?.parts.flatMap((part) => part.questions) ?? [];
}

function countBlankAnswers(values: string[]) {
  return values.filter((value) => !String(value || '').trim()).length;
}

function getSpeakingPrompts(detail?: SpeakingTestDetail) {
  if (!detail) return [] as Array<{ questionKey: string; label: string; text: string }>;

  return [
    ...detail.part1.map((text, index) => ({
      questionKey: `p1_${index}`,
      label: `Part 1 · Câu ${index + 1}`,
      text,
    })),
    {
      questionKey: 'p2',
      label: 'Part 2 · Cue Card',
      text: detail.part2,
    },
    ...detail.part3.map((text, index) => ({
      questionKey: `p3_${index}`,
      label: `Part 3 · Câu ${index + 1}`,
      text,
    })),
  ];
}

function getAudioAnswers(snapshot: SkillSnapshot): AudioAnswer[] {
  const raw = snapshot.answers;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => ({
      questionKey: String((item as AudioAnswer)?.questionKey || '').trim(),
      audioUrl: String((item as AudioAnswer)?.audioUrl || '').trim(),
    }))
    .filter((item) => item.questionKey && item.audioUrl);
}

async function fetchSkillResource(skillType: SkillType, skillRefId: string) {
  if (skillType === 'reading') {
    const response = await apiClient.get(`/reading/${skillRefId}`);
    return unwrapData<ReadingDetail>(response.data);
  }

  if (skillType === 'listening') {
    const response = await apiClient.get(`/listening/${skillRefId}`);
    return unwrapData<ListeningDetail>(response.data);
  }

  if (skillType === 'writing') {
    const response = await apiClient.get(`/writing/items/${skillRefId}`);
    return unwrapData<WritingDetail>(response.data);
  }

  return fetchSpeakingTestById(skillRefId);
}

export default function MockExamExecutionPage() {
  const { attemptId } = useParams<{ examId: string; attemptId: string }>();
  const [attempt, setAttempt] = useState<ExamAttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<SkillType | null>(null);
  const [draftSnapshot, setDraftSnapshot] = useState<SkillSnapshot>({});
  const [showSubmitWarning, setShowSubmitWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<'skill' | 'exam' | null>(null);
  const [busy, setBusy] = useState(false);
  const [resourceLoading, setResourceLoading] = useState<Record<SkillType, boolean>>({
    reading: false,
    listening: false,
    writing: false,
    speaking: false,
  });
  const [resources, setResources] = useState<Partial<SkillResourceMap>>({});
  const [listeningPartIndex, setListeningPartIndex] = useState(0);
  const [speakingUploadingKey, setSpeakingUploadingKey] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const globalSeconds = attempt?.globalTimeRemainingSeconds ?? 0;

  const selectedSkillAttempt = useMemo(() => {
    if (!attempt || !selectedSkill) return null;
    return attempt.skills.find((s) => s.skillType === selectedSkill) || null;
  }, [attempt, selectedSkill]);

  const resolvedOverallBand = useMemo(() => {
    if (!attempt) return null;
    if (typeof attempt.overallBand === 'number') return attempt.overallBand;
    if (typeof attempt.overallBandScores?.overall === 'number') return attempt.overallBandScores.overall;
    return null;
  }, [attempt]);

  const currentSkillInProgress = attempt?.currentSkillInProgress ?? null;

  const isSelectedSkillEditable = Boolean(
    attempt &&
      selectedSkill &&
      selectedSkillAttempt &&
      attempt.status === 'IN_PROGRESS' &&
      selectedSkillAttempt.status === 'IN_PROGRESS' &&
      currentSkillInProgress === selectedSkill
  );

  const readingQuestions = useMemo(() => flattenReadingQuestions(resources.reading), [resources.reading]);
  const listeningQuestions = useMemo(() => flattenListeningQuestions(resources.listening), [resources.listening]);

  const currentUnansweredCount = useMemo(() => {
    if (!selectedSkill) return 0;

    if (selectedSkill === 'reading') {
      const answers = draftSnapshot.answers as Record<string, string> | undefined;
      return countBlankAnswers(readingQuestions.map((q) => String(answers?.[q._id] || '')));
    }

    if (selectedSkill === 'listening') {
      const answers = draftSnapshot.answers as Record<string, string> | undefined;
      return countBlankAnswers(listeningQuestions.map((q) => String(answers?.[q._id] || '')));
    }

    if (selectedSkill === 'writing') {
      return String(draftSnapshot.content || '').trim() ? 0 : 1;
    }

    const prompts = getSpeakingPrompts(resources.speaking);
    const answers = getAudioAnswers(draftSnapshot);
    return Math.max(0, prompts.length - answers.length);
  }, [draftSnapshot, listeningQuestions, readingQuestions, resources.speaking, selectedSkill]);

  const buildSnapshotForSelectedSkill = () => {
    if (!selectedSkill) return {};

    if (selectedSkill === 'reading') {
      return {
        answers: (draftSnapshot.answers as Record<string, string> | undefined) || {},
        questionOrder: readingQuestions.map((q) => q._id),
      };
    }

    if (selectedSkill === 'listening') {
      return {
        answers: (draftSnapshot.answers as Record<string, string> | undefined) || {},
        questionOrder: listeningQuestions.map((q) => q._id),
      };
    }

    if (selectedSkill === 'writing') {
      return {
        content: String(draftSnapshot.content || ''),
        taskType: resources.writing?.type,
      };
    }

    return { answers: getAudioAnswers(draftSnapshot) };
  };

  // Fetch attempt on mount
  useEffect(() => {
    if (!attemptId) return;
    let alive = true;
    setLoading(true);

    getExamAttempt(attemptId)
      .then((data) => {
        if (!alive) return;
        setAttempt(data);
        setSelectedSkill(data.currentSkillInProgress || data.skills[0]?.skillType || null);
      })
      .catch((error) => {
        toast.error(error?.response?.data?.message || 'Không thể tải tiến trình thi thử.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => { alive = false; };
  }, [attemptId]);

  // Polling interval
  useEffect(() => {
    if (!attemptId) return;

    intervalRef.current = window.setInterval(async () => {
      try {
        const latest = await getExamAttempt(attemptId);
        setAttempt(latest);

        if (!selectedSkill) {
          setSelectedSkill(latest.currentSkillInProgress || latest.skills[0]?.skillType || null);
        }

        if (latest.status !== 'IN_PROGRESS' && intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        if (latest.globalTimeRemainingSeconds <= 0 && latest.status === 'IN_PROGRESS') {
          const submitted = await submitExamAttempt(attemptId, { autoSubmitted: true });
          setAttempt(submitted);
          toast.error('Hết 24 giờ. Bài thi đã được auto-submit.');
        }
      } catch {
        // ignore polling errors
      }
    }, 5000);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [attemptId, selectedSkill]);

  // Beforeunload warning
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!attempt || attempt.status !== 'IN_PROGRESS') return;
      if (!attempt.currentSkillInProgress) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [attempt]);

  // Active skill lock in localStorage
  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS' || !attempt.currentSkillInProgress) {
      localStorage.removeItem('activeMockSkillLock');
      return;
    }

    localStorage.setItem(
      'activeMockSkillLock',
      JSON.stringify({ attemptId: attempt._id, skillType: attempt.currentSkillInProgress })
    );

    return () => { localStorage.removeItem('activeMockSkillLock'); };
  }, [attempt?._id, attempt?.status, attempt?.currentSkillInProgress]);

  // Sync draftSnapshot when selected skill changes
  useEffect(() => {
    if (!selectedSkillAttempt) {
      setDraftSnapshot({});
      return;
    }

    const snapshot = (selectedSkillAttempt.answerSnapshot as SkillSnapshot | undefined) || {};
    setDraftSnapshot(snapshot);
  }, [selectedSkillAttempt?._id]);

  // Load skill resources
  useEffect(() => {
    if (!attempt) return;

    const missingSkills = attempt.skills.filter(
      (skill) => !resources[skill.skillType] && !resourceLoading[skill.skillType]
    );

    if (missingSkills.length === 0) return;

    for (const skill of missingSkills) {
      setResourceLoading((prev) => ({ ...prev, [skill.skillType]: true }));
      fetchSkillResource(skill.skillType, skill.skillRefId)
        .then((resource) => {
          setResources((prev) => ({ ...prev, [skill.skillType]: resource }));
        })
        .catch((error: unknown) => {
          const message = axios.isAxiosError(error)
            ? error.response?.data?.message || error.message
            : 'Không thể tải nội dung kỹ năng.';
          toast.error(message);
        })
        .finally(() => {
          setResourceLoading((prev) => ({ ...prev, [skill.skillType]: false }));
        });
    }
  }, [attempt, resourceLoading, resources]);

  // Reset listening part when skill changes
  useEffect(() => {
    if (selectedSkill === 'listening') setListeningPartIndex(0);
  }, [selectedSkill]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleStartSkill = async (skill: SkillType) => {
    if (!attemptId || !attempt) return;

    if (attempt.currentSkillInProgress && attempt.currentSkillInProgress !== skill) {
      toast.error(`Bạn phải hoàn thành ${attempt.currentSkillInProgress.toUpperCase()} trước khi chuyển kỹ năng.`);
      return;
    }

    try {
      setBusy(true);
      const next = await startSkillAttempt(attemptId, skill);
      setAttempt(next);
      setSelectedSkill(skill);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể bắt đầu kỹ năng.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSnapshot = async () => {
    if (!attemptId || !selectedSkill) return;

    try {
      setBusy(true);
      const next = await saveSkillSnapshot(attemptId, selectedSkill, {
        answerSnapshot: buildSnapshotForSelectedSkill(),
        unansweredCount: currentUnansweredCount,
      });
      setAttempt(next);
      toast.success('Đã lưu snapshot.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể lưu snapshot.');
    } finally {
      setBusy(false);
    }
  };

  const confirmSubmitSkill = async () => {
    if (!attemptId || !selectedSkill) return;
    setShowSubmitWarning(false);

    try {
      setBusy(true);
      const next = await submitSkillAttempt(attemptId, selectedSkill, {
        answerSnapshot: buildSnapshotForSelectedSkill(),
        unansweredCount: currentUnansweredCount,
      });
      setAttempt(next);
      setSelectedSkill(next.currentSkillInProgress || selectedSkill);
      toast.success(`Đã nộp ${selectedSkill.toUpperCase()}.`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể nộp kỹ năng.');
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  };

  const confirmSubmitExam = async () => {
    if (!attemptId) return;
    setShowSubmitWarning(false);

    try {
      setBusy(true);
      const next = await submitExamAttempt(attemptId);
      setAttempt(next);
      setSelectedSkill(next.currentSkillInProgress || selectedSkill);
      toast.success('Đã nộp toàn bộ bài thi.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể nộp bài thi.');
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  };

  const updateMappedAnswer = (questionId: string, value: string) => {
    setDraftSnapshot((prev) => ({
      ...prev,
      answers: {
        ...((prev.answers as Record<string, string> | undefined) || {}),
        [questionId]: value,
      },
    }));
  };

  const uploadSpeakingAudio = async (questionKey: string, file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast.error('Chỉ chấp nhận file âm thanh cho Speaking.');
      return;
    }

    try {
      setSpeakingUploadingKey(questionKey);

      const signatureResponse = await apiClient.get('/media/generate-signature', {
        params: { folderName: 'ielts_platform/speaking' },
      });
      const signatureData = unwrapData<{
        signature: string;
        timestamp: string;
        cloud_name: string;
        api_key: string;
        folder: string;
      }>(signatureResponse.data);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', signatureData.api_key);
      formData.append('timestamp', String(signatureData.timestamp));
      formData.append('signature', signatureData.signature);
      formData.append('folder', signatureData.folder);

      const uploadResponse = await axios.post(
        `https://api.cloudinary.com/v1_1/${signatureData.cloud_name}/video/upload`,
        formData
      );

      const audioUrl = String(uploadResponse.data?.secure_url || '');
      if (!audioUrl) throw new Error('Cloudinary không trả về audio URL.');

      setDraftSnapshot((prev) => {
        const currentAnswers = getAudioAnswers(prev).filter((item) => item.questionKey !== questionKey);
        return { ...prev, answers: [...currentAnswers, { questionKey, audioUrl }] };
      });

      toast.success('Đã upload audio Speaking.');
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : 'Không thể upload audio Speaking.';
      toast.error(message);
    } finally {
      setSpeakingUploadingKey(null);
    }
  };

  const removeSpeakingAudio = (questionKey: string) => {
    setDraftSnapshot((prev) => ({
      ...prev,
      answers: getAudioAnswers(prev).filter((item) => item.questionKey !== questionKey),
    }));
  };

  // ── Render functions ─────────────────────────────────────────────────────────

  const renderReadingWorkspace = () => {
    const reading = resources.reading;
    if (!reading) return null;
    const answers = (draftSnapshot.answers as Record<string, string> | undefined) || {};

    return (
      <Split
        className="flex flex-1 w-full overflow-hidden"
        sizes={[55, 45]}
        minSize={200}
        gutterSize={8}
        direction="horizontal"
        cursor="col-resize"
      >
        {/* LEFT: passages */}
        <div className="overflow-y-auto bg-white px-5 py-4 space-y-4">
          {reading.passages.map((passage, passageIndex) => (
            <article key={passage._id} className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Passage {passageIndex + 1}</p>
                <h3 className="mt-1 text-base font-bold text-slate-900">{passage.title}</h3>
              </div>
              <div
                className="prose prose-slate max-w-none px-4 py-4 text-sm prose-headings:text-slate-900"
                dangerouslySetInnerHTML={{ __html: passage.content }}
              />
            </article>
          ))}
        </div>

        {/* RIGHT: questions */}
        <div className="overflow-y-auto bg-slate-50 px-4 py-4 space-y-4">
          {reading.passages.map((passage) => (
            <article key={`q-${passage._id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-3">{passage.title}</h3>
              <div className="space-y-3">
                {passage.questions.map((question, index) => (
                  <div key={question._id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
                        {question.questionNumber || index + 1}
                      </span>
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="text-sm font-medium text-slate-800">{question.text}</p>
                        {question.options && question.options.length > 0 ? (
                          <div className="space-y-1.5">
                            {question.options.map((opt) => (
                              <label key={opt} className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
                                <input
                                  type="radio"
                                  disabled={!isSelectedSkillEditable}
                                  name={question._id}
                                  value={opt}
                                  checked={answers[question._id] === opt}
                                  onChange={(e) => updateMappedAnswer(question._id, e.target.value)}
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <input
                            value={answers[question._id] || ''}
                            disabled={!isSelectedSkillEditable}
                            onChange={(e) => updateMappedAnswer(question._id, e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-slate-600"
                            placeholder="Nhập câu trả lời"
                          />
                        )}
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
  };

  const renderListeningWorkspace = () => {
    const listening = resources.listening;
    if (!listening) return null;
    const currentPart = listening.parts[listeningPartIndex];
    const answers = (draftSnapshot.answers as Record<string, string> | undefined) || {};

    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Part tabs + audio bar */}
        <div className="flex-none border-b border-slate-200 bg-white px-4 py-2 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            {listening.parts.map((part, index) => (
              <button
                key={part.partNumber}
                type="button"
                onClick={() => setListeningPartIndex(index)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  listeningPartIndex === index
                    ? 'bg-red-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-red-50 hover:text-red-600'
                }`}
              >
                Part {part.partNumber}
              </button>
            ))}
          </div>
          <audio controls preload="none" src={currentPart.audioUrl} className="flex-1 h-8 min-w-[200px]" />
        </div>

        {/* Split: description | questions */}
        <Split
          className="flex flex-1 w-full overflow-hidden"
          sizes={[50, 50]}
          minSize={200}
          gutterSize={8}
          direction="horizontal"
          cursor="col-resize"
        >
          <div className="overflow-y-auto bg-white px-4 py-4">
            <h3 className="mb-3 text-sm font-bold text-slate-800">{currentPart.title}</h3>
            <div
              className="prose prose-slate max-w-none text-sm prose-headings:text-slate-900"
              dangerouslySetInnerHTML={{ __html: currentPart.description }}
            />
          </div>

          <div className="overflow-y-auto bg-slate-50 px-4 py-4 space-y-3">
            {currentPart.questions.map((question, index) => (
              <div key={question._id} className="rounded-xl border border-slate-100 bg-white p-3">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                    {listening.parts
                      .slice(0, listeningPartIndex)
                      .reduce((sum, p) => sum + p.questions.length, 0) + index + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm font-medium text-slate-800">{question.questionText.replace(/^\d+\.\s*/, '')}</p>
                    {question.options && question.options.length > 0 ? (
                      question.type === 'multiple_choice' ? (
                        <div className="space-y-1.5">
                          {question.options.map((opt) => (
                            <label key={opt} className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-red-50">
                              <input
                                type="radio"
                                disabled={!isSelectedSkillEditable}
                                name={question._id}
                                value={opt}
                                checked={answers[question._id] === opt}
                                onChange={(e) => updateMappedAnswer(question._id, e.target.value)}
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <select
                          value={answers[question._id] || ''}
                          disabled={!isSelectedSkillEditable}
                          onChange={(e) => updateMappedAnswer(question._id, e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-500"
                        >
                          <option value="">Chọn đáp án</option>
                          {question.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )
                    ) : (
                      <input
                        value={answers[question._id] || ''}
                        disabled={!isSelectedSkillEditable}
                        onChange={(e) => updateMappedAnswer(question._id, e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-red-500"
                        placeholder="Nhập câu trả lời"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Split>
      </div>
    );
  };

  const renderWritingWorkspace = () => {
    const writing = resources.writing;
    if (!writing) return null;

    return (
      <Split
        className="flex flex-1 w-full overflow-hidden"
        sizes={[45, 55]}
        minSize={200}
        gutterSize={8}
        direction="horizontal"
        cursor="col-resize"
      >
        {/* LEFT: prompt */}
        <div className="overflow-y-auto bg-white px-4 py-4">
          <div className="mb-4 border-b border-slate-100 pb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-red-500">Writing Prompt</p>
            <h3 className="mt-1 text-base font-bold text-slate-900">{writing.title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {writing.type}{writing.category ? ` · ${writing.category}` : ''}
            </p>
          </div>
          <div
            className="prose prose-slate max-w-none text-sm prose-headings:text-slate-900"
            dangerouslySetInnerHTML={{ __html: writing.contentHtml }}
          />
        </div>

        {/* RIGHT: answer */}
        <div className="flex flex-col overflow-hidden bg-slate-50 px-4 py-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Bài làm của bạn</h3>
            <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600">
              {String(draftSnapshot.content || '').trim().split(/\s+/).filter(Boolean).length} từ
            </span>
          </div>
          <textarea
            value={String(draftSnapshot.content || '')}
            disabled={!isSelectedSkillEditable}
            onChange={(e) => setDraftSnapshot((prev) => ({ ...prev, content: e.target.value }))}
            className="flex-1 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-7 text-slate-800 outline-none focus:border-red-400"
            placeholder="Viết bài luận của bạn tại đây..."
          />
        </div>
      </Split>
    );
  };

  const renderSpeakingWorkspace = () => {
    const speaking = resources.speaking;
    if (!speaking) return null;

    const audioAnswers = getAudioAnswers(draftSnapshot);
    const audioMap = new Map(audioAnswers.map((item) => [item.questionKey, item.audioUrl]));

    return (
      <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4">
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Upload audio cho từng câu hỏi. Sau khi submit, bạn vẫn có thể mở lại phần Speaking để nghe lại file đã nộp nhưng không sửa nữa.
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {getSpeakingPrompts(speaking).map((prompt) => {
            const audioUrl = audioMap.get(prompt.questionKey);
            const isUploading = speakingUploadingKey === prompt.questionKey;

            return (
              <article key={prompt.questionKey} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                    <Mic className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-600">{prompt.label}</p>
                    <p className="mt-1.5 text-sm leading-6 text-slate-700">{prompt.text}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {audioUrl ? (
                    <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                        <FileAudio className="h-3.5 w-3.5" />
                        Audio đã nộp
                      </div>
                      <audio controls src={audioUrl} className="w-full" />
                    </div>
                  ) : null}

                  {isSelectedSkillEditable ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void uploadSpeakingAudio(prompt.questionKey, file);
                            e.currentTarget.value = '';
                          }}
                        />
                        {isUploading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Mic className="h-3.5 w-3.5" />}
                        {audioUrl ? 'Thay audio' : 'Upload audio'}
                      </label>
                      {audioUrl ? (
                        <button
                          type="button"
                          onClick={() => removeSpeakingAudio(prompt.questionKey)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Xóa
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSkillContent = () => {
    if (!selectedSkill) {
      return (
        <div className="flex flex-1 items-center justify-center text-slate-400">
          Chọn một kỹ năng để bắt đầu
        </div>
      );
    }

    const node = attempt!.skills.find((s) => s.skillType === selectedSkill);

    if (node?.status === 'NOT_STARTED') {
      const lockedByOther = Boolean(currentSkillInProgress && currentSkillInProgress !== selectedSkill);
      return (
        <div className="flex flex-1 items-center justify-center bg-white">
          <div className="w-full max-w-sm p-8 text-center">
            {lockedByOther ? (
              <>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
                  <Lock className="h-6 w-6 text-amber-600" />
                </div>
                <h2 className="mb-2 text-lg font-bold text-slate-900">{selectedSkill.toUpperCase()} bị khóa</h2>
                <p className="text-sm text-slate-500">
                  Hoàn thành <strong>{currentSkillInProgress?.toUpperCase()}</strong> trước khi chuyển kỹ năng.
                </p>
              </>
            ) : attempt?.status === 'IN_PROGRESS' ? (
              <>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Play className="ml-0.5 h-6 w-6 text-slate-700" />
                </div>
                <h2 className="mb-2 text-lg font-bold text-slate-900">
                  Sẵn sàng bắt đầu {selectedSkill.toUpperCase()}
                </h2>
                <p className="mb-5 text-sm text-slate-500">
                  Bấm bắt đầu để tính thời gian cho kỹ năng này.
                </p>
                <button
                  onClick={() => void handleStartSkill(selectedSkill)}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="ml-0.5 h-4 w-4" />}
                  Bắt đầu
                </button>
              </>
            ) : (
              <p className="text-slate-500">Bài thi đã kết thúc.</p>
            )}
          </div>
        </div>
      );
    }

    if (resourceLoading[selectedSkill]) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Đang tải nội dung kỹ năng...
          </div>
        </div>
      );
    }

    if (selectedSkill === 'reading') return renderReadingWorkspace();
    if (selectedSkill === 'listening') return renderListeningWorkspace();
    if (selectedSkill === 'writing') return renderWritingWorkspace();
    return renderSpeakingWorkspace();
  };

  // ── Loading / error states ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-600">Không tìm thấy tiến trình bài thi.</p>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col overflow-hidden bg-slate-50" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ── TOP BAR ── */}
      <div className="flex h-14 flex-none items-center gap-3 border-b border-slate-200 bg-white px-4">
        {/* Title + status */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="truncate text-sm font-bold text-slate-900">{attempt.exam?.title || 'Mock Test'}</h1>
          <span
            className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${
              attempt.status === 'IN_PROGRESS'
                ? 'bg-emerald-100 text-emerald-700'
                : attempt.status === 'SUBMITTED'
                ? 'bg-slate-100 text-slate-600'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {attempt.status}
          </span>
          {resolvedOverallBand != null && (
            <span className="whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
              Band {Number(resolvedOverallBand).toFixed(1)}
            </span>
          )}
        </div>

        {/* Timers */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-mono font-semibold text-slate-700">
            <Clock3 className="h-3.5 w-3.5" />
            {formatSeconds(globalSeconds)}
          </div>
          {selectedSkillAttempt && !['SUBMITTED', 'EXPIRED', 'GRADED'].includes(selectedSkillAttempt.status) && (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-mono font-semibold text-amber-700">
              <Clock3 className="h-3.5 w-3.5" />
              {formatSeconds(selectedSkillAttempt.timeRemainingSeconds ?? 0)}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {isSelectedSkillEditable && (
            <>
              <button
                onClick={() => void handleSaveSnapshot()}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Lưu
              </button>
              <button
                onClick={() => { setPendingAction('skill'); setShowSubmitWarning(true); }}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Nộp kỹ năng
              </button>
            </>
          )}
          {attempt.status === 'IN_PROGRESS' && (
            <button
              onClick={() => { setPendingAction('exam'); setShowSubmitWarning(true); }}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              Nộp tất cả
            </button>
          )}
        </div>
      </div>

      {/* ── SKILL TABS ── */}
      <div className="flex h-11 flex-none items-center gap-1 border-b border-slate-200 bg-white px-4">
        {SKILL_ORDER.map((skill) => {
          const node = attempt.skills.find((s) => s.skillType === skill);
          const isSelected = selectedSkill === skill;
          const isSubmitted = ['SUBMITTED', 'EXPIRED', 'GRADED'].includes(node?.status || '');
          const isInProgress = node?.status === 'IN_PROGRESS';
          const isLocked = Boolean(currentSkillInProgress && currentSkillInProgress !== skill && node?.status === 'NOT_STARTED');
          const ICONS = { reading: BookOpen, listening: Headphones, writing: PencilLine, speaking: Mic } as const;
          const Icon = ICONS[skill];

          return (
            <button
              key={skill}
              type="button"
              onClick={() => setSelectedSkill(skill)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold transition ${
                isSelected
                  ? 'bg-slate-900 text-white'
                  : isSubmitted
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {isLocked ? (
                <Lock className="h-3.5 w-3.5" />
              ) : isSubmitted ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              {skill.charAt(0).toUpperCase() + skill.slice(1)}
              {isInProgress && isSelected && currentUnansweredCount > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {currentUnansweredCount}
                </span>
              )}
              {isSubmitted && attempt.overallBandScores?.[skill] != null && (
                <span
                  className={`rounded-full px-1.5 text-[10px] font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {Number(attempt.overallBandScores[skill]).toFixed(1)}
                </span>
              )}
            </button>
          );
        })}

        <div className="ml-auto text-xs text-slate-400">
          {isSelectedSkillEditable && currentUnansweredCount > 0
            ? `${currentUnansweredCount} câu chưa trả lời`
            : selectedSkillAttempt && ['SUBMITTED', 'GRADED'].includes(selectedSkillAttempt.status)
            ? 'Chế độ xem lại'
            : ''}
        </div>
      </div>

      {/* ── CONTENT AREA ── */}
      <div className="flex flex-1 overflow-hidden">
        {renderSkillContent()}
      </div>

      {/* ── SUBMIT WARNING MODAL ── */}
      {showSubmitWarning ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-80 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-3 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-slate-900">Xác nhận nộp bài</h3>
            </div>
            <p className="mb-5 text-sm text-slate-600">
              {pendingAction === 'skill'
                ? `Bạn có chắc muốn nộp kỹ năng ${selectedSkill?.toUpperCase()}? Sau khi nộp bạn không thể chỉnh sửa.`
                : 'Bạn có chắc muốn nộp toàn bộ bài thi? Hành động này không thể hoàn tác.'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowSubmitWarning(false); setPendingAction(null); }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Quay lại
              </button>
              <button
                onClick={pendingAction === 'skill' ? confirmSubmitSkill : confirmSubmitExam}
                disabled={busy}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin inline" /> : 'Xác nhận nộp'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
