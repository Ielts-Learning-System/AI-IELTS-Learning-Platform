/**
 * reports.controller.js
 *
 * Powers GET /admin/reports/dashboard (proxied via gateway as GET /api/reports/dashboard).
 *
 * Aggregation strategy
 * ────────────────────
 * • billing DB  (default mongoose conn) — Subscription, Plan, User models
 * • payment DB  (getPaymentConn)        — Transaction model
 * • auth DB     (getAuthConn)           — AILog + User models
 * • reading DB  (getReadingConn)        — ReadingAttempt + ReadingTest models
 *
 * All queries run in parallel via Promise.all. Each DB connection is created
 * lazily on first request and reused thereafter.
 */

const Subscription = require('../models/Subscription');
const User = require('../models/User');
const {
  getTransaction,
  getAILog,
  getAuthUser,
  getReadingAttempt,
} = require('../config/reportingConnections');

// ─── Helpers ────────────────────────────────────────────────────────

/** Time boundaries used across every aggregation. */
function getBoundaries() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { now, monthStart, thirtyDaysAgo, prevMonthStart };
}

/**
 * Merge two sparse date-keyed arrays into a contiguous 30-day series.
 * Missing dates are filled with mrr = 0 and newUsers = 0.
 */
function buildDailySeries(revenueArr, usersArr, thirtyDaysAgo) {
  const revenueMap = new Map(revenueArr.map((r) => [r._id, r.mrr]));
  const usersMap = new Map(usersArr.map((u) => [u._id, u.newUsers]));

  const result = [];
  const cursor = new Date(thirtyDaysAgo);
  const now = new Date();

  while (cursor <= now) {
    const key = `${String(cursor.getDate()).padStart(2, '0')}/${String(
      cursor.getMonth() + 1
    ).padStart(2, '0')}`;
    result.push({
      date: key,
      mrr: revenueMap.get(key) || 0,
      newUsers: usersMap.get(key) || 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

/**
 * Map AILog.service strings ("Extract Reading", "Grade Writing", …)
 * to the four IELTS skill buckets.
 */
function serviceToSkill(serviceName) {
  const s = (serviceName || '').toLowerCase();
  if (s.includes('reading')) return 'Reading';
  if (s.includes('writing')) return 'Writing';
  if (s.includes('speaking')) return 'Speaking';
  if (s.includes('listening')) return 'Listening';
  return 'Other';
}

// ─── Plan label map ──────────────────────────────────────────────────
const PLAN_LABELS = { FREE: 'Free', PLUS: 'Plus', PRO: 'Pro' };
const SKILLS_ORDER = ['Reading', 'Listening', 'Writing', 'Speaking'];
const VN_TZ = '+07:00';

// ─── Controller ─────────────────────────────────────────────────────

/**
 * GET /admin/reports/dashboard
 * Admin-only. Returns all data needed for the AnalyticsReport UI.
 */
const getDashboard = async (req, res) => {
  try {
    const { now, monthStart, thirtyDaysAgo } = getBoundaries();

    // Resolve cross-DB model references
    const Transaction = getTransaction();
    const AILog = getAILog();
    const AuthUser = getAuthUser();
    const ReadingAttempt = getReadingAttempt();

    // ── Fire all aggregations in parallel ───────────────────────────
    const [
      revenueSummary,        // [0] total revenue this month
      dailyRevenue,          // [1] revenue per day (30d)
      dailyUsers,            // [2] new students per day (30d)
      activeSubscriptions,   // [3] count
      cancelledThisMonth,    // [4] count (for churn numerator)
      totalPrevActive,       // [5] count (for churn denominator)
      subDistributionRaw,    // [6] plan distribution from billing User model
      topAttempts,           // [7] top 5 reading tests by attempt count
      aiUsageRaw,            // [8] AI token / cost by service (current month)
    ] = await Promise.all([

      // [0] Monthly revenue total (payment DB)
      Transaction.aggregate([
        { $match: { status: 'Success', createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),

      // [1] Daily revenue — 30 days (payment DB)
      Transaction.aggregate([
        { $match: { status: 'Success', createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%d/%m',
                date: '$createdAt',
                timezone: VN_TZ,
              },
            },
            mrr: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // [2] Daily new students — 30 days (auth DB)
      AuthUser.aggregate([
        { $match: { role: 'Student', createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%d/%m',
                date: '$createdAt',
                timezone: VN_TZ,
              },
            },
            newUsers: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // [3] Active subscriptions (billing DB)
      Subscription.countDocuments({
        status: 'ACTIVE',
        validUntil: { $gt: now },
      }),

      // [4] Subscriptions cancelled in current month (billing DB)
      Subscription.countDocuments({
        status: 'CANCELLED',
        cancelledAt: { $gte: monthStart },
      }),

      // [5] Total subscriptions created before month start (churn denominator)
      Subscription.countDocuments({
        status: { $in: ['ACTIVE', 'EXPIRED', 'CANCELLED'] },
        createdAt: { $lte: monthStart },
      }),

      // [6] Subscription plan distribution — billing User.plan field
      User.aggregate([
        { $group: { _id: '$plan', value: { $sum: 1 } } },
        { $sort: { value: -1 } },
      ]),

      // [7] Top 5 most-attempted reading tests (reading DB)
      ReadingAttempt.aggregate([
        { $group: { _id: '$testId', attempts: { $sum: 1 } } },
        { $sort: { attempts: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'readingtests',
            localField: '_id',
            foreignField: '_id',
            as: 'testInfo',
          },
        },
        {
          $project: {
            name: {
              $ifNull: [
                { $arrayElemAt: ['$testInfo.title', 0] },
                'Unknown Test',
              ],
            },
            attempts: 1,
          },
        },
      ]),

      // [8] AI usage by service — current month (auth DB)
      AILog.aggregate([
        { $match: { createdAt: { $gte: monthStart } } },
        {
          $group: {
            _id: '$service',
            totalTokens: { $sum: '$totalTokens' },
            totalCost: { $sum: '$estimatedCost' },
          },
        },
        { $sort: { totalTokens: -1 } },
      ]),
    ]);

    // ── Compute derived metrics ──────────────────────────────────────

    const monthlyRevenue = revenueSummary[0]?.total || 0;

    const churnRate =
      totalPrevActive > 0
        ? parseFloat(((cancelledThisMonth / totalPrevActive) * 100).toFixed(1))
        : 0;

    // ── Build 30-day daily series ────────────────────────────────────
    const dailyData = buildDailySeries(dailyRevenue, dailyUsers, thirtyDaysAgo);

    // ── Format plan distribution ─────────────────────────────────────
    const subDistribution = subDistributionRaw.map((d) => ({
      name: PLAN_LABELS[d._id] || (d._id ?? 'Unknown'),
      value: d.value,
    }));

    // ── Aggregate AI usage by skill bucket ──────────────────────────
    const skillBuckets = {};
    for (const row of aiUsageRaw) {
      const skill = serviceToSkill(row._id);
      if (!skillBuckets[skill]) {
        skillBuckets[skill] = { skill, totalTokens: 0, totalCost: 0 };
      }
      skillBuckets[skill].totalTokens += row.totalTokens;
      skillBuckets[skill].totalCost += row.totalCost;
    }

    const apiHealth = SKILLS_ORDER.map((s) => {
      const b = skillBuckets[s] || { totalTokens: 0, totalCost: 0 };
      const tokM = (b.totalTokens / 1_000_000).toFixed(1);
      // Determine status: "warning" if cost exceeds a reasonable threshold
      const status = b.totalCost > 30 ? 'warning' : 'healthy';
      return {
        skill: s,
        tokensUsed: `${tokM}M`,
        cost: `$${b.totalCost.toFixed(2)}`,
        // 429 error tracking requires schema changes to AILog — surfaced as N/A
        errorRate: '—',
        errors429: 0,
        status,
      };
    });

    const grandTokens = Object.values(skillBuckets).reduce(
      (sum, b) => sum + b.totalTokens,
      0
    );
    const grandCost = Object.values(skillBuckets).reduce(
      (sum, b) => sum + b.totalCost,
      0
    );

    // ── Response ─────────────────────────────────────────────────────
    return res.json({
      success: true,
      data: {
        quickStats: {
          monthlyRevenue,
          activeSubscriptions,
          churnRate,
          apiCostUSD: parseFloat(grandCost.toFixed(2)),
        },
        dailyData,
        topTests: topAttempts,
        subDistribution,
        apiHealth,
        totalApiTokens: `${(grandTokens / 1_000_000).toFixed(1)}M`,
        totalApiCost: `$${grandCost.toFixed(2)}`,
      },
    });
  } catch (error) {
    console.error('GET DASHBOARD ERROR', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboard };
