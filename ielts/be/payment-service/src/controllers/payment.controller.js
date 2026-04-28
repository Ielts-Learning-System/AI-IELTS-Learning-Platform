const Transaction = require('../models/transaction.model');
const axios = require('axios');

// Internal URL for auth-service — injected via docker-compose environment
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_INTERNAL_URL || 'http://auth-service:3001';

const PLAN_UPGRADE_CONFIG = {
  PLUS: {
    subscriptionPlan: 'VIP_1_MONTH',
    durationDays: 30,
    legacyPlan: 'premium',
  },
  PRO: {
    subscriptionPlan: 'VIP_1_YEAR',
    durationDays: 365,
    legacyPlan: 'premium',
  },
  VIP_1_MONTH: {
    subscriptionPlan: 'VIP_1_MONTH',
    durationDays: 30,
    legacyPlan: 'premium',
  },
  VIP_6_MONTH: {
    subscriptionPlan: 'VIP_6_MONTH',
    durationDays: 180,
    legacyPlan: 'premium',
  },
  VIP_1_YEAR: {
    subscriptionPlan: 'VIP_1_YEAR',
    durationDays: 365,
    legacyPlan: 'premium',
  },
};

/**
 * @desc    Create pending transaction and return VietQR URL
 * @route   POST /create
 * @access  Protected (auth middleware)
 */
const createVietQRPayment = async (req, res) => {
  try {
    const { planId, amount } = req.body;
    const userId = req.user.id;

    if (!planId || !amount) {
      return res.status(400).json({ message: 'planId and amount are required.' });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number.' });
    }

    // Short transfer memo/orderId: VIP + last 6 digits of timestamp
    const orderId = `VIP${Date.now().toString().slice(-6)}`;

    await Transaction.create({
      orderId,
      userId,
      planId,
      amount: numericAmount,
      status: 'Pending',
    });

    const {
      VIETQR_BANK_ID: bankId,
      VIETQR_ACCOUNT_NO: accountNo,
      VIETQR_ACCOUNT_NAME: accountName,
    } = process.env;

    if (!bankId || !accountNo || !accountName) {
      return res.status(500).json({
        success: false,
        message: 'Missing VietQR configuration in environment variables.',
      });
    }

    const encodedOrderId = encodeURIComponent(orderId);
    const encodedAccountName = encodeURIComponent(accountName);

    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${numericAmount}&addInfo=${encodedOrderId}&accountName=${encodedAccountName}`;

    return res.status(200).json({
      success: true,
      qrUrl,
      orderId,
      amount: numericAmount,
    });
  } catch (error) {
    console.error('createVietQRPayment error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

// Backward-compatible export name for existing route imports.
const createPayment = createVietQRPayment;

/**
 * @desc    Get current user's latest pending transaction
 * @route   GET /transactions/my-pending
 * @access  Protected
 */
const getMyPendingTransaction = async (req, res) => {
  try {
    const pending = await Transaction.findOne({
      userId: req.user.id,
      status: 'Pending',
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: pending || null,
    });
  } catch (error) {
    console.error('getMyPendingTransaction error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

/**
 * @desc    Get all transactions for admin management
 * @route   GET /transactions
 * @access  Protected (admin middleware should be added in real deployment)
 */
const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .lean();

    // API Composition: fetch user details from auth-service for each unique userId
    const uniqueUserIds = [...new Set(transactions.map(t => String(t.userId)))];

    let userMap = {};
    try {
      const { data } = await axios.post(
        `${AUTH_SERVICE_URL}/api/auth/internal/users/batch`,
        { ids: uniqueUserIds },
        { timeout: 5000 }
      );
      if (data && Array.isArray(data.users)) {
        data.users.forEach(u => {
          userMap[String(u._id)] = { name: u.name, fullName: u.fullName, email: u.email };
        });
      }
    } catch (err) {
      // Non-fatal: return transactions without user details rather than crashing
      console.error('getTransactions: failed to fetch user details from auth-service:', err.message);
    }

    const enriched = transactions.map(t => ({
      ...t,
      userId: userMap[String(t.userId)] || { _id: t.userId },
    }));

    return res.status(200).json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    console.error('getTransactions error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

/**
 * @desc    Manually approve a pending transaction and upgrade user VIP
 * @route   PUT /transactions/:id/approve
 * @access  Protected (admin middleware should be added in real deployment)
 */
const approveTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.',
      });
    }

    if (transaction.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending transactions can be approved.',
      });
    }

    const upgradeConfig = PLAN_UPGRADE_CONFIG[transaction.planId];
    if (!upgradeConfig) {
      return res.status(400).json({
        success: false,
        message: `Unsupported planId: ${transaction.planId}`,
      });
    }

    const vipValidUntil = new Date(
      Date.now() + upgradeConfig.durationDays * 24 * 60 * 60 * 1000
    );

    // API Composition: delegate user VIP upgrade to auth-service
    try {
      await axios.patch(
        `${AUTH_SERVICE_URL}/api/auth/internal/users/${transaction.userId}/subscription`,
        {
          subscriptionPlan: upgradeConfig.subscriptionPlan,
          vipValidUntil,
        },
        { timeout: 5000 }
      );
    } catch (err) {
      console.error('approveTransaction: failed to update user subscription in auth-service:', err.message);
      return res.status(502).json({
        success: false,
        message: 'Transaction found but failed to upgrade user subscription. Please retry.',
      });
    }

    transaction.status = 'Success';
    await transaction.save();

    return res.status(200).json({
      success: true,
      message: 'Transaction approved successfully.',
      data: transaction,
    });
  } catch (error) {
    console.error('approveTransaction error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

/**
 * @desc    Manually reject a pending transaction
 * @route   PUT /transactions/:id/reject
 * @access  Protected (admin middleware should be added in real deployment)
 */
const rejectTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.',
      });
    }

    if (transaction.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending transactions can be rejected.',
      });
    }

    transaction.status = 'Failed';
    await transaction.save();

    return res.status(200).json({
      success: true,
      message: 'Transaction rejected successfully.',
      data: transaction,
    });
  } catch (error) {
    console.error('rejectTransaction error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

module.exports = {
  createVietQRPayment,
  createPayment,
  getMyPendingTransaction,
  getTransactions,
  approveTransaction,
  rejectTransaction,
};
