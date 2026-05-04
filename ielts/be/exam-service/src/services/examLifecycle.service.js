const ExamAttempt = require('../models/ExamAttempt');
const SkillAttempt = require('../models/SkillAttempt');
const Exam = require('../models/Exam');
const { publishEvent } = require('./rabbitmq.service');

const SKILL_TYPES = ['reading', 'listening', 'writing', 'speaking'];
const FINAL_SKILL_STATUSES = ['SUBMITTED', 'EXPIRED', 'GRADED'];

function roundToHalf(value) {
  return Math.round(value * 2) / 2;
}

function now() {
  return new Date();
}

function secondsRemaining(deadlineAt) {
  if (!deadlineAt) return 0;
  return Math.max(0, Math.floor((deadlineAt.getTime() - Date.now()) / 1000));
}

function defaultSkillDurations() {
  return {
    reading: 60,
    listening: 30,
    writing: 60,
    speaking: 15,
  };
}

function resolveSkillDurations(exam) {
  return {
    ...defaultSkillDurations(),
    ...(exam.skillDurations || {}),
  };
}

async function buildAttemptPayload(attemptId, userId) {
  const attempt = await ExamAttempt.findById(attemptId).lean();
  if (!attempt) return null;

  const exam = await Exam.findById(attempt.examId).lean();
  const skills = await SkillAttempt.find({ examAttemptId: attempt._id }).sort({ skillType: 1 }).lean();

  return {
    ...attempt,
    exam,
    skills,
    isGlobalExpired: new Date(attempt.globalEndTime).getTime() <= Date.now(),
    globalTimeRemainingSeconds: secondsRemaining(new Date(attempt.globalEndTime)),
    currentSkillInProgress: skills.find((s) => s.status === 'IN_PROGRESS')?.skillType || null,
    userId,
  };
}

function computeBandsFromSkills(skills) {
  const map = {
    reading: undefined,
    listening: undefined,
    writing: undefined,
    speaking: undefined,
  };

  for (const skill of skills) {
    if (skill.gradedBand == null) continue;
    map[skill.skillType] = Number(skill.gradedBand);
  }

  const allBands = SKILL_TYPES.map((k) => map[k]).filter((v) => typeof v === 'number');
  if (allBands.length !== 4) {
    return map;
  }

  const avg = allBands.reduce((sum, val) => sum + val, 0) / 4;
  return {
    ...map,
    overall: roundToHalf(avg),
  };
}

async function finalizeExamAttemptIfDone(examAttemptId, reason = 'completed') {
  const attempt = await ExamAttempt.findById(examAttemptId);
  if (!attempt) return null;

  const skills = await SkillAttempt.find({ examAttemptId: attempt._id });
  const allDone = skills.every((s) => FINAL_SKILL_STATUSES.includes(s.status));

  if (!allDone) {
    return {
      attempt,
      skills,
      finalized: false,
    };
  }

  const priorStatus = attempt.status;

  if (priorStatus === 'IN_PROGRESS') {
    attempt.status = skills.some((s) => s.status === 'EXPIRED') ? 'EXPIRED' : 'SUBMITTED';
    attempt.submittedAt = now();
    attempt.lastActivityAt = now();
    await attempt.save();

    await publishEvent('exam.completed', {
      userId: attempt.userId,
      entityType: 'ExamAttempt',
      entityId: String(attempt._id),
      examId: String(attempt.examId),
      metadata: {
        reason,
        status: attempt.status,
      },
    });
  }

  return {
    attempt,
    skills,
    finalized: true,
  };
}

async function expireGlobalAttempt(attempt, reason = 'global_timeout') {
  if (!attempt || attempt.status !== 'IN_PROGRESS') return null;

  const time = now();
  const skills = await SkillAttempt.find({ examAttemptId: attempt._id });

  for (const skill of skills) {
    if (FINAL_SKILL_STATUSES.includes(skill.status)) continue;

    skill.status = 'EXPIRED';
    skill.autoSubmitted = true;
    skill.skillEndTime = time;
    skill.timeRemainingSeconds = 0;
    await skill.save();
  }

  attempt.status = 'EXPIRED';
  attempt.submittedAt = time;
  attempt.lastActivityAt = time;
  await attempt.save();

  await publishEvent('exam.completed', {
    userId: attempt.userId,
    entityType: 'ExamAttempt',
    entityId: String(attempt._id),
    examId: String(attempt.examId),
    metadata: {
      reason,
      status: 'EXPIRED',
    },
  });

  return attempt;
}

async function expireDueAttempts(optionalAttemptId = null) {
  const time = now();

  const query = optionalAttemptId
    ? { _id: optionalAttemptId, status: 'IN_PROGRESS' }
    : { status: 'IN_PROGRESS' };

  const inProgressAttempts = await ExamAttempt.find(query);

  for (const attempt of inProgressAttempts) {
    if (new Date(attempt.globalEndTime).getTime() <= time.getTime()) {
      await expireGlobalAttempt(attempt, 'global_timeout');
      continue;
    }

    const inProgressSkills = await SkillAttempt.find({
      examAttemptId: attempt._id,
      status: 'IN_PROGRESS',
    });

    for (const skill of inProgressSkills) {
      if (!skill.deadlineAt) continue;

      if (new Date(skill.deadlineAt).getTime() <= time.getTime()) {
        skill.status = 'EXPIRED';
        skill.autoSubmitted = true;
        skill.skillEndTime = time;
        skill.timeRemainingSeconds = 0;
        await skill.save();
      } else {
        skill.timeRemainingSeconds = secondsRemaining(new Date(skill.deadlineAt));
        await skill.save();
      }
    }

    await finalizeExamAttemptIfDone(attempt._id, 'skill_timeout');
  }
}

async function gradeExamAttempt({ attemptId, writingBand, speakingBand, readingBand, listeningBand }) {
  const attempt = await ExamAttempt.findById(attemptId);
  if (!attempt) {
    throw new Error('Exam attempt not found');
  }

  const skills = await SkillAttempt.find({ examAttemptId: attempt._id });

  for (const skill of skills) {
    if (skill.skillType === 'writing' && writingBand != null) {
      skill.gradedBand = Number(writingBand);
      skill.status = 'GRADED';
      await skill.save();
    }

    if (skill.skillType === 'speaking' && speakingBand != null) {
      skill.gradedBand = Number(speakingBand);
      skill.status = 'GRADED';
      await skill.save();
    }

    if (skill.skillType === 'reading' && readingBand != null) {
      skill.gradedBand = Number(readingBand);
      if (skill.status !== 'GRADED') skill.status = 'GRADED';
      await skill.save();
    }

    if (skill.skillType === 'listening' && listeningBand != null) {
      skill.gradedBand = Number(listeningBand);
      if (skill.status !== 'GRADED') skill.status = 'GRADED';
      await skill.save();
    }
  }

  const updatedSkills = await SkillAttempt.find({ examAttemptId: attempt._id });
  const bands = computeBandsFromSkills(updatedSkills);

  const writing = updatedSkills.find((s) => s.skillType === 'writing');
  const speaking = updatedSkills.find((s) => s.skillType === 'speaking');

  if (writing?.status !== 'GRADED' || speaking?.status !== 'GRADED') {
    return {
      attempt,
      skills: updatedSkills,
      completed: false,
      message: 'Waiting for writing/speaking grading completion',
    };
  }

  attempt.overallBandScores = bands;
  attempt.status = 'GRADED';
  attempt.lastActivityAt = now();
  if (!attempt.submittedAt) {
    attempt.submittedAt = now();
  }
  await attempt.save();

  await publishEvent('exam.graded', {
    userId: attempt.userId,
    entityType: 'ExamAttempt',
    entityId: String(attempt._id),
    examId: String(attempt.examId),
    metadata: {
      ...bands,
    },
  });

  return {
    attempt,
    skills: updatedSkills,
    completed: true,
    message: 'Exam grading completed',
  };
}

module.exports = {
  SKILL_TYPES,
  FINAL_SKILL_STATUSES,
  resolveSkillDurations,
  secondsRemaining,
  buildAttemptPayload,
  finalizeExamAttemptIfDone,
  expireDueAttempts,
  gradeExamAttempt,
};
