const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');

/**
 * Get all available plans (public endpoint)
 */
const getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ price: 1 });
    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('GET ALL PLANS ERROR', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get or create current user's subscription
 * Only students are allowed to access
 */
const getMySubscription = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can access subscription information',
      });
    }

    let sub = await Subscription.findOne({ userId: req.user.id });
    if (!sub) {
      sub = await Subscription.create({ userId: req.user.id });
    }

    res.json({
      success: true,
      message: 'Subscription retrieved successfully',
      data: sub,
    });
  } catch (error) {
    console.error('GET SUBSCRIPTION ERROR', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Upgrade current user's plan to PLUS or PRO
 */
const upgradePlan = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['PLUS', 'PRO'].includes(plan)) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }

    let sub = await Subscription.findOne({ userId: req.user.id });
    if (!sub) {
      sub = await Subscription.create({ userId: req.user.id, plan });
    } else {
      sub.plan = plan;
      sub.fullTestUsed = 0;
    }
    await sub.save();

    res.json({
      success: true,
      message: 'Plan upgraded successfully',
      data: sub,
    });
  } catch (error) {
    console.error('UPGRADE PLAN ERROR', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Check whether user is eligible to take a new full test
 * Business rules:
 *   FREE  => never eligible (0 times)
 *   PLUS  => <= 10 times
 *   PRO   => unlimited
 */
const checkFullTestEligibility = async (req, res) => {
  try {
    let sub = await Subscription.findOne({ userId: req.user.id });
    let plan = 'FREE';
    let used = 0;

    if (sub) {
      plan = sub.plan;
      used = sub.fullTestUsed;
    } else {
      // if no record, treat as free and create one for convenience
      sub = await Subscription.create({ userId: req.user.id });
    }

    let eligible = false;
    if (plan === 'PRO') {
      eligible = true;
    } else if (plan === 'PLUS') {
      eligible = used < 10;
    }

    res.json({
      success: true,
      eligible,
      plan,
      fullTestUsed: used,
    });
  } catch (error) {
    console.error('CHECK ELIGIBILITY ERROR', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAllPlans, getMySubscription, upgradePlan, checkFullTestEligibility };