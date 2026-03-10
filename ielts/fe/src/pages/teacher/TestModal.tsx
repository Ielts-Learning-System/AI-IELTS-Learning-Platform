import { useState } from 'react';
import { X, Plus, Trash2, Sparkles, Upload } from 'lucide-react';
import axios from 'axios';

interface Passage {
  text: string;
  questions: QuestionItem[];
}

interface QuestionItem {
  text: string;
  options?: string[];
  answer?: string;
}

interface TestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestCreated: () => void;
}

interface FormData {
  name: string;
  skill: 'reading' | 'listening';
  passages: Passage[];
}

export function TestModal({ isOpen, onClose, onTestCreated }: TestModalProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    skill: 'reading',
    passages: [{ text: '', questions: [{ text: '', options: [], answer: '' }] }],
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!isOpen) return null;

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addPassage = () => {
    setFormData(prev => ({
      ...prev,
      passages: [
        ...prev.passages,
        { text: '', questions: [{ text: '', options: [], answer: '' }] },
      ],
    }));
  };

  const removePassage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      passages: prev.passages.filter((_, i) => i !== index),
    }));
  };

  const updatePassage = (index: number, text: string) => {
    setFormData(prev => {
      const newPassages = [...prev.passages];
      newPassages[index].text = text;
      return { ...prev, passages: newPassages };
    });
  };

  const addQuestion = (passageIndex: number) => {
    setFormData(prev => {
      const newPassages = [...prev.passages];
      newPassages[passageIndex].questions.push({
        text: '',
        options: [],
        answer: '',
      });
      return { ...prev, passages: newPassages };
    });
  };

  const removeQuestion = (passageIndex: number, questionIndex: number) => {
    setFormData(prev => {
      const newPassages = [...prev.passages];
      newPassages[passageIndex].questions = newPassages[passageIndex].questions.filter(
        (_, i) => i !== questionIndex
      );
      return { ...prev, passages: newPassages };
    });
  };

  const updateQuestion = (
    passageIndex: number,
    questionIndex: number,
    text: string
  ) => {
    setFormData(prev => {
      const newPassages = [...prev.passages];
      newPassages[passageIndex].questions[questionIndex].text = text;
      return { ...prev, passages: newPassages };
    });
  };

  const handleAiImport = async (e: React.DragEvent<HTMLDivElement> | React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    let files: FileList | null = null;

    if (e instanceof DragEvent) {
      files = e.dataTransfer?.files;
    } else if (e.target instanceof HTMLInputElement) {
      files = e.target.files;
    }

    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];

    if (!allowedTypes.includes(file.type)) {
      alert('Chỉ hỗ trợ file PDF hoặc ảnh (JPG, PNG)');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const formDataToSend = new FormData();
      formDataToSend.append('file', file);
      formDataToSend.append('skill', formData.skill);

      const token = localStorage.getItem('token');

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      const response = await axios.post(
        'http://localhost:3000/api/reading/extract-ai',
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Auto-fill form with AI extracted data
      if (response.data.data) {
        const aiData = response.data.data;
        setFormData(prev => ({
          ...prev,
          name: aiData.name || prev.name,
          skill: aiData.skill || prev.skill,
          passages: aiData.passages || prev.passages,
        }));

        // Switch to manual tab to review
        setActiveTab('manual');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Lỗi trong quá trình xử lý file. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSaveTest = async () => {
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên đề thi');
      return;
    }

    if (formData.passages.length === 0) {
      alert('Vui lòng thêm ít nhất một đoạn văn');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const totalQuestions = formData.passages.reduce(
        (sum, p) => sum + p.questions.length,
        0
      );

      const payload = {
        name: formData.name,
        skill: formData.skill,
        questions: totalQuestions,
        passages: formData.passages,
      };

      await axios.post('http://localhost:3000/api/tests', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert('Đề thi đã được lưu thành công!');
      onTestCreated();
      onClose();
    } catch (error) {
      console.error('Error saving test:', error);
      alert('Lỗi khi lưu đề thi. Vui lòng thử lại.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-2xl font-bold text-slate-900">Tạo Đề Thi Mới</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-slate-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6 flex-shrink-0">
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Nhập Thủ Công
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'ai'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Trích xuất AI
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'manual' ? (
            <div className="space-y-6">
              {/* Test Name */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Tên Đề Thi
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="VD: IELTS Reading Test 1"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Skill Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Kỹ Năng
                </label>
                <select
                  value={formData.skill}
                  onChange={(e) =>
                    handleFormChange('skill', e.target.value as 'reading' | 'listening')
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="reading">Reading</option>
                  <option value="listening">Listening</option>
                </select>
              </div>

              {/* Passages */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Đoạn Văn</h3>
                  <button
                    onClick={addPassage}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm Đoạn Văn
                  </button>
                </div>

                <div className="space-y-6">
                  {formData.passages.map((passage, passageIndex) => (
                    <div
                      key={passageIndex}
                      className="border border-slate-300 rounded-lg p-4 bg-slate-50"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-slate-900">
                          Đoạn Văn {passageIndex + 1}
                        </h4>
                        {formData.passages.length > 1 && (
                          <button
                            onClick={() => removePassage(passageIndex)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Passage Text */}
                      <textarea
                        value={passage.text}
                        onChange={(e) => updatePassage(passageIndex, e.target.value)}
                        placeholder="Dán nội dung đoạn văn tại đây..."
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 h-32"
                      />

                      {/* Questions for this Passage */}
                      <div className="space-y-3">
                        {passage.questions.map((question, questionIndex) => (
                          <div
                            key={questionIndex}
                            className="bg-white border border-slate-200 rounded-lg p-3 flex items-start gap-2"
                          >
                            <span className="text-slate-500 font-medium mt-2 min-w-fit">
                              Q{questionIndex + 1}:
                            </span>
                            <div className="flex-1">
                              <input
                                type="text"
                                value={question.text}
                                onChange={(e) =>
                                  updateQuestion(
                                    passageIndex,
                                    questionIndex,
                                    e.target.value
                                  )
                                }
                                placeholder="Nhập câu hỏi..."
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            {passage.questions.length > 1 && (
                              <button
                                onClick={() =>
                                  removeQuestion(passageIndex, questionIndex)
                                }
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => addQuestion(passageIndex)}
                        className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <Plus className="h-4 w-4" />
                        Thêm Câu Hỏi
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // AI Import Tab
            <div className="space-y-6">
              <p className="text-slate-600">
                Tải lên file PDF hoặc ảnh chứa đề thi. AI sẽ tự động trích xuất nội dung và điền vào form.
              </p>

              {/* Drag and Drop Zone */}
              <div
                onDrop={handleAiImport}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('bg-blue-50', 'border-blue-400');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('bg-blue-50', 'border-blue-400');
                }}
                className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-slate-900 mb-2">
                  Kéo thả file hoặc click để chọn
                </p>
                <p className="text-sm text-slate-600 mb-4">
                  Hỗ trợ: PDF, JPG, PNG
                </p>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleAiImport}
                  className="hidden"
                  id="file-input"
                />
                <label
                  htmlFor="file-input"
                  className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Chọn File
                </label>
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="font-medium text-blue-900">
                      AI đang đọc đề thi, vui lòng đợi trong giây lát...
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-blue-700 mt-2">{uploadProgress}%</p>
                </div>
              )}

              {/* Skill Selection for AI */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Chọn Kỹ Năng
                </label>
                <select
                  value={formData.skill}
                  onChange={(e) =>
                    handleFormChange('skill', e.target.value as 'reading' | 'listening')
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="reading">Reading</option>
                  <option value="listening">Listening</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 flex-shrink-0 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-100 transition-colors font-medium"
          >
            Hủy
          </button>
          <button
            onClick={handleSaveTest}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-5 w-5" />
            Lưu Đề Thi
          </button>
        </div>
      </div>
    </div>
  );
}
