import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-white px-4">
      {/* Animated checkmark */}
      <div className="animate-bounce-once mb-8">
        <CheckCircle
          className="text-emerald-500 drop-shadow-lg"
          style={{ width: 96, height: 96 }}
          strokeWidth={1.5}
        />
      </div>

      {/* Heading */}
      <h1 className="text-4xl font-extrabold text-emerald-600 mb-3 text-center">
        Thanh toán thành công!
      </h1>

      {/* Subtitle */}
      <p className="text-slate-500 text-center text-lg max-w-md mb-8">
        Chúc mừng bạn đã nâng cấp gói VIP thành công.
        <br />
        Hệ thống đang chuyển hướng...
      </p>

      {/* Countdown ring */}
      <div className="relative flex items-center justify-center w-24 h-24 mb-8">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke="#d1fae5"
            strokeWidth="8"
          />
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke="#10b981"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 42}
            strokeDashoffset={2 * Math.PI * 42 * (1 - countdown / 10)}
            style={{ transition: 'stroke-dashoffset 0.9s linear' }}
          />
        </svg>
        <span className="text-3xl font-bold text-emerald-600 z-10">{countdown}</span>
      </div>

      <p className="text-slate-400 text-sm mb-6">
        Tự động quay lại trang chủ sau{' '}
        <span className="font-semibold text-emerald-500">{countdown} giây</span>
      </p>

      {/* Manual redirect button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-xl shadow-md transition-colors"
      >
        Về trang chủ ngay
      </button>
    </div>
  );
}
