/**
 * @file requireSkill.middleware.js
 * @description Middleware kiểm tra quyền truy cập theo kỹ năng (skill) dựa trên gói cước của user.
 *
 * Luồng kiểm tra quyền (Single Source of Truth):
 *   user.plan (plan code) → Plan.findOne({ code }) → plan.benefits.skills → kiểm tra skill
 *
 * Quy tắc:
 *   - user.plan === 'PRO' → bypass toàn bộ (toàn quyền)
 *   - user.plan === 'FREE' hoặc không tìm thấy Plan → trả 403
 *   - Plan tìm được: kiểm tra skillName trong plan.benefits.skills
 *
 * Cách dùng:
 *   router.post('/writing/submit', verifyToken, requireSkill('writing'), writingController.submit);
 */

const Plan = require('../models/Plan');

/**
 * Higher-order middleware factory.
 * @param {string} skillName - Tên kỹ năng cần kiểm tra ('reading' | 'listening' | 'writing' | 'speaking')
 * @returns {import('express').RequestHandler}
 */
const requireSkill = (skillName) => async (req, res, next) => {
  try {
    // verifyToken phải chạy trước middleware này và gắn req.user + req.userId
    const userId = req.userId || req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: vui lòng đăng nhập để tiếp tục.',
      });
    }

    // --- Bước 1: Lấy plan code từ user (đã được auth middleware gắn vào req.user) ---
    // user.plan lưu trực tiếp plan.code (vd: 'FREE', 'PLUS', 'PRO')
    const userPlanCode = req.user?.plan?.toUpperCase?.() || 'FREE';

    // --- Bước 2: PRO → bypass toàn bộ kiểm tra, không cần query DB ---
    if (userPlanCode === 'PRO') {
      return next();
    }

    // --- Bước 3: FREE → không có kỹ năng nào được cấp phép ---
    if (userPlanCode === 'FREE') {
      return res.status(403).json({
        success: false,
        code: 'SKILL_NOT_ALLOWED',
        userPlan: userPlanCode,
        requiredSkill: skillName,
        allowedSkills: [],
        message: 'Vui lòng nâng cấp gói cước để sử dụng tính năng này.',
      });
    }

    // --- Bước 4: Tìm Plan theo code khớp với user.plan ---
    const plan = await Plan.findOne({ code: userPlanCode });

    if (!plan) {
      // Plan không tồn tại trong DB (data inconsistency)
      console.warn(`[requireSkill] Plan với code "${userPlanCode}" không tồn tại trong DB.`);
      return res.status(403).json({
        success: false,
        code: 'PLAN_NOT_FOUND',
        userPlan: userPlanCode,
        message: 'Gói cước không hợp lệ. Vui lòng liên hệ hỗ trợ.',
      });
    }

    // --- Bước 5: Kiểm tra skillName trong plan.benefits.skills ---
    const allowedSkills = plan.benefits?.skills || [];

    if (!allowedSkills.includes(skillName.toLowerCase())) {
      return res.status(403).json({
        success: false,
        code: 'SKILL_NOT_ALLOWED',
        userPlan: userPlanCode,
        requiredSkill: skillName,
        allowedSkills,
        message: 'Vui lòng nâng cấp gói cước để sử dụng tính năng này.',
      });
    }

    // --- Bước 6: Đã xác minh quyền → tiếp tục xử lý request ---
    // Gắn thêm thông tin plan vào req để controller dùng nếu cần
    req.userPlan = plan;
    return next();
  } catch (error) {
    console.error(`[requireSkill] Error checking skill "${skillName}":`, error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error khi kiểm tra quyền truy cập.',
    });
  }
};

module.exports = { requireSkill };
