const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    // MoMo orderId — unique per transaction, generated before calling MoMo API
    orderId: {
      type: String,
      required: true,
      unique: true,
    },

    // ID của user đang thanh toán
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },

    // Gói dịch vụ mà user mua (ví dụ: 'VIP_1_MONTH', 'VIP_6_MONTHS')
    planId: {
      type: String,
      required: true,
    },

    // Số tiền thanh toán (VND)
    amount: {
      type: Number,
      required: true,
    },

    // Trạng thái giao dịch
    status: {
      type: String,
      enum: ['Pending', 'Success', 'Failed'],
      default: 'Pending',
    },

    // MoMo transaction ID — chỉ có sau khi webhook xác nhận thành công
    transId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
