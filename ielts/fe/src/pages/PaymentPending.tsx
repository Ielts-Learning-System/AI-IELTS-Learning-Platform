import { Hourglass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PaymentPending() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-sm border border-slate-100 text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
          <Hourglass className="h-10 w-10 text-amber-500 animate-pulse" strokeWidth={1.8} />
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">
          Đơn hàng đang được xử lý
        </h1>

        <p className="text-slate-600 leading-relaxed mb-8">
          Cảm ơn bạn. Đội ngũ của chúng tôi đang kiểm tra giao dịch và sẽ cập nhật tài khoản của bạn
          trong thời gian sớm nhất (thường từ 5-15 phút).
        </p>

        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-100"
        >
          Quay về trang chủ
        </button>
      </div>
    </div>
  );
}
