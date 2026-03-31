const Plan = require('../models/Plan');

/**
 * Get all active plans (public endpoint)
 */
const getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ price: 1 });
    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('GET ALL PLANS ERROR', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAllPlans };