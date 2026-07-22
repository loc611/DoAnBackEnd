import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Filter, Edit, Trash2, X } from 'lucide-react';

const mockStudents = [
  { id: 'HS001', name: 'Nguyễn Văn A', gender: 'Nam', dob: '15/05/2008', class: '10A1', phone: '0901234567', status: 'Đang học', password: 'student123' },
  { id: 'HS002', name: 'Trần Thị B', gender: 'Nữ', dob: '22/08/2008', class: '10A2', phone: '0901234568', status: 'Đang học', password: 'student123' },
  { id: 'HS003', name: 'Lê Hoàng C', gender: 'Nam', dob: '10/01/2007', class: '11B1', phone: '0901234569', status: 'Bảo lưu', password: 'student123' },
  { id: 'HS004', name: 'Phạm Thu D', gender: 'Nữ', dob: '05/11/2007', class: '11B2', phone: '0901234570', status: 'Đang học', password: 'student123' },
  { id: 'HS005', name: 'Hoàng Minh E', gender: 'Nam', dob: '18/03/2006', class: '12C1', phone: '0901234571', status: 'Đang học', password: 'student123' },
];

import { Eye, EyeOff } from 'lucide-react';

const StudentModal = ({ isOpen, onClose, student }) => {
  const [selectedBlock, setSelectedBlock] = useState('Khối A');

  // Lọc danh sách lớp dựa trên Khối đã chọn
  const getClassesByBlock = () => {
    switch (selectedBlock) {
      case 'Khối A': return ['10A1', '10A2', '11A1', '12A1'];
      case 'Khối B': return ['10B1', '10B2', '11B1', '12B1'];
      case 'Khối C': return ['10C1', '11C1', '12C1'];
      case 'Khối D': return ['10D1', '10D2', '11D1', '12D1'];
      default: return [];
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">
            {student ? 'Sửa thông tin Học sinh' : 'Thêm Học sinh mới'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
            <X size={24} />
          </button>
        </div>
        
        <form className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Họ và tên</label>
              <input type="text" defaultValue={student?.name} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="Nhập họ tên..." />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mã học sinh (Tự động)</label>
              <input type="text" defaultValue={student?.id} disabled className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500" placeholder="HS00..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ngày sinh</label>
              <input type="date" className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Giới tính</label>
              <select defaultValue={student?.gender} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nguyện vọng (Khối)</label>
              <select 
                value={selectedBlock}
                onChange={(e) => setSelectedBlock(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Khối A">Khối A (Toán, Lý, Hóa)</option>
                <option value="Khối B">Khối B (Toán, Hóa, Sinh)</option>
                <option value="Khối C">Khối C (Văn, Sử, Địa)</option>
                <option value="Khối D">Khối D (Toán, Văn, Anh)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phân Lớp</label>
              <select defaultValue={student?.class} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">-- Chọn lớp --</option>
                {getClassesByBlock().map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại phụ huynh</label>
              <input type="text" defaultValue={student?.phone} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nhập số điện thoại..." />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ</label>
              <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nhập địa chỉ..." />
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium">
              Hủy bỏ
            </button>
            <button type="button" className="btn-primary px-5 py-2.5">
              Lưu thông tin
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const Students = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const userRole = localStorage.getItem('userRole') || 'student';

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleEdit = (student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedStudent(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý Học sinh</h2>
        {userRole === 'admin' && (
          <button onClick={handleAdd} className="btn-primary flex items-center">
            <Plus size={20} className="mr-2" />
            Thêm Học sinh
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
              placeholder="Tìm kiếm theo tên, mã HS..."
              className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button className="flex items-center px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium w-full sm:w-auto justify-center">
              <Filter size={18} className="mr-2" />
              Lọc danh sách
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-medium">
              <tr>
                <th className="px-6 py-4 border-b border-gray-100">Mã HS</th>
                <th className="px-6 py-4 border-b border-gray-100">Họ và tên</th>
                <th className="px-6 py-4 border-b border-gray-100">Giới tính</th>
                <th className="px-6 py-4 border-b border-gray-100">Ngày sinh</th>
                <th className="px-6 py-4 border-b border-gray-100">Lớp</th>
                <th className="px-6 py-4 border-b border-gray-100">SĐT</th>
                <th className="px-6 py-4 border-b border-gray-100">Trạng thái</th>
                {userRole === 'admin' && (
                  <th className="px-6 py-4 border-b border-gray-100">Mật khẩu</th>
                )}
                <th className="px-6 py-4 border-b border-gray-100 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {mockStudents.map((student, idx) => (
                <tr key={student.id} className="hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-0">
                  <td className="px-6 py-4 font-medium text-blue-600">{student.id}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{student.name}</td>
                  <td className="px-6 py-4">{student.gender}</td>
                  <td className="px-6 py-4">{student.dob}</td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-medium">
                      {student.class}
                    </span>
                  </td>
                  <td className="px-6 py-4">{student.phone}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      student.status === 'Đang học' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  {userRole === 'admin' && (
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {visiblePasswords[student.id] ? student.password : '••••••••'}
                        </span>
                        <button 
                          onClick={() => togglePasswordVisibility(student.id)}
                          className="text-gray-400 hover:text-blue-500 transition-colors"
                        >
                          {visiblePasswords[student.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => handleEdit(student)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Sửa">
                        <Edit size={18} />
                      </button>
                      {userRole === 'admin' && (
                        <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Hiển thị 1 đến 5 của 1,260 học sinh</span>
            <div className="flex space-x-1">
                <button className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50">Trước</button>
                <button className="px-3 py-1 rounded-lg bg-blue-600 text-white">1</button>
                <button className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50">2</button>
                <button className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50">3</button>
                <button className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50">Sau</button>
            </div>
        </div>
      </div>

      <AnimatePresence>
        <StudentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} student={selectedStudent} />
      </AnimatePresence>
    </div>
  );
};

export default Students;
