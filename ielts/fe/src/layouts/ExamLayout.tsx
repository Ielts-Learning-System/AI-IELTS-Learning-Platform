import { Outlet, useNavigate } from 'react-router-dom';
import { useExamStore } from '../store/useExamStore';
import { Clock, ChevronLeft, Send } from 'lucide-react';
import { useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';

export function ExamLayout() {
  const { timeLeft, tickTime, submitExam, isSubmitted } = useExamStore();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isSubmitted) {
        tickTime();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [tickTime, isSubmitted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = () => {
    submitExam();
    toast.success('Đã nộp bài thành công!');
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Toaster position="top-center" />
      {/* Exam Toolbar */}
      <header className="flex h-14 items-center justify-between bg-indigo-950 px-6 text-white shadow-md z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold tracking-wide">IELTS Reading Test</span>
        </div>

        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-lg font-bold ${timeLeft < 300 ? 'bg-red-500/20 text-red-400' : 'bg-white/10'}`}>
            <Clock className="h-5 w-5" />
            {formatTime(timeLeft)}
          </div>
          
          <button 
            onClick={handleSubmit}
            disabled={isSubmitted}
            className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-1.5 font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
            {isSubmitted ? 'Đã nộp' : 'Nộp bài'}
          </button>
        </div>
      </header>

      {/* Main Exam Area */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
