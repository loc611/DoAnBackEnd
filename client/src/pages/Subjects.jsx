import { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';

const mockSubjects = [
  { id: 'MH001', name: 'Toán học', credit: 4, type: 'Bắt buộc', teacher: 'Thầy Nguyễn Văn X' },
  { id: 'MH002', name: 'Ngữ văn', credit: 4, type: 'Bắt buộc', teacher: 'Cô Trần Thị Y' },
  { id: 'MH003', name: 'Vật lý', credit: 3, type: 'Bắt buộc', teacher: null },
  { id: 'MH004', name: 'Hóa học', credit: 3, type: 'Bắt buộc', teacher: 'Thầy Lê Văn Z' },
  { id: 'MH005', name: 'Tin học', credit: 2, type: 'Tự chọn', teacher: null },
];

const Subjects = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý Môn học</h2>
        <button className="btn-primary flex items-center">
          <Plus size={20} className="mr-2" />
          Thêm Môn học
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-medium">
              <tr>
                <th className="px-6 py-4 border-b border-gray-100">Mã MH</th>
                <th className="px-6 py-4 border-b border-gray-100">Tên môn học</th>
                <th className="px-6 py-4 border-b border-gray-100">Số tín chỉ / Tiết</th>
                <th className="px-6 py-4 border-b border-gray-100">Loại hình</th>
                <th className="px-6 py-4 border-b border-gray-100">Giảng viên phụ trách</th>
                <th className="px-6 py-4 border-b border-gray-100 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {mockSubjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-0">
                  <td className="px-6 py-4 font-medium text-blue-600">{subject.id}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{subject.name}</td>
                  <td className="px-6 py-4">{subject.credit}</td>
                  <td className="px-6 py-4">
                     <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      subject.type === 'Bắt buộc' ? 'bg-indigo-100 text-indigo-700' : 'bg-pink-100 text-pink-700'
                    }`}>
                      {subject.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {subject.teacher ? (
                      <div className="flex items-center justify-between group">
                         <span className="font-medium text-gray-700">{subject.teacher}</span>
                         <button className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 text-xs font-medium ml-2 border border-blue-200 px-2 py-1 rounded transition-opacity">
                            Đổi
                         </button>
                      </div>
                    ) : (
                      <button className="flex items-center text-emerald-600 hover:bg-emerald-100 text-sm font-medium bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors border border-emerald-100">
                        <Plus size={16} className="mr-1" />
                        Thêm GV
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end space-x-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                        <Edit size={18} />
                      </button>
                      <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Subjects;
