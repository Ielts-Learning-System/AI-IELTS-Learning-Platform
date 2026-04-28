require('dotenv').config();
const mongoose = require('mongoose');
const Subscription = require('./src/models/Subscription.js');

// ==========================================
// 🚨 ĐIỀN ID CỦA BẠN VÀO ĐÂY 🚨
// ==========================================

// 1. Gói PLUS
const OLD_PLUS_ID = "69afd5ebc52b82b781bd453e"; // Ví dụ: "69afd5ebc52b82b781bd453a"
const NEW_PLUS_ID = "69cb999a1892b4e37872e07a";

// 2. Gói PRO
const OLD_PRO_ID = "69afd5ebc52b82b781bd453d"; 
const NEW_PRO_ID = "69cb99b91892b4e37872e07f";

// ==========================================

async function runFix() {
  try {
    console.log('🔄 Đang kết nối tới MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Kết nối thành công!\n');

    // Cập nhật toàn bộ user đang cầm ID cũ của PLUS sang ID mới
    if (OLD_PLUS_ID !== "điền_id_cũ_của_gói_plus_vào_đây") {
      const plusResult = await Subscription.updateMany(
        { planId: OLD_PLUS_ID },
        { $set: { planId: NEW_PLUS_ID } }
      );
      console.log(`✅ Đã cập nhật ${plusResult.modifiedCount} user từ PLUS cũ sang PLUS mới.`);
    }

    // Cập nhật toàn bộ user đang cầm ID cũ của PRO sang ID mới
    if (OLD_PRO_ID !== "điền_id_cũ_của_gói_pro_vào_đây") {
      const proResult = await Subscription.updateMany(
        { planId: OLD_PRO_ID },
        { $set: { planId: NEW_PRO_ID } }
      );
      console.log(`✅ Đã cập nhật ${proResult.modifiedCount} user từ PRO cũ sang PRO mới.`);
    }

    console.log('\n🎉 HOÀN TẤT VÁ LỖI DỮ LIỆU!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

runFix();