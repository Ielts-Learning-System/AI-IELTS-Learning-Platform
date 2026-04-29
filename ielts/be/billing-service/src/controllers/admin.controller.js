const mongoose = require('mongoose');
const axios = require('axios');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const { publishEvent } = require('../services/rabbitmq.service');

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const AUTH_SERVICE_BASE_URL = process.env.AUTH_SERVICE_INTERNAL_URL || 'http://auth-service:3001';
const AUTH_SERVICE_TIMEOUT_MS = Number(
  process.env.AUTH_SERVICE_TIMEOUT_MS || (process.env.NODE_ENV === 'test' ? 200 : 3000)
);

const calcDaysRemaining = (validUntil) => {
  const distance = new Date(validUntil).getTime() - Date.now();
  return distance > 0 ? Math.ceil(distance / DAY_IN_MS) : 0;
};

const createPlan = async (req, res) => {
  try {
    const {
      code,
      name,
      price,
      durationMonths,
      features = [],
      benefits = {},
      isActive = true,
      ui = {},
    } = req.body;

    if (!code || !name || price === undefined || !durationMonths) {
      return res.status(400).json({
        success: false,
        message: 'code, name, price and durationMonths are required',
      });
    }

    const plan = await Plan.create({
      code,
      name,
      price,
      durationMonths,
      features,
      benefits,
      isActive,
      ui,
    });

    return res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: plan,
    });
  } catch (error) {
    console.error('CREATE PLAN ERROR', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAllPlansForAdmin = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ createdAt: -1 });
    return res.json({ success: true, data: plans });
  } catch (error) {
    console.error('GET ADMIN PLANS ERROR', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updatePlan = async (req, res) => {
  try {
    const { planId } = req.params;

    const updated = await Plan.findByIdAndUpdate(planId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    return res.json({
      success: true,
      message: 'Plan updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('UPDATE PLAN ERROR', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const togglePlanActive = async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await Plan.findById(planId);

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    plan.isActive = !plan.isActive;
    await plan.save();

    return res.json({
      success: true,
      message: `Plan is now ${plan.isActive ? 'active' : 'inactive'}`,
      data: plan,
    });
  } catch (error) {
    console.error('TOGGLE PLAN ERROR', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deletePlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const deleted = await Plan.findByIdAndDelete(planId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    return res.json({
      success: true,
      message: 'Plan deleted successfully',
    });
  } catch (error) {
    console.error('DELETE PLAN ERROR', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAllUserSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate('planId', 'name durationMonths benefits')
      .sort({ createdAt: -1 });

    const uniqueUserIds = [
      ...new Set(subscriptions.map((sub) => String(sub.userId)).filter(Boolean)),
    ];

    let usersById = new Map();

    if (uniqueUserIds.length) {
      try {
        const response = await axios.post(
          `${AUTH_SERVICE_BASE_URL}/api/auth/internal/users/batch`,
          { userIds: uniqueUserIds },
          {
            timeout: AUTH_SERVICE_TIMEOUT_MS,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const users = response.data?.data || [];
        usersById = new Map(users.map((user) => [String(user._id), user]));
      } catch (error) {
        // Graceful fallback: keep API available even when auth-service is down.
        console.error('AUTH USER HYDRATION ERROR:', error.message);
      }
    }

    const data = subscriptions.map((sub) => {
      const user = usersById.get(String(sub.userId));

      return {
        _id: sub._id,
        userId: {
          _id: String(sub.userId),
          name: user?.name || 'Unknown User',
          email: user?.email || 'N/A',
        },
        status: sub.status,
        validUntil: sub.validUntil,
        daysRemaining: calcDaysRemaining(sub.validUntil),
        planId: sub.planId,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error('GET USER SUBSCRIPTIONS ERROR', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const triggerReminderNotification = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId format' });
    }

    const subscription = await Subscription.findOne({ userId })
      .populate('planId', 'name')
      .sort({ createdAt: -1 });

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found for user' });
    }

    const payload = {
      userId: subscription.userId.toString(),
      planName: subscription.planId?.name || 'Unknown Plan',
      expirationDate: subscription.validUntil,
      subscriptionId: subscription._id.toString(),
    };

    const published = await publishEvent('billing.subscription.reminder', payload);

    if (!published) {
      return res.status(500).json({
        success: false,
        message: 'Failed to publish reminder event',
      });
    }

    return res.json({
      success: true,
      message: 'Reminder event published',
      data: payload,
    });
  } catch (error) {
    console.error('TRIGGER REMINDER ERROR', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason, editedTitle, editedMessage } = req.body;

    if (!subscriptionId || !reason || !editedTitle || !editedMessage) {
      return res.status(400).json({
        success: false,
        message: 'subscriptionId, reason, editedTitle, and editedMessage are required',
      });
    }

    const validReasons = ['POLICY_VIOLATION', 'SYSTEM_ERROR', 'USER_REQUEST_REFUND'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: `Invalid reason. Must be one of: ${validReasons.join(', ')}`,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
      return res.status(400).json({ success: false, message: 'Invalid subscriptionId format' });
    }

    const subscription = await Subscription.findById(subscriptionId).populate('planId', 'name');

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    if (subscription.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel subscription with status ${subscription.status}`,
      });
    }

    // Update subscription status
    subscription.status = 'CANCELLED';
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = reason;
    subscription.cancellationTitle = editedTitle;
    subscription.cancellationMessage = editedMessage;
    await subscription.save();

    // Fetch user data from auth-service
    let userData = { name: 'User', email: 'N/A' };
    try {
      const userId = subscription.userId.toString();
      const response = await axios.post(
        `${AUTH_SERVICE_BASE_URL}/api/auth/internal/users/batch`,
        { userIds: [userId] },
        {
          timeout: AUTH_SERVICE_TIMEOUT_MS,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const users = response.data?.data || [];
      if (users.length > 0) {
        userData = {
          name: users[0].name || 'User',
          email: users[0].email || 'N/A',
        };
      }
    } catch (err) {
      console.error('Failed to fetch user data for cancellation event:', err.message);
      // Continue with fallback user data
    }

    // Publish cancellation event with user info and exact admin message
    const payload = {
      userId: subscription.userId.toString(),
      subscriptionId: subscription._id.toString(),
      email: userData.email,
      name: userData.name,
      planName: subscription.planId?.name || 'Unknown Plan',
      reason,
      type: 'subscription_cancelled',
      title: editedTitle,
      message: editedMessage,
      status: 'CANCELLED',
      cancelledAt: subscription.cancelledAt,
    };

    const published = await publishEvent('billing.subscription.cancelled', payload);
    if (!published) {
      console.error('Failed to publish cancellation event: publishEvent returned false');
    }

    return res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: subscription,
    });
  } catch (error) {
    console.error('CANCEL SUBSCRIPTION ERROR', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const restoreSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'subscriptionId is required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
      return res.status(400).json({ success: false, message: 'Invalid subscriptionId format' });
    }

    const subscription = await Subscription.findById(subscriptionId).populate('planId', 'name');

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    if (subscription.status !== 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: `Cannot restore subscription with status ${subscription.status}`,
      });
    }

    // Check if validUntil is still in the future
    const now = new Date();
    const validUntilDate = new Date(subscription.validUntil);
    if (validUntilDate <= now) {
      return res.status(400).json({
        success: false,
        message: 'Cannot restore subscription with expired validUntil date',
      });
    }

    // Restore subscription status
    subscription.status = 'ACTIVE';
    subscription.cancelledAt = null;
    subscription.cancellationReason = null;
    subscription.cancellationTitle = null;
    subscription.cancellationMessage = null;
    await subscription.save();

    // Fetch user data from auth-service
    let userData = { name: 'User', email: 'N/A' };
    try {
      const userId = subscription.userId.toString();
      const response = await axios.post(
        `${AUTH_SERVICE_BASE_URL}/api/auth/internal/users/batch`,
        { userIds: [userId] },
        {
          timeout: AUTH_SERVICE_TIMEOUT_MS,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const users = response.data?.data || [];
      if (users.length > 0) {
        userData = {
          name: users[0].name || 'User',
          email: users[0].email || 'N/A',
        };
      }
    } catch (err) {
      console.error('Failed to fetch user data for restoration event:', err.message);
      // Continue with fallback user data
    }

    // Publish restoration event
    const payload = {
      userId: subscription.userId.toString(),
      subscriptionId: subscription._id.toString(),
      email: userData.email,
      name: userData.name,
      planName: subscription.planId?.name || 'Unknown Plan',
      type: 'subscription_restored',
      title: '✅ Subscription Restored',
      message: `Welcome back! Your ${subscription.planId?.name || 'subscription'} plan has been restored.`,
      validUntil: subscription.validUntil,
      status: 'ACTIVE',
      restoredAt: new Date(),
    };

    const published = await publishEvent('billing.subscription.restored', payload);
    if (!published) {
      console.error('Failed to publish restoration event: publishEvent returned false');
    }

    return res.json({
      success: true,
      message: 'Subscription restored successfully',
      data: subscription,
    });
  } catch (error) {
    console.error('RESTORE SUBSCRIPTION ERROR', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getBillingStats = async (req, res) => {
  try {
    const [summary] = await Subscription.aggregate([
      {
        $lookup: {
          from: 'plans',
          localField: 'planId',
          foreignField: '_id',
          as: 'plan',
        },
      },
      {
        $unwind: {
          path: '$plan',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: null,
          totalSubscriptions: { $sum: 1 },
          activeSubscriptions: {
            $sum: {
              $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0],
            },
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $in: ['$status', ['ACTIVE', 'EXPIRED', 'CANCELLED']] },
                { $ifNull: ['$plan.price', 0] },
                0,
              ],
            },
          },
        },
      },
    ]);

    return res.json({
      success: true,
      data: {
        totalSubscriptions: Number(summary?.totalSubscriptions || 0),
        activeSubscriptions: Number(summary?.activeSubscriptions || 0),
        totalRevenue: Number(summary?.totalRevenue || 0),
      },
    });
  } catch (error) {
    console.error('GET BILLING STATS ERROR', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createPlan,
  getAllPlansForAdmin,
  updatePlan,
  togglePlanActive,
  deletePlan,
  getAllUserSubscriptions,
  triggerReminderNotification,
  cancelSubscription,
  restoreSubscription,
  getBillingStats,
};