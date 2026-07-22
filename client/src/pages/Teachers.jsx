import { useState } from 'react';
import { Search, Plus, Filter, Edit, Trash2 } from 'lucide-react';

const mockTeachers = [
  { id: 'GV001', name: 'Nguyễn Văn Toán', subject: 'Toán học', phone: '0987654321', email: 'toan.nv@school.edu.vn', status: 'Đang dạy' },
  { id: 'GV002', name: 'Trần Thị Lý', subject: 'Vật lý', phone: '0987654322', email: 'ly.tt@school.edu.vn', status: 'Đang dạy' },
  { id: 'GV003', name: 'Lê Hoàng Hóa', subject: 'Hóa học', phone: '0987654323', email: 'hoa.lh@school.edu.vn', status: 'Nghỉ phép' },
];

const Teachers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const userRole = localStorage.getItem('userRole') || 'student';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý Giáo viên</h2>
        {userRole === 'admin' && (
          <button className="btn-primary flex items-center">
            <Plus size={20} className="mr-2" />
            Thêm Giáo viên
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50">
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm giáo viên..."
              className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium w-full sm:w-auto justify-center">
            <Filter size={18} className="mr-2" />
            Lọc danh sách
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-medium">
              <tr>
                <th className="px-6 py-4 border-b border-gray-100">Mã GV</th>
                <th className="px-6 py-4 border-b border-gray-100">Họ và tên</th>
                <th className="px-6 py-4 border-b border-gray-100">Môn giảng dạy</th>
                <th className="px-6 py-4 border-b border-gray-100">Số điện thoại</th>
                <th className="px-6 py-4 border-b border-gray-100">Email</th>
                <th className="px-6 py-4 border-b border-gray-100">Trạng thái</th>
                <th className="px-6 py-4 border-b border-gray-100 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {mockTeachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-0">
                  <td className="px-6 py-4 font-medium text-blue-600">{teacher.id}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{teacher.name}</td>
                  <td className="px-6 py-4">
                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg text-xs font-medium">
                      {teacher.subject}
                    </span>
                  </td>
                  <td className="px-6 py-4">{teacher.phone}</td>
                  <td className="px-6 py-4">{teacher.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      teacher.status === 'Đang dạy' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {teacher.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end space-x-2">
                      {userRole === 'admin' ? (
                        <>
                          <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Sửa">
                            <Edit size={18} />
                          </button>
                          <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                            <Trash2 size={18} />
                          </button>
                        </>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Chỉ xem</span>
                      )}
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

export default Teachers;
