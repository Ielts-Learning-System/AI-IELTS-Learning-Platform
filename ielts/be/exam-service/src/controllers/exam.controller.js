const multer = require('multer');
const FormData = require('form-data');

const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');
const SkillAttempt = require('../models/SkillAttempt');
const {
  SKILL_TYPES,
  resolveSkillDurations,
  secondsRemaining,
  buildAttemptPayload,
  finalizeExamAttemptIfDone,
  expireDueAttempts,
  gradeExamAttempt,
} = require('../services/examLifecycle.service');
const {
  aiClient,
  readingClient,
  listeningClient,
  writingClient,
  speakingClient,
} = require('../services/httpClients.service');

const upload = multer({ storage: multer.memoryStorage() });

function createError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function ensureExamSkillRefs(payload) {
  const refs = payload?.skillRefs || {};
  const required = ['readingId', 'listeningId', 'writingId', 'speakingId'];
  for (const key of required) {
    if (!refs[key] || !String(refs[key]).trim()) {
      throw createError(`Missing required reference: ${key}`);
    }
  }
}

function sanitizeExamPayload(body, userId) {
  ensureExamSkillRefs(body);

  const status = body.publish ? 'PUBLISHED' : (body.status || 'DRAFT');

  return {
    title: String(body.title || '').trim(),
    description: String(body.description || ''),
    durationMinutes: Number(body.durationMinutes || 165),
    globalLimitHours: Number(body.globalLimitHours || 24),
    skillDurations: body.skillDurations || undefined,
    skillRefs: {
      readingId: String(body.skillRefs.readingId),
      listeningId: String(body.skillRefs.listeningId),
      writingId: String(body.skillRefs.writingId),
      speakingId: String(body.skillRefs.speakingId),
    },
    status,
    createdBy: String(userId),
    publishedAt: status === 'PUBLISHED' ? new Date() : undefined,
  };
}

function mapSkillRef(exam, skillType) {
  if (skillType === 'reading') return exam.skillRefs.readingId;
  if (skillType === 'listening') return exam.skillRefs.listeningId;
  if (skillType === 'writing') return exam.skillRefs.writingId;
  return exam.skillRefs.speakingId;
}

function unwrapData(payload) {
  return payload?.data || payload;
}

function buildAuthHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractBearerToken(req) {
  if (!req.headers.authorization?.startsWith('Bearer ')) return null;
  return req.headers.authorization.split(' ')[1];
}

async function fetchManualGradingIndex(token) {
  const headers = buildAuthHeaders(token);
  if (!headers.Authorization) {
    return {
      writingById: new Map(),
      speakingById: new Map(),
    };
  }

  const [writingGradedRes, speakingGradedRes] = await Promise.allSettled([
    writingClient.get('/submissions/graded', { headers }),
    speakingClient.get('/graded', { headers }),
  ]);

  const writingItems = writingGradedRes.status === 'fulfilled'
    ? unwrapData(writingGradedRes.value.data) || []
    : [];
  const speakingItems = speakingGradedRes.status === 'fulfilled'
    ? unwrapData(speakingGradedRes.value.data) || []
    : [];

  return {
    writingById: new Map(
      (Array.isArray(writingItems) ? writingItems : []).map((item) => [String(item._id), item])
    ),
    speakingById: new Map(
      (Array.isArray(speakingItems) ? speakingItems : []).map((item) => [String(item._id), item])
    ),
  };
}

async function syncAttemptManualGrading(attemptId, gradingIndex) {
  const skills = await SkillAttempt.find({ examAttemptId: attemptId });
  if (!skills.length) return { synced: false, skills };

  let changed = false;

  for (const skill of skills) {
    const submissionId = String(skill?.gradingMetadata?.externalSubmissionId || '').trim();
    if (!submissionId) continue;

    if (skill.skillType === 'writing') {
      const gradedSubmission = gradingIndex.writingById.get(submissionId);
      if (!gradedSubmission) continue;

      const nextBand = Number(gradedSubmission?.grading?.overallBand);
      const normalizedBand = Number.isFinite(nextBand) ? nextBand : undefined;

      if (normalizedBand != null && (skill.status !== 'GRADED' || skill.gradedBand !== normalizedBand)) {
        skill.status = 'GRADED';
        skill.gradedBand = normalizedBand;
        skill.gradingMetadata = {
          ...(skill.gradingMetadata || {}),
          externalResult: gradedSubmission,
          syncedAt: new Date(),
        };
        await skill.save();
        changed = true;
      }

      continue;
    }

    if (skill.skillType === 'speaking') {
      const gradedSubmission = gradingIndex.speakingById.get(submissionId);
      if (!gradedSubmission) continue;

      const nextBand = Number(gradedSubmission?.grading?.overallBand);
      const normalizedBand = Number.isFinite(nextBand) ? nextBand : undefined;

      if (normalizedBand != null && (skill.status !== 'GRADED' || skill.gradedBand !== normalizedBand)) {
        skill.status = 'GRADED';
        skill.gradedBand = normalizedBand;
        skill.gradingMetadata = {
          ...(skill.gradingMetadata || {}),
          externalResult: gradedSubmission,
          syncedAt: new Date(),
        };
        await skill.save();
        changed = true;
      }
    }
  }

  if (changed) {
    await gradeExamAttempt({ attemptId });
  }

  const refreshed = await SkillAttempt.find({ examAttemptId: attemptId }).lean();
  return { synced: changed, skills: refreshed };
}

function sortAnswerEntries(entries) {
  return entries.sort((left, right) => {
    const leftKey = String(left[0]);
    const rightKey = String(right[0]);
    const leftNumber = Number.parseInt(leftKey.replace(/\D/g, ''), 10);
    const rightNumber = Number.parseInt(rightKey.replace(/\D/g, ''), 10);

    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
      return leftNumber - rightNumber;
    }

    return leftKey.localeCompare(rightKey);
  });
}

function extractOrderedAnswers(answerSnapshot) {
  if (!answerSnapshot || typeof answerSnapshot !== 'object') {
    return [];
  }

  if (Array.isArray(answerSnapshot.studentAnswers)) {
    return answerSnapshot.studentAnswers.map((answer) => String(answer || ''));
  }

  if (Array.isArray(answerSnapshot.answers)) {
    return answerSnapshot.answers.map((answer) => {
      if (answer && typeof answer === 'object') {
        return String(answer.value || answer.answer || answer.response || '');
      }
      return String(answer || '');
    });
  }

  const answerMap = answerSnapshot.answers && typeof answerSnapshot.answers === 'object'
    ? answerSnapshot.answers
    : answerSnapshot.answerMap && typeof answerSnapshot.answerMap === 'object'
      ? answerSnapshot.answerMap
      : null;

  if (!answerMap) {
    return [];
  }

  if (Array.isArray(answerSnapshot.questionOrder) && answerSnapshot.questionOrder.length > 0) {
    return answerSnapshot.questionOrder.map((key) => String(answerMap[key] || ''));
  }

  return sortAnswerEntries(Object.entries(answerMap)).map(([, value]) => String(value || ''));
}

function extractWritingContent(answerSnapshot) {
  if (!answerSnapshot || typeof answerSnapshot !== 'object') {
    return '';
  }

  return String(
    answerSnapshot.content ||
      answerSnapshot.essay ||
      answerSnapshot.text ||
      answerSnapshot.answer ||
      ''
  ).trim();
}

function extractSpeakingAnswers(answerSnapshot) {
  if (!answerSnapshot || typeof answerSnapshot !== 'object') {
    return [];
  }

  const candidates = [
    answerSnapshot.answers,
    answerSnapshot.audioAnswers,
    answerSnapshot.recordings,
  ];

  for (const list of candidates) {
    if (!Array.isArray(list)) continue;
    const normalized = list
      .map((item) => ({
        questionKey: String(item?.questionKey || item?.key || '').trim(),
        audioUrl: String(item?.audioUrl || item?.url || '').trim(),
      }))
      .filter((item) => item.questionKey && item.audioUrl);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return [];
}

function resolveSkillTimeSpent(skill, answerSnapshot) {
  const explicit = Number(answerSnapshot?.timeSpent || answerSnapshot?.timeSpentSeconds);
  if (Number.isFinite(explicit) && explicit >= 0) {
    return Math.floor(explicit);
  }

  if (!skill?.skillStartTime) {
    return 0;
  }

  const endTime = skill.skillEndTime ? new Date(skill.skillEndTime).getTime() : Date.now();
  const startTime = new Date(skill.skillStartTime).getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return 0;
  }

  return Math.max(0, Math.floor((endTime - startTime) / 1000));
}

async function submitSkillToProvider({ skill, token }) {
  const headers = buildAuthHeaders(token);
  const answerSnapshot = skill.answerSnapshot || {};

  if (skill.skillType === 'reading') {
    const response = await readingClient.post(
      `/${skill.skillRefId}/submit`,
      {
        studentAnswers: extractOrderedAnswers(answerSnapshot),
        timeSpent: resolveSkillTimeSpent(skill, answerSnapshot),
      },
      { headers }
    );

    const result = unwrapData(response.data);
    return {
      externalSubmissionId: result?._id,
      externalResult: result,
      gradedBand: result?.bandScore,
    };
  }

  if (skill.skillType === 'listening') {
    const response = await listeningClient.post(
      `/${skill.skillRefId}/submit`,
      {
        studentAnswers: extractOrderedAnswers(answerSnapshot),
        timeSpent: resolveSkillTimeSpent(skill, answerSnapshot),
      },
      { headers }
    );

    const result = unwrapData(response.data);
    return {
      externalSubmissionId: result?._id,
      externalResult: result,
      gradedBand: result?.bandScore,
    };
  }

  if (skill.skillType === 'writing') {
    const promptResponse = await writingClient.get(`/items/${skill.skillRefId}`, { headers });
    const prompt = unwrapData(promptResponse.data);
    const content = extractWritingContent(answerSnapshot);

    if (!content) {
      throw createError('Writing submission content is empty');
    }

    const response = await writingClient.post(
      '/submissions',
      {
        writingId: skill.skillRefId,
        taskType: answerSnapshot.taskType || prompt?.type,
        content,
      },
      { headers }
    );

    const result = unwrapData(response.data);
    return {
      externalSubmissionId: result?._id,
      externalResult: result,
    };
  }

  const answers = extractSpeakingAnswers(answerSnapshot);
  if (answers.length === 0) {
    throw createError('Speaking submission requires at least one recorded answer');
  }

  const response = await speakingClient.post(
    `/tests/${skill.skillRefId}/attempt`,
    {
      answers,
      forceNew: Boolean(answerSnapshot.forceNew),
    },
    { headers }
  );

  const result = unwrapData(response.data);
  return {
    externalSubmissionId: result?._id,
    externalResult: result,
  };
}

async function getAttemptWithOwnership(attemptId, userId) {
  const attempt = await ExamAttempt.findById(attemptId);
  if (!attempt) {
    throw createError('Exam attempt not found', 404);
  }

  if (String(attempt.userId) !== String(userId)) {
    throw createError('Forbidden attempt access', 403);
  }

  return attempt;
}

function extractSkillPayloads(aiResponseData) {
  const payload = aiResponseData?.data || aiResponseData;

  const candidates = [
    payload,
    payload?.skills,
    payload?.result,
    payload?.result?.skills,
  ].filter(Boolean);

  let reading;
  let listening;
  let writing;
  let speaking;

  for (const c of candidates) {
    reading = reading || c.reading;
    listening = listening || c.listening;
    writing = writing || c.writing;
    speaking = speaking || c.speaking;
  }

  if (!reading || !listening || !writing || !speaking) {
    throw createError(
      'AI extraction result is missing one or more skill payloads (reading/listening/writing/speaking)',
      502
    );
  }

  return { reading, listening, writing, speaking };
}

async function createSkillResources({ token, reading, listening, writing, speaking }) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [readingRes, listeningRes, writingRes, speakingRes] = await Promise.all([
    readingClient.post('/', reading, { headers }),
    listeningClient.post('/', listening, { headers }),
    writingClient.post('/', writing, { headers }),
    speakingClient.post('/tests', speaking, { headers }),
  ]);

  const readingId = readingRes.data?.data?._id || readingRes.data?._id;
  const listeningId = listeningRes.data?.data?._id || listeningRes.data?._id;
  const writingId = writingRes.data?.data?._id || writingRes.data?._id;
  const speakingId = speakingRes.data?.data?._id || speakingRes.data?._id;

  if (!readingId || !listeningId || !writingId || !speakingId) {
    throw createError('Failed to create one or more skill records from extracted payload', 502);
  }

  return { readingId, listeningId, writingId, speakingId };
}

exports.upload = upload;

exports.createExam = async (req, res, next) => {
  try {
    const payload = sanitizeExamPayload(req.body, req.user.id);
    if (!payload.title) {
      throw createError('title is required');
    }

    const exam = await Exam.create(payload);

    res.status(201).json({
      success: true,
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};

exports.publishExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) throw createError('Exam not found', 404);

    exam.status = 'PUBLISHED';
    exam.publishedAt = new Date();
    await exam.save();

    res.json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

exports.deleteExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) throw createError('Exam not found', 404);

    await SkillAttempt.deleteMany({ examId: exam._id });
    await ExamAttempt.deleteMany({ examId: exam._id });
    await exam.deleteOne();

    res.json({ success: true, data: { examId: req.params.examId } });
  } catch (error) {
    next(error);
  }
};

exports.listTeacherExams = async (req, res, next) => {
  try {
    const exams = await Exam.find().sort({ createdAt: -1 });
    res.json({ success: true, data: exams });
  } catch (error) {
    next(error);
  }
};

exports.listStudentExams = async (req, res, next) => {
  try {
    const exams = await Exam.find({ status: 'PUBLISHED' }).sort({ createdAt: -1 }).lean();

    const attempts = await ExamAttempt.find({
      userId: req.user.id,
      examId: { $in: exams.map((e) => e._id) },
    })
      .sort({ createdAt: -1 })
      .lean();

    const latestByExam = new Map();
    for (const attempt of attempts) {
      const key = String(attempt.examId);
      if (!latestByExam.has(key)) latestByExam.set(key, attempt);
    }

    const latestAttemptIds = Array.from(latestByExam.values()).map((a) => a._id);
    const skillAttempts = await SkillAttempt.find({
      examAttemptId: { $in: latestAttemptIds },
    }).lean();

    const skillsByAttempt = new Map();
    for (const skill of skillAttempts) {
      const key = String(skill.examAttemptId);
      if (!skillsByAttempt.has(key)) skillsByAttempt.set(key, []);
      skillsByAttempt.get(key).push(skill);
    }

    const data = exams.map((exam) => {
      const latest = latestByExam.get(String(exam._id));
      const skills = latest ? (skillsByAttempt.get(String(latest._id)) || []) : [];
      const doneCount = skills.filter((s) => ['SUBMITTED', 'EXPIRED', 'GRADED'].includes(s.status)).length;
      const progressPercent = skills.length ? Math.round((doneCount / skills.length) * 100) : 0;
      return {
        ...exam,
        latestAttempt: latest || null,
        progress: {
          doneCount,
          totalSkills: skills.length || 4,
          percent: progressPercent,
        },
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.startExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam || exam.status !== 'PUBLISHED') {
      throw createError('Exam not found or not published', 404);
    }

    let existing = await ExamAttempt.findOne({
      examId: exam._id,
      userId: req.user.id,
      status: 'IN_PROGRESS',
    }).sort({ createdAt: -1 });

    if (existing) {
      await expireDueAttempts(existing._id);
      existing = await ExamAttempt.findById(existing._id);
      if (existing && existing.status === 'IN_PROGRESS') {
        const payload = await buildAttemptPayload(existing._id, req.user.id);
        return res.json({ success: true, data: payload });
      }
    }

    const start = new Date();
    const end = new Date(start.getTime() + (Number(exam.globalLimitHours || 24) * 60 * 60 * 1000));

    const attempt = await ExamAttempt.create({
      examId: exam._id,
      userId: req.user.id,
      globalStartTime: start,
      globalEndTime: end,
      status: 'IN_PROGRESS',
      metadata: {
        createdFrom: 'student_start',
      },
    });

    const durations = resolveSkillDurations(exam);
    const docs = SKILL_TYPES.map((skillType) => ({
      examAttemptId: attempt._id,
      examId: exam._id,
      userId: req.user.id,
      skillType,
      skillRefId: mapSkillRef(exam, skillType),
      status: 'NOT_STARTED',
      timeRemainingSeconds: Number(durations[skillType]) * 60,
      answerSnapshot: {},
    }));

    await SkillAttempt.insertMany(docs);

    const payload = await buildAttemptPayload(attempt._id, req.user.id);
    return res.status(201).json({ success: true, data: payload });
  } catch (error) {
    next(error);
  }
};

exports.getAttempt = async (req, res, next) => {
  try {
    await expireDueAttempts(req.params.attemptId);
    const attempt = await getAttemptWithOwnership(req.params.attemptId, req.user.id);
    const payload = await buildAttemptPayload(attempt._id, req.user.id);
    res.json({ success: true, data: payload });
  } catch (error) {
    next(error);
  }
};

exports.startSkill = async (req, res, next) => {
  try {
    const { attemptId, skillType } = req.params;
    if (!SKILL_TYPES.includes(skillType)) throw createError('Invalid skill type');

    await expireDueAttempts(attemptId);
    const attempt = await getAttemptWithOwnership(attemptId, req.user.id);
    if (attempt.status !== 'IN_PROGRESS') {
      throw createError(`Exam attempt is ${attempt.status}. Cannot start skill.`, 409);
    }

    const allSkills = await SkillAttempt.find({ examAttemptId: attempt._id });
    const target = allSkills.find((s) => s.skillType === skillType);
    if (!target) throw createError('Skill attempt not found', 404);

    const otherInProgress = allSkills.find(
      (s) => s.skillType !== skillType && s.status === 'IN_PROGRESS'
    );
    if (otherInProgress) {
      throw createError(
        `Cannot start ${skillType}. ${otherInProgress.skillType} is already in progress and must be submitted first.`,
        409
      );
    }

    if (['SUBMITTED', 'EXPIRED', 'GRADED'].includes(target.status)) {
      throw createError(`Skill ${skillType} is already ${target.status}`, 409);
    }

    if (target.status === 'NOT_STARTED') {
      const exam = await Exam.findById(attempt.examId);
      const durations = resolveSkillDurations(exam);
      const now = new Date();
      const deadlineAt = new Date(now.getTime() + Number(durations[skillType]) * 60 * 1000);

      target.status = 'IN_PROGRESS';
      target.skillStartTime = now;
      target.deadlineAt = deadlineAt;
      target.timeRemainingSeconds = secondsRemaining(deadlineAt);
      await target.save();
    } else if (target.status === 'IN_PROGRESS') {
      target.timeRemainingSeconds = secondsRemaining(target.deadlineAt);
      await target.save();
    }

    const payload = await buildAttemptPayload(attempt._id, req.user.id);
    res.json({ success: true, data: payload });
  } catch (error) {
    next(error);
  }
};

exports.saveSkillSnapshot = async (req, res, next) => {
  try {
    const { attemptId, skillType } = req.params;

    await expireDueAttempts(attemptId);
    const attempt = await getAttemptWithOwnership(attemptId, req.user.id);
    if (attempt.status !== 'IN_PROGRESS') {
      throw createError(`Exam attempt is ${attempt.status}.`, 409);
    }

    const skill = await SkillAttempt.findOne({
      examAttemptId: attempt._id,
      skillType,
    });

    if (!skill) throw createError('Skill attempt not found', 404);
    if (skill.status !== 'IN_PROGRESS') {
      throw createError(`Skill is ${skill.status}. Snapshot not allowed.`, 409);
    }

    if (skill.deadlineAt && new Date(skill.deadlineAt).getTime() <= Date.now()) {
      skill.status = 'EXPIRED';
      skill.autoSubmitted = true;
      skill.skillEndTime = new Date();
      skill.timeRemainingSeconds = 0;
      await skill.save();

      await finalizeExamAttemptIfDone(attempt._id, 'skill_timeout');
      throw createError('Skill time is over. Skill auto-submitted.', 409);
    }

    skill.answerSnapshot = req.body.answerSnapshot || skill.answerSnapshot || {};
    skill.unansweredCount = Math.max(0, Number(req.body.unansweredCount || 0));
    skill.lastSavedAt = new Date();
    skill.timeRemainingSeconds = secondsRemaining(skill.deadlineAt);
    await skill.save();

    const payload = await buildAttemptPayload(attempt._id, req.user.id);
    res.json({ success: true, data: payload });
  } catch (error) {
    next(error);
  }
};

exports.submitSkill = async (req, res, next) => {
  try {
    const { attemptId, skillType } = req.params;

    await expireDueAttempts(attemptId);
    const attempt = await getAttemptWithOwnership(attemptId, req.user.id);
    const skill = await SkillAttempt.findOne({ examAttemptId: attempt._id, skillType });

    if (!skill) throw createError('Skill attempt not found', 404);
    if (!['IN_PROGRESS', 'NOT_STARTED'].includes(skill.status)) {
      throw createError(`Skill is already ${skill.status}`, 409);
    }

    const now = new Date();
    const expiredByTimer = skill.deadlineAt && new Date(skill.deadlineAt).getTime() <= now.getTime();

    skill.answerSnapshot = req.body.answerSnapshot || skill.answerSnapshot || {};
    skill.unansweredCount = Math.max(0, Number(req.body.unansweredCount || skill.unansweredCount || 0));
    skill.lastSavedAt = now;
    skill.skillEndTime = now;
    skill.timeRemainingSeconds = 0;
    skill.autoSubmitted = Boolean(req.body.autoSubmitted) || Boolean(expiredByTimer);
    skill.status = expiredByTimer ? 'EXPIRED' : 'SUBMITTED';

    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null;
    const providerResult = await submitSkillToProvider({ skill, token });

    skill.gradingMetadata = {
      ...(skill.gradingMetadata || {}),
      externalSubmissionId: providerResult.externalSubmissionId,
      externalResult: providerResult.externalResult,
      syncedAt: now,
    };

    if (providerResult.gradedBand != null) {
      skill.gradedBand = Number(providerResult.gradedBand);
      skill.status = 'GRADED';
    }

    await skill.save();

    await finalizeExamAttemptIfDone(attempt._id, expiredByTimer ? 'skill_timeout' : 'manual_submit');

    const payload = await buildAttemptPayload(attempt._id, req.user.id);
    res.json({ success: true, data: payload });
  } catch (error) {
    next(error);
  }
};

exports.submitExam = async (req, res, next) => {
  try {
    const attempt = await getAttemptWithOwnership(req.params.attemptId, req.user.id);
    const skills = await SkillAttempt.find({ examAttemptId: attempt._id });

    const now = new Date();
    for (const skill of skills) {
      if (['SUBMITTED', 'EXPIRED', 'GRADED'].includes(skill.status)) continue;

      skill.status = 'SUBMITTED';
      skill.skillEndTime = now;
      skill.timeRemainingSeconds = 0;
      skill.autoSubmitted = Boolean(req.body.autoSubmitted);
      await skill.save();
    }

    await finalizeExamAttemptIfDone(attempt._id, req.body.autoSubmitted ? 'auto_submit' : 'manual_exam_submit');

    const payload = await buildAttemptPayload(attempt._id, req.user.id);
    res.json({ success: true, data: payload });
  } catch (error) {
    next(error);
  }
};

exports.listMonitoringAttempts = async (req, res, next) => {
  try {
    await expireDueAttempts();

    const token = extractBearerToken(req);
    const gradingIndex = await fetchManualGradingIndex(token);

    const attempts = await ExamAttempt.find({
      status: { $in: ['IN_PROGRESS', 'SUBMITTED', 'EXPIRED'] },
    })
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();

    const attemptIds = attempts.map((a) => a._id);
    const skills = await SkillAttempt.find({ examAttemptId: { $in: attemptIds } }).lean();

    const byAttempt = new Map();
    for (const skill of skills) {
      const key = String(skill.examAttemptId);
      if (!byAttempt.has(key)) byAttempt.set(key, []);
      byAttempt.get(key).push(skill);
    }

    const syncTargets = attempts
      .map((attempt) => ({ attemptId: attempt._id, skills: byAttempt.get(String(attempt._id)) || [] }))
      .filter(({ skills: attemptSkills }) =>
        attemptSkills.some((skill) =>
          ['writing', 'speaking'].includes(skill.skillType) &&
          ['SUBMITTED', 'EXPIRED'].includes(skill.status) &&
          String(skill?.gradingMetadata?.externalSubmissionId || '').trim()
        )
      );

    if (syncTargets.length > 0) {
      await Promise.all(syncTargets.map(({ attemptId }) => syncAttemptManualGrading(attemptId, gradingIndex)));

      const refreshedSkills = await SkillAttempt.find({ examAttemptId: { $in: attemptIds } }).lean();
      byAttempt.clear();
      for (const skill of refreshedSkills) {
        const key = String(skill.examAttemptId);
        if (!byAttempt.has(key)) byAttempt.set(key, []);
        byAttempt.get(key).push(skill);
      }
    }

    const data = attempts.map((attempt) => {
      const list = byAttempt.get(String(attempt._id)) || [];
      const active = list.find((s) => s.status === 'IN_PROGRESS') || null;
      const doneCount = list.filter((s) => ['SUBMITTED', 'EXPIRED', 'GRADED'].includes(s.status)).length;
      return {
        ...attempt,
        activeSkill: active
          ? {
              skillType: active.skillType,
              timeRemainingSeconds: secondsRemaining(active.deadlineAt),
            }
          : null,
        doneCount,
        totalSkills: 4,
        skillSummaries: list.map((skill) => ({
          skillType: skill.skillType,
          status: skill.status,
          band: skill.gradedBand,
          unansweredCount: skill.unansweredCount,
          externalSubmissionId: skill?.gradingMetadata?.externalSubmissionId,
          externalResult: skill?.gradingMetadata?.externalResult,
        })),
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.gradeAttempt = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    const gradingIndex = await fetchManualGradingIndex(token);
    await syncAttemptManualGrading(req.params.attemptId, gradingIndex);

    const result = await gradeExamAttempt({
      attemptId: req.params.attemptId,
      writingBand: req.body.writingBand,
      speakingBand: req.body.speakingBand,
      readingBand: req.body.readingBand,
      listeningBand: req.body.listeningBand,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.getAttemptForTeacher = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    const gradingIndex = await fetchManualGradingIndex(token);
    await syncAttemptManualGrading(req.params.attemptId, gradingIndex);

    const attempt = await ExamAttempt.findById(req.params.attemptId).lean();
    if (!attempt) throw createError('Attempt not found', 404);

    const exam = await Exam.findById(attempt.examId).lean();
    const skills = await SkillAttempt.find({ examAttemptId: attempt._id }).lean();

    const writingSkill = skills.find((skill) => skill.skillType === 'writing');
    const speakingSkill = skills.find((skill) => skill.skillType === 'speaking');

    const gradingLinks = {
      writing: writingSkill?.gradingMetadata?.externalSubmissionId
        ? `/teacher/writing/${writingSkill.gradingMetadata.externalSubmissionId}`
        : null,
      speaking: speakingSkill?.gradingMetadata?.externalSubmissionId
        ? `/teacher/speaking/${speakingSkill.gradingMetadata.externalSubmissionId}`
        : null,
    };

    res.json({
      success: true,
      data: {
        ...attempt,
        exam,
        skills,
        gradingLinks,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Build a FormData for one skill extraction call to /api/ai/extract-test.
 * Field names must match the FastAPI endpoint: testFile / answerKeyFile / testType.
 */
function buildSkillForm(testType, examBuffer, examFilename, examMime, keyBuffer, keyFilename, keyMime) {
  const form = new FormData();
  form.append('testType', testType);
  form.append('testFile', examBuffer, { filename: examFilename, contentType: examMime });
  // answer key only used for reading + listening
  if (keyBuffer && (testType === 'reading' || testType === 'listening')) {
    form.append('answerKeyFile', keyBuffer, { filename: keyFilename, contentType: keyMime });
  }
  return form;
}

exports.createExamFromPdf = async (req, res, next) => {
  try {
    const fullExamFile = req.files?.fullExamPdf?.[0];
    const answerKeyFile = req.files?.answerKeyPdf?.[0];

    if (!fullExamFile || !answerKeyFile) {
      throw createError('fullExamPdf and answerKeyPdf are required');
    }

    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null;

    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    // Call /api/ai/extract-test once per skill type (in parallel).
    // The AI endpoint accepts exactly one testType at a time.
    const skillTypes = ['reading', 'listening', 'writing', 'speaking'];
    const skillResults = await Promise.all(
      skillTypes.map(async (skillType) => {
        const form = buildSkillForm(
          skillType,
          fullExamFile.buffer,
          fullExamFile.originalname,
          fullExamFile.mimetype,
          answerKeyFile.buffer,
          answerKeyFile.originalname,
          answerKeyFile.mimetype,
        );
        const res = await aiClient.post('/api/ai/extract-test', form, {
          headers: { ...form.getHeaders(), ...authHeaders },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });
        return { skillType, data: res.data };
      })
    );

    // Assemble the combined payload that extractSkillPayloads expects
    const combinedPayload = {};
    for (const { skillType, data } of skillResults) {
      combinedPayload[skillType] = data;
    }

    const { reading, listening, writing, speaking } = extractSkillPayloads(combinedPayload);
    const refs = await createSkillResources({ token, reading, listening, writing, speaking });

    const payload = sanitizeExamPayload(
      {
        ...req.body,
        skillRefs: refs,
      },
      req.user.id
    );

    if (!payload.title) {
      payload.title = `Mock Test ${new Date().toISOString().slice(0, 10)}`;
    }

    const exam = await Exam.create(payload);

    res.status(201).json({
      success: true,
      data: {
        exam,
        refs,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /teacher/students/:userId/attempts
 * Teacher/Admin: fetch all exam attempts (any status) for a given student.
 */
exports.getStudentAttempts = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const attempts = await ExamAttempt.find({ userId })
      .sort({ createdAt: 1 })
      .lean();
    res.json({ success: true, data: attempts });
  } catch (error) {
    next(error);
  }
};
