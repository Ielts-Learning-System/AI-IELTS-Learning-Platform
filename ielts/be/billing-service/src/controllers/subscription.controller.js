/**
 * @file subscription.controller.js
 * @description Controllers cho các endpoint liên quan đến subscription của user.
 *
 * Luồng tra cứu quyền:
 *   user.plan (plan code) → Plan.findOne({ code }) → plan.benefits.skills
 */

const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');

/**
 * GET /api/billing/my-subscription
 * Trả về thông tin subscription đầy đủ (giữ tương thích ngược).
 * Nếu user không có subscription record → tìm Plan theo user.plan để trả về skills.
 */
const getMySubscription = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let subscription = await Subscription.findOne({ userId }).populate('planId');

    if (!subscription) {
      // Không có subscription record = user đang dùng gói FREE (trạng thái bình thường, KHÔNG phải lỗi).
      // Trả 200 với data: null để tránh console error 404 trên frontend.
      const userPlanCode = req.user?.plan?.toUpperCase?.() || 'FREE';
      const plan = userPlanCode !== 'FREE'
        ? await Plan.findOne({ code: userPlanCode }).select('code name benefits')
        : null;

      return res.status(200).json({
        success: true,
        data: null, // null = không có subscription record
        planFallback: plan
          ? { code: plan.code, name: plan.name, skills: plan.benefits?.skills || [] }
          : { code: 'FREE', name: 'Gói Miễn Phí', skills: [] },
      });
    }

    // Tự động expire nếu quá hạn
    const now = new Date();
    if (subscription.validUntil < now && subscription.status !== 'EXPIRED') {
      subscription.status = 'EXPIRED';
      await subscription.save();
      subscription = await Subscription.findById(subscription._id).populate('planId');
    }

    return res.json({ success: true, data: subscription });
  } catch (error) {
    console.error('GET MY SUBSCRIPTION ERROR', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/billing/my-skills
 * Endpoint nhẹ, trả về danh sách kỹ năng được phép dựa trên user.plan.
 *
 * Luồng:
 *   1. Đọc user.plan từ req.user (đã gắn bởi verifyToken)
 *   2. Nếu PRO → trả về toàn bộ 4 kỹ năng
 *   3. Nếu FREE → trả về []
 *   4. Còn lại → Plan.findOne({ code: user.plan }) → trả về plan.benefits.skills
 *
 * Response:
 *   { success: true, data: { plan: 'PLUS', planName: '...', allowedSkills: ['reading', 'listening', 'writing'] } }
 */
const getMySkills = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // 1. Get the current user's plan code from the User database
    const userPlanCode = req.user?.plan || 'FREE';

    // 2. Query the Plan model using this code
    const planConfig = await Plan.findOne({ code: userPlanCode });

    if (!planConfig) {
      console.warn(`[getMySkills] Plan code "${userPlanCode}" không tồn tại trong DB.`);
      return res.json({
        success: true,
        data: {
          allowedSkills: [],
          isPro: false,
          plan: userPlanCode,
          planName: 'Unknown Plan'
        }
      });
    }

    // 3. Extract the skills from the plan's configuration
    const allowedSkills = planConfig.benefits?.skills || [];
    
    // Determine if user is Pro
    const isProLogic = userPlanCode.toUpperCase() === 'PRO';

    // 4. Return the JSON response matching the structure
    return res.json({
      success: true,
      data: {
        allowedSkills: allowedSkills,
        isPro: isProLogic,
        plan: userPlanCode,
        planName: planConfig.name
      }
    });

  } catch (error) {
    console.error('GET MY SKILLS ERROR', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMySubscription,
  getMySkills,
};