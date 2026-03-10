require('dotenv').config();
const mongoose = require('mongoose');
const Plan = require('./src/models/Plan');

const seedPlans = async () => {
  try {
    // 1. Kết nối DB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for seeding Plans...');

    // 2. Xóa dữ liệu cũ (để tránh bị trùng lặp khi chạy nhiều lần)
    await Plan.deleteMany({});
    console.log('🗑️ Cleared old plans');

    // 3. Chuẩn bị 3 gói cước siêu xịn
    const plans = [
      {
        code: 'FREE',
        name: 'GÓI FREE',
        price: 0,
        features: [
          'Reading: Không giới hạn',
          'Listening: Không giới hạn'
        ],
        ui: {
          borderColor: 'border-slate-200',
          buttonText: 'Đang sử dụng',
          buttonColor: 'bg-slate-200 text-slate-500 cursor-not-allowed',
          badge: ''
        },
        maxFullTests: 0
      },
      {
        code: 'PLUS',
        name: 'GÓI PLUS',
        price: 499000,
        features: [
          'Reading: Không giới hạn',
          'Listening: Không giới hạn',
          'Được làm tối đa 10 FULL TEST'
        ],
        ui: {
          borderColor: 'border-red-600',
          buttonText: 'Nâng cấp Plus',
          buttonColor: 'bg-red-600 hover:bg-red-700 text-white shadow-md',
          badge: 'Phổ biến'
        },
        maxFullTests: 10
      },
      {
        code: 'PRO',
        name: 'GÓI PRO',
        price: 999000,
        features: [
          'Mọi thứ Không giới hạn',
          'Bao gồm FULL TEST không giới hạn'
        ],
        ui: {
          borderColor: 'border-amber-400',
          buttonText: 'Nâng cấp Pro',
          buttonColor: 'bg-slate-900 hover:bg-black text-amber-400 shadow-md', // Đen kết hợp chữ vàng Gold
          badge: ''
        },
        maxFullTests: -1 // -1 = Unlimited
      }
    ];

    // 4. Bơm vào DB
    await Plan.insertMany(plans);
    console.log('🌱 Successfully seeded 3 billing plans!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    process.exit(1);
  }
};

seedPlans();