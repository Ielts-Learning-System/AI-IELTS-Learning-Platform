import { AlertCircle, Users, CheckCircle } from 'lucide-react';

interface GradingTask {
  id: string;
  studentName: string;
  testType: 'Writing' | 'Speaking';
  submittedDate: string;
  urgency: 'high' | 'medium' | 'low';
}

export function TeacherDashboard() {
  // Sample data - Bài thi cần chấm gấp
  const gradingTasks: GradingTask[] = [
    {
      id: '1',
      studentName: 'Nguyễn Văn A',
      testType: 'Writing',
      submittedDate: '2 giờ trước',
      urgency: 'high',
    },
    {
      id: '2',
      studentName: 'Trần Thị B',
      testType: 'Speaking',
      submittedDate: '4 giờ trước',
      urgency: 'high',
    },
    {
      id: '3',
      studentName: 'Lê Văn C',
      testType: 'Writing',
      submittedDate: '1 ngày trước',
      urgency: 'medium',
    },
    {
      id: '4',
      studentName: 'Phạm Huyền D',
      testType: 'Speaking',
      submittedDate: '2 ngày trước',
      urgency: 'medium',
    },
  ];

  const urgencyColor = {
    high: 'border-l-red-500 bg-red-50',
    medium: 'border-l-yellow-500 bg-yellow-50',
    low: 'border-l-green-500 bg-green-50',
  };

  const urgencyBadge = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  };

  const urgencyLabel = {
    high: 'Gấp',
    medium: 'Bình thường',
    low: 'Không gấp',
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Bảng điều khiển Giáo viên</h2>
        <p className="text-slate-600 mt-2">Quản lý bài thi, học viên và lịch dạy của bạn</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Cần chấm gấp</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">2</p>
            </div>
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Số học viên</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">28</p>
            </div>
            <Users className="h-10 w-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Đã chấm tuần này</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">12</p>
            </div>
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
        </div>
      </div>

      {/* Grading Tasks */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Bài thi cần chấm</h3>

        {gradingTasks.length > 0 ? (
          <div className="space-y-3">
            {gradingTasks.map((task) => (
              <div
                key={task.id}
                className={`border-l-4 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow ${
                  urgencyColor[task.urgency]
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-semibold text-slate-900">{task.studentName}</p>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${urgencyBadge[task.urgency]}`}>
                      {urgencyLabel[task.urgency]}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span>{task.testType}</span>
                    <span>•</span>
                    <span>{task.submittedDate}</span>
                  </div>
                </div>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                  Chấm bài
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-slate-600">Không có bài thi nào cần chấm</p>
          </div>
        )}
      </div>

      {/* My Classes */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Lớp học của tôi</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'Lớp A1 - Sáng', students: 15, schedule: 'T2, T4, T6: 7:00-9:00' },
            { name: 'Lớp A2 - Chiều', students: 18, schedule: 'T3, T5, T7: 14:00-16:00' },
            { name: 'Lớp B1 - Tối', students: 12, schedule: 'T2, T4: 19:00-21:00' },
          ].map((cls, idx) => (
            <div key={idx} className="border border-slate-200 rounded-lg p-4">
              <p className="font-semibold text-slate-900 mb-2">{cls.name}</p>
              <p className="text-sm text-slate-600 mb-2">{cls.students} học viên</p>
              <p className="text-xs text-slate-500">{cls.schedule}</p>
              <button className="mt-3 w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg text-sm font-medium transition-colors">
                Xem chi tiết
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
