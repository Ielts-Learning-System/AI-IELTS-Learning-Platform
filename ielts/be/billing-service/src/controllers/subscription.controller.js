const Subscription = require('../models/Subscription');

const getMySubscription = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    let subscription = await Subscription.findOne({ userId }).populate('planId');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    const now = new Date();
    if (subscription.validUntil < now && subscription.status !== 'EXPIRED') {
      subscription.status = 'EXPIRED';
      await subscription.save();
      subscription = await Subscription.findById(subscription._id).populate('planId');
    }

    return res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error('GET MY SUBSCRIPTION ERROR', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMySubscription,
};