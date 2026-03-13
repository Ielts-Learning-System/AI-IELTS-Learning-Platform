'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Mic, Square, Play, Volume2, ChevronRight, RefreshCw } from 'lucide-react';

// ==========================================
// ANIMATED EXAMINER SVG COMPONENT
// ==========================================
function AnimatedExaminer({ isSpeaking, size = 80 }: { isSpeaking: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="select-none"
    >
      {/* Background circle */}
      <circle cx="60" cy="60" r="58" fill={isSpeaking ? '#FEF2F2' : '#F8FAFC'} stroke={isSpeaking ? '#DC2626' : '#E2E8F0'} strokeWidth="3" />

      {/* Hair */}
      <ellipse cx="60" cy="38" rx="28" ry="24" fill="#1E293B" />
      <ellipse cx="60" cy="30" rx="24" ry="16" fill="#1E293B" />

      {/* Face */}
      <ellipse cx="60" cy="50" rx="22" ry="24" fill="#FBBF8C" />

      {/* Ears */}
      <ellipse cx="38" cy="50" rx="4" ry="6" fill="#F5A76C" />
      <ellipse cx="82" cy="50" rx="4" ry="6" fill="#F5A76C" />

      {/* Eyes */}
      <ellipse cx="51" cy="47" rx="3" ry="3.5" fill="#1E293B" />
      <ellipse cx="69" cy="47" rx="3" ry="3.5" fill="#1E293B" />
      {/* Eye highlights */}
      <circle cx="52" cy="46" r="1" fill="white" />
      <circle cx="70" cy="46" r="1" fill="white" />

      {/* Eyebrows */}
      <path d="M46 41 Q51 38 56 41" stroke="#1E293B" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M64 41 Q69 38 74 41" stroke="#1E293B" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Nose */}
      <path d="M58 52 Q60 56 62 52" stroke="#E8956A" strokeWidth="1.2" fill="none" strokeLinecap="round" />

      {/* Mouth - animated when speaking, static smile when not */}
      {isSpeaking ? (
        <ellipse cx="60" cy="61" rx="5" ry="4" fill="#1E293B" className="animate-pulse">
          <animate attributeName="ry" values="4;2;5;3;4" dur="0.4s" repeatCount="indefinite" />
          <animate attributeName="rx" values="5;4;6;4;5" dur="0.4s" repeatCount="indefinite" />
        </ellipse>
      ) : (
        <path d="M53 60 Q60 66 67 60" stroke="#1E293B" strokeWidth="2" fill="none" strokeLinecap="round" />
      )}

      {/* Red vest / suit jacket */}
      <path d="M30 95 Q30 78 60 78 Q90 78 90 95 L90 120 L30 120 Z" fill="#DC2626" />
      {/* White shirt collar */}
      <path d="M50 78 L55 90 L60 80 L65 90 L70 78" fill="white" stroke="#F1F5F9" strokeWidth="0.5" />
      {/* Lapels */}
      <path d="M50 78 L42 95" stroke="#B91C1C" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M70 78 L78 95" stroke="#B91C1C" strokeWidth="1.5" strokeLinecap="round" />

      {/* Speaking indicator rings */}
      {isSpeaking && (
        <>
          <circle cx="60" cy="60" r="56" stroke="#DC2626" strokeWidth="1" fill="none" opacity="0.3">
            <animate attributeName="r" values="56;60" dur="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0" dur="1s" repeatCount="indefinite" />
          </circle>
          <circle cx="60" cy="60" r="56" stroke="#DC2626" strokeWidth="1" fill="none" opacity="0.2">
            <animate attributeName="r" values="56;64" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.2;0" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </>
      )}
    </svg>
  );
}

// ==========================================
// 1. MOCK DATA TRỰC TIẾP TRONG FILE
// ==========================================
const mockSpeakingTest = {
  id: "ielts-mock-01",
  part_1: [
    "Let's talk about your hometown. Where is your hometown?",
    "What do you like most about your hometown?",
    "Has your hometown changed much since you were a child?",
    "Now let's move on to talk about hobbies. What do you usually do in your free time?"
  ],
  part_2: {
    topic: "Describe a memorable journey you have made.",
    points: [
      "Where you went",
      "How you traveled",
      "Who went with you",
      "And explain why it is memorable."
    ],
    prepTime: 60,
    speakTime: 120,
    introSpeech: "Now, I'm going to give you a topic and I'd like you to talk about it for one to two minutes. Before you talk, you'll have one minute to think about what you're going to say. Here is your topic: Describe a memorable journey you have made."
  },
  part_3: [
    "We've been talking about a journey. Now I'd like to discuss with you one or two more general questions related to this. Why do people need to travel every day?",
    "What problems can people have when they travel on a long journey?",
    "How has transportation changed in your country in the last 20 years?"
  ]
};

export function SpeakingExamPage() {
  const exam = mockSpeakingTest;
  
  // States quản lý tiến trình
  const [currentPart, setCurrentPart] = useState<1 | 2 | 3>(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // States quản lý thu âm & AI
  const [isRecording, setIsRecording] = useState(false);
  const [isExaminerSpeaking, setIsExaminerSpeaking] = useState(false);
  const [isExamStarted, setIsExamStarted] = useState(false);

  // Lấy câu hỏi hiện tại dựa trên Part
  const getCurrentQuestionText = () => {
    if (currentPart === 1) return exam.part_1[currentQuestionIndex];
    if (currentPart === 2) return exam.part_2.introSpeech;
    if (currentPart === 3) return exam.part_3[currentQuestionIndex];
    return "";
  };

  // ==========================================
  // 2. LOGIC AI ĐỌC CÂU HỎI (TEXT-TO-SPEECH)
  // ==========================================
  const speakQuestion = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Dừng câu đang nói (nếu có)
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Cố gắng tìm giọng Anh-Anh (UK) cho chuẩn IELTS
      const voices = window.speechSynthesis.getVoices();
      const ukVoice = voices.find(voice => voice.lang.includes('en-GB'));
      if (ukVoice) utterance.voice = ukVoice;
      
      utterance.rate = 0.95; // Tốc độ đọc tự nhiên
      utterance.pitch = 1;

      utterance.onstart = () => setIsExaminerSpeaking(true);
      utterance.onend = () => setIsExaminerSpeaking(false);
      utterance.onerror = () => setIsExaminerSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } else {
      alert("Trình duyệt của bạn không hỗ trợ tính năng đọc giọng nói.");
    }
  };

  // Tự động đọc câu hỏi khi chuyển Part hoặc chuyển câu (chỉ khi đã bắt đầu thi)
  useEffect(() => {
    if (!isExamStarted) return;
    const textToSpeak = getCurrentQuestionText();
    if (textToSpeak) {
      // Delay nhẹ 500ms để mô phỏng sự tự nhiên trước khi AI nói
      const timer = setTimeout(() => speakQuestion(textToSpeak), 500);
      return () => clearTimeout(timer);
    }
  }, [currentPart, currentQuestionIndex, isExamStarted]);

  // Handle chuyển câu hỏi
  const handleNextQuestion = () => {
    window.speechSynthesis.cancel(); // Dừng đọc nếu user bấm Next
    setIsRecording(false);
    
    const maxIndex = currentPart === 1 ? exam.part_1.length - 1 : exam.part_3.length - 1;
    if (currentPart !== 2 && currentQuestionIndex < maxIndex) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (currentPart < 3) {
      setCurrentPart((prev) => (prev + 1) as 1 | 2 | 3);
      setCurrentQuestionIndex(0);
    }
  };

  const handleTabChange = (part: 1 | 2 | 3) => {
    window.speechSynthesis.cancel();
    setCurrentPart(part);
    setCurrentQuestionIndex(0);
    setIsRecording(false);
  };

  const handleStartExam = () => {
    setIsExamStarted(true);
  };

  // ==========================================
  // WELCOME SCREEN (trước khi bắt đầu thi)
  // ==========================================
  if (!isExamStarted) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8">
          {/* Animated Examiner - trạng thái tĩnh */}
          <div className="relative">
            <div className="absolute -inset-4 bg-red-50 rounded-full blur-xl opacity-60" />
            <div className="relative">
              <AnimatedExaminer isSpeaking={false} size={160} />
            </div>
          </div>

          {/* Welcome text */}
          <div className="text-center space-y-3 max-w-lg">
            <h1 className="text-3xl font-bold text-slate-900">
              Welcome to the IELTS Speaking Practice Test
            </h1>
            <p className="text-slate-500 text-lg leading-relaxed">
              Bạn sẽ trải qua 3 phần thi Speaking với giám khảo AI. Hãy đảm bảo micro đã được bật và kết nối.
            </p>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleStartExam}
            className="mt-4 inline-flex items-center gap-3 px-10 py-4 bg-red-600 text-white text-lg font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95"
          >
            <Mic className="h-5 w-5" />
            Bắt đầu thi
          </button>

          {/* Info chips */}
          <div className="flex items-center gap-4 mt-2">
            {['Part 1: Interview', 'Part 2: Cue Card', 'Part 3: Discussion'].map((label) => (
              <span key={label} className="px-4 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // EXAM INTERFACE (sau khi bắt đầu thi)
  // ==========================================
  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Thanh Header / Điều hướng Parts */}
      <div className="flex items-center justify-between bg-white border-b border-slate-200 px-8 py-4 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">IELTS Speaking Practice</h1>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          {[1, 2, 3].map((part) => (
            <button
              key={part}
              onClick={() => handleTabChange(part as 1 | 2 | 3)}
              className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                currentPart === part 
                  ? 'bg-red-600 text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
              }`}
            >
              Part {part}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 flex justify-center">
        <div className="w-full max-w-4xl space-y-8">
          
          {/* ========================================== */}
          {/* KHU VỰC CỦA GIÁM KHẢO AI (AI EXAMINER) */}
          {/* ========================================== */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 relative overflow-hidden">
            {/* Hiệu ứng sóng âm khi AI đang nói */}
            {isExaminerSpeaking && (
              <div className="absolute top-0 left-0 w-full h-1 bg-red-100 overflow-hidden">
                <div className="h-full bg-red-500 animate-pulse w-1/2 rounded-full"></div>
              </div>
            )}

            <div className="flex items-start gap-6">
              {/* Avatar AI - AnimatedExaminer */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <AnimatedExaminer isSpeaking={isExaminerSpeaking} size={80} />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Examiner</span>
              </div>

              {/* Lời thoại của AI */}
              <div className="flex-1 bg-slate-50 rounded-2xl rounded-tl-none p-6 border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    {currentPart === 2 ? 'Cue Card Instructions' : `Question ${currentQuestionIndex + 1}`}
                  </span>
                  <button 
                    onClick={() => speakQuestion(getCurrentQuestionText())}
                    className="text-slate-400 hover:text-red-600 transition-colors"
                    title="Nghe lại câu hỏi"
                  >
                    <Volume2 className="h-5 w-5" />
                  </button>
                </div>
                
                <p className="text-xl font-medium text-slate-800 leading-relaxed">
                  {getCurrentQuestionText()}
                </p>

                {/* Giao diện đặc thù cho Part 2 (Cue Card) */}
                {currentPart === 2 && (
                  <div className="mt-6 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">{exam.part_2.topic}</h3>
                    <p className="font-medium text-slate-600 mb-3">You should say:</p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700">
                      {exam.part_2.points.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* KHU VỰC CỦA HỌC VIÊN (USER RECORDING) */}
          {/* ========================================== */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-6">
            <h2 className="text-lg font-bold text-slate-800">Your Turn</h2>
            
            <div className="text-sm font-medium text-slate-500">
              {isExaminerSpeaking 
                ? 'Đang nghe giám khảo đọc câu hỏi...' 
                : isRecording 
                  ? 'Đang thu âm câu trả lời của bạn...' 
                  : 'Bấm vào Micro để bắt đầu trả lời'}
            </div>

            <button 
              onClick={() => setIsRecording(!isRecording)}
              disabled={isExaminerSpeaking}
              className={`h-20 w-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isExaminerSpeaking
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : isRecording 
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-red-200' 
                    : 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-200'
              }`}
            >
              {isRecording ? <Square className="h-8 w-8 fill-current" /> : <Mic className="h-8 w-8" />}
            </button>

            {isRecording && (
              <div className="font-mono text-2xl font-bold text-red-600">
                00:12
              </div>
            )}

            {/* Nút chuyển câu hỏi */}
            {!isRecording && !isExaminerSpeaking && (
               <button 
                onClick={handleNextQuestion}
                className="mt-4 flex items-center gap-2 px-8 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
               >
                 {currentPart === 3 && currentQuestionIndex === exam.part_3.length - 1 
                   ? 'Kết thúc bài thi' 
                   : 'Câu hỏi tiếp theo'}
                 <ChevronRight className="h-5 w-5" />
               </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}