import { Edit2, Trash2 } from 'lucide-react';
import { Test } from './TestManagement';

interface TestTableProps {
  tests: Test[];
  isLoading: boolean;
  onDelete: (testId: string) => void;
}

const skillColors = {
  reading: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Reading' },
  listening: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Listening' },
};

export function TestTable({ tests, isLoading, onDelete }: TestTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="inline-flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <p className="mt-4 text-slate-600">Đang tải danh sách đề thi...</p>
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-slate-600 text-lg">Chưa có đề thi nào. Hãy tạo một đề thi mới!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                Tên đề thi
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                Kỹ năng
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                Số câu hỏi
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                Ngày tạo
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {tests.map((test) => {
              const skillColor = skillColors[test.skill];
              return (
                <tr key={test._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-900 font-medium">{test.name}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${skillColor.bg} ${skillColor.text}`}
                    >
                      {skillColor.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{test.questions} câu</td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(test.createdAt)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => test._id && onDelete(test._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
