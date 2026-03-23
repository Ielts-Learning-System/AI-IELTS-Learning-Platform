const Transaction = require('../models/transaction.model');
const User = require('../models/user.model');

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
 * @desc    Get all transactions for admin management
 * @route   GET /transactions
 * @access  Protected (admin middleware should be added in real deployment)
 */
const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name fullName email');

    return res.status(200).json({
      success: true,
      data: transactions,
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

    await User.findByIdAndUpdate(transaction.userId, {
      subscriptionPlan: upgradeConfig.subscriptionPlan,
      plan: upgradeConfig.legacyPlan,
      vipValidUntil,
    });

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
  getTransactions,
  approveTransaction,
  rejectTransaction,
};
