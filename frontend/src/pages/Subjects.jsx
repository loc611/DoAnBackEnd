import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import api from '../services/api';

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await api.get('/subjects');
        setSubjects(response.data);
      } catch (error) {
        console.error('Failed to fetch subjects:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  if (loading) return <div className="p-6">Đang tải dữ liệu...</div>;

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
              {subjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-0">
                  <td className="px-6 py-4 font-medium text-blue-600">{subject.subjectCode}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{subject.name}</td>
                  <td className="px-6 py-4">{subject.credits}</td>
                  <td className="px-6 py-4">
                     <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      subject.type === 'Bắt buộc' ? 'bg-indigo-100 text-indigo-700' : 'bg-pink-100 text-pink-700'
                    }`}>
                      {subject.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {subject.teacherId ? (
                      <div className="flex items-center justify-between group">
                         <span className="font-medium text-gray-700">{subject.teacherId.fullName || subject.teacherId.teacherCode}</span>
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
