import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileAudio,
  Headphones,
  LoaderCircle,
  Lock,
  Mic,
  PencilLine,
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
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function skillRoute(skillType: SkillType, skillRefId: string) {
  if (skillType === 'reading') return `/reading/${skillRefId}`;
  if (skillType === 'listening') return `/listening/ielts/${skillRefId}`;
  if (skillType === 'writing') return `/writing/${skillRefId}`;
  return `/speaking/${skillRefId}`;
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
    if (!attempt) return null;
    if (!selectedSkill) return null;
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

  const readingQuestions = useMemo(
    () => flattenReadingQuestions(resources.reading),
    [resources.reading]
  );

  const listeningQuestions = useMemo(
    () => flattenListeningQuestions(resources.listening),
    [resources.listening]
  );

  const currentUnansweredCount = useMemo(() => {
    if (!selectedSkill) return 0;

    if (selectedSkill === 'reading') {
      const answers = draftSnapshot.answers as Record<string, string> | undefined;
      return countBlankAnswers(
        readingQuestions.map((question) => String(answers?.[question._id] || ''))
      );
    }

    if (selectedSkill === 'listening') {
      const answers = draftSnapshot.answers as Record<string, string> | undefined;
      return countBlankAnswers(
        listeningQuestions.map((question) => String(answers?.[question._id] || ''))
      );
    }

    if (selectedSkill === 'writing') {
      return String(draftSnapshot.content || '').trim() ? 0 : 1;
    }

    const prompts = getSpeakingPrompts(resources.speaking);
    const answers = getAudioAnswers(draftSnapshot);
    return Math.max(0, prompts.length - answers.length);
  }, [draftSnapshot, listeningQuestions, readingQuestions, resources.speaking, selectedSkill]);

  const buildSnapshotForSelectedSkill = () => {
    if (!selectedSkill) {
      return {};
    }

    if (selectedSkill === 'reading') {
      return {
        answers: (draftSnapshot.answers as Record<string, string> | undefined) || {},
        questionOrder: readingQuestions.map((question) => question._id),
        timeSpentSeconds: selectedSkillAttempt?.timeRemainingSeconds != null ? undefined : undefined,
      };
    }

    if (selectedSkill === 'listening') {
      return {
        answers: (draftSnapshot.answers as Record<string, string> | undefined) || {},
        questionOrder: listeningQuestions.map((question) => question._id),
      };
    }

    if (selectedSkill === 'writing') {
      return {
        content: String(draftSnapshot.content || ''),
        taskType: resources.writing?.type,
      };
    }

    return {
      answers: getAudioAnswers(draftSnapshot),
    };
  };

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

    return () => {
      alive = false;
    };
  }, [attemptId]);

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
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [attemptId, selectedSkill]);

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

  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS' || !attempt.currentSkillInProgress) {
      localStorage.removeItem('activeMockSkillLock');
      return;
    }

    localStorage.setItem(
      'activeMockSkillLock',
      JSON.stringify({
        attemptId: attempt._id,
        skillType: attempt.currentSkillInProgress,
      })
    );

    return () => {
      localStorage.removeItem('activeMockSkillLock');
    };
  }, [attempt?._id, attempt?.status, attempt?.currentSkillInProgress]);

  useEffect(() => {
    if (!selectedSkillAttempt) {
      setDraftSnapshot({});
      return;
    }

    const snapshot = (selectedSkillAttempt.answerSnapshot as SkillSnapshot | undefined) || {};
    setDraftSnapshot(snapshot);
  }, [selectedSkillAttempt?._id]);

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

  useEffect(() => {
    if (selectedSkill === 'listening') {
      setListeningPartIndex(0);
    }
  }, [selectedSkill]);

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
      if (!audioUrl) {
        throw new Error('Cloudinary không trả về audio URL.');
      }

      setDraftSnapshot((prev) => {
        const currentAnswers = getAudioAnswers(prev).filter((item) => item.questionKey !== questionKey);
        return {
          ...prev,
          answers: [...currentAnswers, { questionKey, audioUrl }],
        };
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

  const renderReadingWorkspace = () => {
    const reading = resources.reading;
    if (!reading) return null;

    const answers = (draftSnapshot.answers as Record<string, string> | undefined) || {};

    return (
      <div className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-4">
          {reading.passages.map((passage, passageIndex) => (
            <article key={passage._id} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Passage {passageIndex + 1}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{passage.title}</h3>
              </div>
              <div
                className="prose prose-slate max-w-none px-5 py-5 prose-headings:text-slate-900"
                dangerouslySetInnerHTML={{ __html: passage.content }}
              />
            </article>
          ))}
        </div>

        <div className="space-y-4">
          {reading.passages.map((passage) => (
            <article key={`questions-${passage._id}`} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">{passage.title}</h3>
              <div className="mt-5 space-y-4">
                {passage.questions.map((question, index) => (
                  <div key={question._id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                        {question.questionNumber || index + 1}
                      </div>
                      <div className="min-w-0 flex-1 space-y-3">
                        <p className="font-medium text-slate-800">{question.text}</p>
                        {question.options && question.options.length > 0 ? (
                          <div className="space-y-2">
                            {question.options.map((option) => (
                              <label key={option} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
                                <input
                                  type="radio"
                                  disabled={!isSelectedSkillEditable}
                                  name={question._id}
                                  value={option}
                                  checked={answers[question._id] === option}
                                  onChange={(event) => updateMappedAnswer(question._id, event.target.value)}
                                />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <input
                            value={answers[question._id] || ''}
                            disabled={!isSelectedSkillEditable}
                            onChange={(event) => updateMappedAnswer(question._id, event.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-900"
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
      </div>
    );
  };

  const renderListeningWorkspace = () => {
    const listening = resources.listening;
    if (!listening) return null;

    const currentPart = listening.parts[listeningPartIndex];
    const answers = (draftSnapshot.answers as Record<string, string> | undefined) || {};

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {listening.parts.map((part, index) => (
            <button
              key={part.partNumber}
              type="button"
              onClick={() => setListeningPartIndex(index)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                listeningPartIndex === index
                  ? 'bg-red-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-red-50 hover:text-red-600'
              }`}
            >
              Part {part.partNumber}
            </button>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.95fr,1.05fr]">
          <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-500">Listening source</p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">{currentPart.title}</h3>
            </div>
            <div className="space-y-5 px-5 py-5">
              <audio controls preload="none" src={currentPart.audioUrl} className="w-full" />
              <div
                className="prose prose-slate max-w-none prose-headings:text-slate-900"
                dangerouslySetInnerHTML={{ __html: currentPart.description }}
              />
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Questions</h3>
            <div className="mt-5 space-y-4">
              {currentPart.questions.map((question, index) => (
                <div key={question._id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">
                      {listening.parts
                        .slice(0, listeningPartIndex)
                        .reduce((sum, part) => sum + part.questions.length, 0) +
                        index +
                        1}
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <p className="font-medium text-slate-800">{question.questionText.replace(/^\d+\.\s*/, '')}</p>
                      {question.options && question.options.length > 0 ? (
                        question.type === 'multiple_choice' ? (
                          <div className="space-y-2">
                            {question.options.map((option) => (
                              <label key={option} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
                                <input
                                  type="radio"
                                  disabled={!isSelectedSkillEditable}
                                  name={question._id}
                                  value={option}
                                  checked={answers[question._id] === option}
                                  onChange={(event) => updateMappedAnswer(question._id, event.target.value)}
                                />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <select
                            value={answers[question._id] || ''}
                            disabled={!isSelectedSkillEditable}
                            onChange={(event) => updateMappedAnswer(question._id, event.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-red-500"
                          >
                            <option value="">Chọn đáp án</option>
                            {question.options.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        )
                      ) : (
                        <input
                          value={answers[question._id] || ''}
                          disabled={!isSelectedSkillEditable}
                          onChange={(event) => updateMappedAnswer(question._id, event.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-red-500"
                          placeholder="Nhập câu trả lời"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    );
  };

  const renderWritingWorkspace = () => {
    const writing = resources.writing;
    if (!writing) return null;

    return (
      <div className="grid gap-5 xl:grid-cols-[0.95fr,1.05fr]">
        <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-500">Writing prompt</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">{writing.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{writing.type} {writing.category ? `· ${writing.category}` : ''}</p>
          </div>
          <div
            className="prose prose-slate max-w-none px-5 py-5 prose-headings:text-slate-900"
            dangerouslySetInnerHTML={{ __html: writing.contentHtml }}
          />
        </article>

        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-900">Bài làm của bạn</h3>
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
              {String(draftSnapshot.content || '').trim().split(/\s+/).filter(Boolean).length} từ
            </span>
          </div>
          <textarea
            value={String(draftSnapshot.content || '')}
            disabled={!isSelectedSkillEditable}
            onChange={(event) => setDraftSnapshot((prev) => ({ ...prev, content: event.target.value }))}
            className="mt-4 min-h-[520px] w-full rounded-[24px] border border-slate-300 bg-[linear-gradient(180deg,#fffafa_0%,#ffffff_100%)] px-5 py-4 text-[15px] leading-8 text-slate-800 outline-none focus:border-red-400"
            placeholder="Viết bài luận của bạn tại đây..."
          />
        </article>
      </div>
    );
  };

  const renderSpeakingWorkspace = () => {
    const speaking = resources.speaking;
    if (!speaking) return null;

    const audioAnswers = getAudioAnswers(draftSnapshot);
    const audioMap = new Map(audioAnswers.map((item) => [item.questionKey, item.audioUrl]));

    return (
      <div className="space-y-4">
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Upload audio cho từng câu hỏi. Sau khi submit, bạn vẫn có thể mở lại phần Speaking để nghe lại file đã nộp nhưng không sửa nữa.
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {getSpeakingPrompts(speaking).map((prompt) => {
            const audioUrl = audioMap.get(prompt.questionKey);
            const isUploading = speakingUploadingKey === prompt.questionKey;

            return (
              <article key={prompt.questionKey} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                    <Mic className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">{prompt.label}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{prompt.text}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {audioUrl ? (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
                        <FileAudio className="h-4 w-4" />
                        Audio đã nộp
                      </div>
                      <audio controls src={audioUrl} className="w-full" />
                    </div>
                  ) : null}

                  {isSelectedSkillEditable ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              void uploadSpeakingAudio(prompt.questionKey, file);
                            }
                            event.currentTarget.value = '';
                          }}
                        />
                        {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                        {audioUrl ? 'Thay audio' : 'Upload audio'}
                      </label>
                      {audioUrl ? (
                        <button
                          type="button"
                          onClick={() => removeSpeakingAudio(prompt.questionKey)}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
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

  const renderSelectedWorkspace = () => {
    if (!selectedSkill) return null;

    if (resourceLoading[selectedSkill]) {
      return (
        <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-slate-200 bg-white">
          <div className="flex items-center gap-3 text-slate-600">
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

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">Đang tải bài thi...</div>;
  }

  if (!attempt) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">Không tìm thấy tiến trình bài thi.</div>;
  }

  return (
    <section className="space-y-6">
      <header className="overflow-hidden rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,#fffdfd_0%,#ffffff_35%,#f8fafc_100%)] shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-100 bg-white/80 px-6 py-5 backdrop-blur sm:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-500">IELTS Full Mock Test</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{attempt.exam?.title || 'Mock Test'}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{attempt.exam?.description || 'Làm đủ 4 kỹ năng trong cùng một luồng thi thử. Những kỹ năng đã nộp vẫn có thể mở lại để xem ở chế độ chỉ đọc.'}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Global countdown</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{formatSeconds(globalSeconds)}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Trạng thái</p>
                <p className="mt-2 text-lg font-bold text-amber-900">{attempt.status}</p>
                {resolvedOverallBand != null ? (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Overall band: {Number(resolvedOverallBand).toFixed(1)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-5 sm:px-8">
          <div className="grid gap-4 xl:grid-cols-4">
            {SKILL_ORDER.map((skill) => {
              const node = attempt.skills.find((item) => item.skillType === skill);
              const lockedByOther = Boolean(
                currentSkillInProgress && currentSkillInProgress !== skill && node?.status === 'NOT_STARTED'
              );
              const isSelected = selectedSkill === skill;
              const isReviewable = ['SUBMITTED', 'EXPIRED', 'GRADED'].includes(node?.status || '');

              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => setSelectedSkill(skill)}
                  className={`rounded-[24px] border p-4 text-left shadow-sm transition ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-[0.22em] ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>{skill}</p>
                      <p className={`mt-2 text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-700'}`}>Status: {node?.status || 'N/A'}</p>
                      <p className={`mt-1 text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>Time left: {formatSeconds(node?.timeRemainingSeconds || 0)}</p>
                    </div>
                    {isReviewable ? <CheckCircle2 className={`h-5 w-5 ${isSelected ? 'text-emerald-300' : 'text-emerald-500'}`} /> : null}
                  </div>

                  {node?.status === 'NOT_STARTED' && !lockedByOther && attempt.status === 'IN_PROGRESS' ? (
                    <div className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${isSelected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      Sẵn sàng bắt đầu
                    </div>
                  ) : null}
                  {lockedByOther ? (
                    <div className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${isSelected ? 'bg-white/10 text-white' : 'bg-amber-50 text-amber-700'}`}>
                      Đang khóa bởi {currentSkillInProgress}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </header>


      {selectedSkillAttempt ? (
        <div className="space-y-4 rounded-[32px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fff9f9_100%)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                {selectedSkillAttempt.skillType.toUpperCase()} Exam Workspace
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isSelectedSkillEditable
                  ? 'Bạn đang ở chế độ làm bài. Lưu snapshot định kỳ để tránh mất dữ liệu.'
                  : 'Kỹ năng này đang ở chế độ review. Bạn có thể xem lại bài đã nộp nhưng không thể chỉnh sửa.'}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
              <Clock3 className="h-4 w-4" />
              {formatSeconds(selectedSkillAttempt.timeRemainingSeconds)}
            </div>
          </div>

          {isSelectedSkillEditable ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
              <Lock className="mt-0.5 h-4 w-4" />
              Khi đã bắt đầu kỹ năng này, bạn không thể chuyển sang kỹ năng khác cho đến khi nộp.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">
              {selectedSkill === 'reading' ? <PencilLine className="h-4 w-4" /> : null}
              {selectedSkill === 'listening' ? <Headphones className="h-4 w-4" /> : null}
              {selectedSkill === 'writing' ? <PencilLine className="h-4 w-4" /> : null}
              {selectedSkill === 'speaking' ? <Mic className="h-4 w-4" /> : null}
              Chưa trả lời: {currentUnansweredCount}
            </span>
            <a
              href={skillRoute(selectedSkillAttempt.skillType, selectedSkillAttempt.skillRefId)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Mở giao diện gốc ở tab mới
            </a>
          </div>

          {renderSelectedWorkspace()}

          {isSelectedSkillEditable ? (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSaveSnapshot}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Save className="h-4 w-4" />
                Lưu snapshot
              </button>
              <button
                onClick={() => {
                  setPendingAction('skill');
                  setShowSubmitWarning(true);
                }}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                <Send className="h-4 w-4" />
                Nộp kỹ năng
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <button
          onClick={() => {
            setPendingAction('exam');
            setShowSubmitWarning(true);
          }}
          disabled={busy || attempt.status !== 'IN_PROGRESS'}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          Nộp toàn bộ bài thi
        </button>
      </div>

      {showSubmitWarning ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Xác nhận nộp bài
            </h3>
            <p className="mt-3 text-sm text-slate-600">
              Bạn còn {currentUnansweredCount} câu chưa trả lời. Bạn có chắc chắn muốn nộp không?
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
                onClick={() => {
                  setShowSubmitWarning(false);
                  setPendingAction(null);
                }}
              >
                Quay lại
              </button>
              <button
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                onClick={pendingAction === 'skill' ? confirmSubmitSkill : confirmSubmitExam}
              >
                Xác nhận nộp
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
