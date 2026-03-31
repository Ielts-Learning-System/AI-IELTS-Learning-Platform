require('dotenv').config(); // Load biến môi trường chứa MONGO_URI
const mongoose = require('mongoose');

// Import trực tiếp 2 Schema mới nhất của bạn vào đây
const Plan = require('./src/models/Plan.js'); 
const Subscription = require('./src/models/Subscription.js');

async function runMigration() {
  try {
    console.log('🔄 Đang kết nối tới MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ielts_billing');
    console.log('✅ Kết nối thành công! Bắt đầu quá trình Migration...\n');

    // ==========================================
    // GIAI ĐOẠN 1: CẬP NHẬT BẢNG PLAN
    // ==========================================
    console.log('📦 Giai đoạn 1: Đang nâng cấp bảng Plan...');
    const plans = await Plan.find({});
    
    // Tạo một từ điển để lưu Map giữa Code ('FREE', 'PRO') và ID mới của nó
    const planIdMap = {};

    for (const plan of plans) {
      // Bơm dữ liệu mặc định cho các trường mới nếu chưa có
      if (plan.durationMonths === undefined) {
        // Gán thời hạn nháp: FREE = 120 tháng (10 năm), PLUS = 3 tháng, PRO = 6 tháng
        if (plan.code === 'FREE') plan.durationMonths = 120;
        else if (plan.code === 'PLUS') plan.durationMonths = 3;
        else if (plan.code === 'PRO') plan.durationMonths = 6;
        else plan.durationMonths = 1;
      }

      if (!plan.benefits || !plan.benefits.skills || plan.benefits.skills.length === 0) {
        plan.benefits = {
          skills: ['reading', 'listening', 'writing', 'speaking'], // Cho full quyền
          maxHours: -1,
          maxFullTests: plan.maxFullTests || 0
        };
      }

      plan.isActive = true; // Bật hết lên
      await plan.save();
      
      // Lưu lại ID vào từ điển để lát nữa dùng cho bảng Subscription
      planIdMap[plan.code] = plan._id; 
    }
    console.log('✅ Cập nhật bảng Plan xong! Đã lưu Map ID:', planIdMap, '\n');


    // ==========================================
    // GIAI ĐOẠN 2: CẬP NHẬT BẢNG SUBSCRIPTION
    // ==========================================
    console.log('👥 Giai đoạn 2: Đang nâng cấp bảng Subscription...');
    
    // Lấy tất cả Subscriptions (Dùng .lean() để lấy raw data, tránh bị Mongoose chặn schema cũ)
    const subscriptions = await Subscription.find({}).lean();
    let updatedCount = 0;

    for (const sub of subscriptions) {
      // Nếu user này vẫn đang xài trường 'plan' kiểu chữ cũ ('FREE', 'PRO'...)
      if (sub.plan && typeof sub.plan === 'string') {
        
        const mappedPlanId = planIdMap[sub.plan]; // Tìm ID tương ứng của gói đó
        if (!mappedPlanId) {
          console.warn(`⚠️ Bỏ qua user ${sub.userId}: Không tìm thấy ID cho gói ${sub.plan}`);
          continue;
        }

        // Tính toán trạng thái: Nếu hạn còn dài hơn hôm nay thì ACTIVE, ngược lại EXPIRED
        const isExpired = new Date(sub.validUntil) < new Date();
        const currentStatus = isExpired ? 'EXPIRED' : 'ACTIVE';

        // Dùng updateOne để set trường mới (planId, status) và unset (xóa) trường cũ (plan)
        await Subscription.updateOne(
          { _id: sub._id },
          {
            $set: { 
              planId: mappedPlanId,
              status: currentStatus
            },
            $unset: { plan: 1 } // Lệnh xóa trường 'plan' kiểu String cũ khỏi DB
          }
        );
        updatedCount++;
      }
    }
    console.log(`✅ Cập nhật bảng Subscription xong! Đã nâng cấp ${updatedCount} user.\n`);

    console.log('🎉 TẤT CẢ ĐÃ HOÀN TẤT! HỆ THỐNG ĐÃ SẴN SÀNG CHO PHIÊN BẢN MỚI!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Lỗi chết người trong quá trình Migration:', error);
    process.exit(1);
  }
}

runMigration();