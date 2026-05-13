import { useState } from 'react';
import { X, Plus, AlertCircle, Loader, Edit3, Trash2 } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import axios from 'axios';
import { useUserStore } from '../../store/useUserStore';

interface TestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestCreated: () => void;
}

interface Question {
  questionNumber: number;
  type: 'TFNG' | 'MULTIPLE_CHOICE' | 'MATCHING' | 'FILL_IN_BLANK' | 'YNNG';
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface MenuBarProps {
  editor: any;
}

function MenuBar({ editor }: MenuBarProps) {
  if (!editor) {
    return null;
  }

  const buttonClass = (isActive: boolean) =>
    `px-3 py-1 rounded transition-colors ${isActive
      ? 'bg-blue-600 text-white'
      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
    }`;

  return (
    <div className="flex gap-2 p-2 border-b border-slate-200 bg-slate-50 flex-wrap">
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={buttonClass(editor.isActive('heading', { level: 2 }))}
        title="Heading 2"
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={buttonClass(editor.isActive('heading', { level: 3 }))}
        title="Heading 3"
      >
        H3
      </button>
      <div className="border-l border-slate-300" />
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={buttonClass(editor.isActive('bold'))}
        title="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={buttonClass(editor.isActive('italic'))}
        title="Italic"
      >
        <em>I</em>
      </button>
      <div className="border-l border-slate-300" />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={buttonClass(editor.isActive('bulletList'))}
        title="Bullet List"
      >
        • List
      </button>
    </div>
  );
}

export function TestModal({ isOpen, onClose, onTestCreated }: TestModalProps) {
  const { token: storeToken } = useUserStore();
  const getToken = () => storeToken || localStorage.getItem('accessToken') || localStorage.getItem('token') || '';

  const [bandScore, setBandScore] = useState<string>('6.5');
  const [keywords, setKeywords] = useState<string>('');
  const [passageType, setPassageType] = useState<'1' | '2' | '3'>('1');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [questions, setQuestions] = useState<Question[]>([]);
  const [passageTitle, setPassageTitle] = useState<string>('');

  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Select passage type, enter keywords, and click "Generate Test" to create content...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none p-4 min-h-[400px] focus:outline-none text-slate-900',
      },
    },
  });

  if (!isOpen) return null;

  const passageInfo: Record<'1' | '2' | '3', { label: string; description: string; wordCount: string }> = {
    '1': {
      label: 'Passage 1: Factual & Descriptive',
      description: 'Easier difficulty, 700-800 words, 13 questions (T/F/NG, Note Completion)',
      wordCount: '700-800',
    },
    '2': {
      label: 'Passage 2: Discursive & Complex',
      description: 'Medium difficulty, 800-900 words, 13 questions (Matching Headings, Multiple Choice)',
      wordCount: '800-900',
    },
    '3': {
      label: 'Passage 3: Academic & Argumentative',
      description: 'Higher difficulty, 800-950 words, 14 questions (Y/N/NG, Matching Features)',
      wordCount: '800-950',
    },
  };

  const handleGenerateAI = async () => {
    if (!keywords.trim()) {
      setErrorMessage('Please enter keywords or topic');
      return;
    }

    setErrorMessage('');
    setIsGenerating(true);

    try {
      const token = getToken();

      console.log('📤 Sending request:', { bandScore, keywords, passageType });

      const response = await axios.post(
        'http://localhost:3000/api/reading/generate-ai',
        {
          bandScore,
          keywords: keywords.trim(),
          passageType,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('📥 Response received:', response.data);

      if (response.data.success && response.data.data) {
        const { title, passageContent, questions: genQuestions } = response.data.data;
        editor?.commands.setContent(passageContent);
        setPassageTitle(title || '');
        setQuestions(Array.isArray(genQuestions) ? genQuestions : []);
        setErrorMessage('');
      } else {
        setErrorMessage('Unexpected response format from server');
      }
    } catch (error) {
      console.error('❌ Error generating test:', error);
      const errorMsg =
        (error as any)?.response?.data?.message ||
        (error as any)?.message ||
        'Failed to generate test. Please try again.';
      setErrorMessage(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setQuestions(prev =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  };

  const handleSaveTest = async () => {
    const htmlContent = editor?.getHTML();

    if (!htmlContent || questions.length === 0) {
      setErrorMessage('Vui lòng tạo đề và kiểm tra câu hỏi.');
      return;
    }

    try {
      const token = getToken();

      // Build payload matching ReadingTest schema
      const payload = {
        title: passageTitle || `IELTS Reading Test - ${keywords}`,
        description: `Target Band ${bandScore}`,
        isPublished: true,
        passages: [
          {
            passageNumber: parseInt(passageType),
            title: passageTitle || 'Reading Passage',
            content: htmlContent,
            questions: questions.map(q => ({
              questionNumber: q.questionNumber,
              type: q.type,
              text: q.text,
              options: q.options || [],
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
            })),
          },
        ],
      };

      const response = await axios.post('http://localhost:3000/api/reading', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        alert('Đề thi chuyên nghiệp đã được lưu thành công!');
        onTestCreated();
        onClose();
      }
    } catch (error) {
      setErrorMessage((error as any).response?.data?.message || 'Lỗi lưu cấu trúc đề thi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0 bg-gradient-to-r from-slate-50 to-white">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Generate IELTS Reading Test</h2>
            <p className="text-sm text-slate-600 mt-1">
              Create reading passages with AI-generated content
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Left Column: Configuration Form (1/3 width) */}
            <div className="w-full lg:w-1/3 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-3">Configuration</h3>

                {/* Target Band Score */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Target Band Score
                  </label>
                  <select
                    value={bandScore}
                    onChange={(e) => setBandScore(e.target.value)}
                    disabled={isGenerating}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="5.0">5.0</option>
                    <option value="5.5">5.5</option>
                    <option value="6.0">6.0</option>
                    <option value="6.5">6.5</option>
                    <option value="7.0">7.0</option>
                    <option value="7.5">7.5</option>
                    <option value="8.0">8.0</option>
                    <option value="8.5">8.5</option>
                    <option value="9.0">9.0</option>
                  </select>
                </div>

                {/* Passage Type */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Passage Type
                  </label>
                  <div className="space-y-2">
                    {(['1', '2', '3'] as const).map((type) => (
                      <label key={type} className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="passageType"
                          value={type}
                          checked={passageType === type}
                          onChange={(e) => setPassageType(e.target.value as '1' | '2' | '3')}
                          disabled={isGenerating}
                          className="mt-1"
                        />
                        <div>
                          <p className="font-medium text-slate-900">
                            {passageInfo[type].label}
                          </p>
                          <p className="text-xs text-slate-600">
                            {passageInfo[type].description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Keywords / Topic */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Keywords / Topic <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    disabled={isGenerating}
                    placeholder="e.g., Climate change, artificial intelligence, space exploration"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Describe the topic or keywords for the reading passage
                  </p>
                </div>

                {/* Optional Passage Title */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Passage Title (optional)
                  </label>
                  <input
                    type="text"
                    value={passageTitle}
                    onChange={(e) => setPassageTitle(e.target.value)}
                    disabled={isGenerating}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Custom passage title"
                  />
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateAI}
                disabled={isGenerating || !keywords.trim()}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    Generate Test
                  </>
                )}
              </button>

              {/* Error Message */}
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              )}
            </div>

            {/* Right Column: Editor & Questions (2/3 width) */}
            <div className="w-full lg:w-2/3 space-y-6">
              {/* Passage Editor */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-900">Reading Passage</h3>
                  <p className="text-sm text-slate-600">Edit the passage content below</p>
                </div>
                <MenuBar editor={editor} />
                <EditorContent
                  editor={editor}
                  className="min-h-[300px] bg-slate-50"
                />
              </div>

              {/* Questions Editor */}
              {questions.length > 0 && (
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-900">Questions ({questions.length})</h3>
                    <p className="text-sm text-slate-600">Review and edit the generated questions</p>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto p-4 space-y-4">
                    {questions.map((question, index) => (
                      <div key={index} className="border border-slate-200 rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-slate-900">Question {question.questionNumber}</h4>
                          <select
                            value={question.type}
                            onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                            className="px-2 py-1 border border-slate-300 rounded text-sm"
                          >
                            <option value="TFNG">True/False/Not Given</option>
                            <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                            <option value="MATCHING">Matching</option>
                            <option value="FILL_IN_BLANK">Fill in Blank</option>
                            <option value="YNNG">Yes/No/Not Given</option>
                          </select>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Question Text
                            </label>
                            <textarea
                              value={question.text}
                              onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              rows={2}
                            />
                          </div>

                          {(question.type === 'MULTIPLE_CHOICE' || question.type === 'MATCHING') && (
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Options (one per line)
                              </label>
                              <textarea
                                value={question.options.join('\n')}
                                onChange={(e) => updateQuestion(index, 'options', e.target.value.split('\n').filter(opt => opt.trim()))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                rows={3}
                                placeholder="Option A\nOption B\nOption C"
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Correct Answer
                              </label>
                              <input
                                type="text"
                                value={question.correctAnswer}
                                onChange={(e) => updateQuestion(index, 'correctAnswer', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Explanation
                              </label>
                              <input
                                type="text"
                                value={question.explanation}
                                onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-slate-200 flex-shrink-0 bg-slate-50">
          <p className="text-xs text-slate-600">
            The generated content can be edited using the formatting toolbar
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-100 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTest}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              <Plus className="h-5 w-5" />
              Save Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
