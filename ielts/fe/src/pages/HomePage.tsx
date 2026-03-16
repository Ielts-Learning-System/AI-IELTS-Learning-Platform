import { Book, BarChart2, Clock } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-12">
      <div className="rounded-3xl p-12 text-white bg-gradient-to-br from-red-600 to-red-800">
        <h1 className="text-4xl font-bold">Chinh phục IELTS với IELTS Master</h1>
        <p className="mt-3 text-lg">
          Nền tảng luyện thi chuẩn xác, chấm điểm thông minh và cá nhân hóa lộ trình của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Kho đề thi phong phú', icon: Book },
          { title: 'Phân tích chi tiết', icon: BarChart2 },
          { title: 'Luyện tập mọi lúc', icon: Clock },
        ].map((f, idx) => (
          <div
            key={idx}
            className="bg-white shadow-sm rounded-xl p-6 text-center hover:shadow-md transition"
          >
            <f.icon className="mx-auto h-8 w-8 text-red-600" />
            <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
