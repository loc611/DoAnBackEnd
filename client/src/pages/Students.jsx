import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Filter, Edit, Trash2, X, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';

const StudentModal = ({ isOpen, onClose, student, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    dob: '',
    gender: 'Nam',
    className: '',
    phone: '',
    status: 'Đang học',
    block: 'Khối A' // Virtual field to filter classes
  });

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        studentId: student.studentId || '',
        dob: student.dob || '',
        gender: student.gender || 'Nam',
        className: student.className || '',
        phone: student.phone || '',
        status: student.status || 'Đang học',
        block: getBlockByClass(student.className) || 'Khối A'
      });
    } else {
      setFormData({
        name: '',
        studentId: '',
        dob: '',
        gender: 'Nam',
        className: '',
        phone: '',
        status: 'Đang học',
        block: 'Khối A'
      });
    }
  }, [student, isOpen]);

  const getBlockByClass = (cls) => {
    if (!cls) return 'Khối A';
    if (cls.includes('A')) return 'Khối A';
    if (cls.includes('B')) return 'Khối B';
    if (cls.includes('C')) return 'Khối C';
    if (cls.includes('D')) return 'Khối D';
    return 'Khối A';
  };

  const getClassesByBlock = () => {
    switch (formData.block) {
      case 'Khối A': return ['10A1', '10A2', '11A1', '12A1'];
      case 'Khối B': return ['10B1', '10B2', '11B1', '12B1'];
      case 'Khối C': return ['10C1', '11C1', '12C1'];
      case 'Khối D': return ['10D1', '10D2', '11D1', '12D1'];
      default: return [];
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
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
        
        <form className="p-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Họ và tên *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="Nhập họ tên..." />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mã học sinh *</label>
              <input type="text" name="studentId" value={formData.studentId} onChange={handleChange} required disabled={!!student} className={`w-full px-4 py-2 rounded-lg border border-gray-200 ${student ? 'bg-gray-50 text-gray-500' : 'focus:ring-2 focus:ring-blue-500'} outline-none`} placeholder="VD: HS001" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ngày sinh</label>
              <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Giới tính</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nguyện vọng (Khối)</label>
              <select 
                name="block"
                value={formData.block}
                onChange={handleChange}
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
              <select name="className" value={formData.className} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">-- Chọn lớp --</option>
                {getClassesByBlock().map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nhập số điện thoại..." />
            </div>
            
            {student && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="Đang học">Đang học</option>
                    <option value="Bảo lưu">Bảo lưu</option>
                    <option value="Đã nghỉ">Đã nghỉ</option>
                  </select>
                </div>
            )}
          </div>

          <div className="mt-8 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium">
              Hủy bỏ
            </button>
            <button type="submit" className="btn-primary px-5 py-2.5">
              Lưu thông tin
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const Students = () => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [loading, setLoading] = useState(true);
  
  const userRole = localStorage.getItem('userRole') || 'student';

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/students');
      setStudents(res.data);
    } catch (err) {
      console.error(err);
      alert('Không thể tải danh sách học sinh!');
    } finally {
      setLoading(false);
    }
  };

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

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa học sinh này và tài khoản liên kết?')) {
        try {
            await api.delete(`/students/${id}`);
            fetchStudents(); // Refresh data
        } catch (err) {
            console.error(err);
            alert('Lỗi khi xoá học sinh!');
        }
    }
  };

  const handleModalSubmit = async (formData) => {
      try {
          if (selectedStudent) {
              // Update
              await api.put(`/students/${selectedStudent._id}`, formData);
          } else {
              // Create
              await api.post('/students', formData);
          }
          setIsModalOpen(false);
          fetchStudents(); // Refresh data
      } catch (err) {
          console.error(err);
          alert(err.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin!');
      }
  };

  const filteredStudents = students.filter(s => 
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
             <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
          ) : (
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
                  <th className="px-6 py-4 border-b border-gray-100">Tài khoản (Tự động)</th>
                )}
                <th className="px-6 py-4 border-b border-gray-100 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                  <tr>
                      <td colSpan={userRole === 'admin' ? 9 : 8} className="px-6 py-4 text-center text-gray-500">
                          Không có dữ liệu học sinh nào.
                      </td>
                  </tr>
              ) : filteredStudents.map((student) => (
                <tr key={student._id} className="hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-0">
                  <td className="px-6 py-4 font-medium text-blue-600">{student.studentId}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{student.name}</td>
                  <td className="px-6 py-4">{student.gender}</td>
                  <td className="px-6 py-4">{student.dob}</td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-medium">
                      {student.className || 'Chưa xếp'}
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
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {student.user?.email || 'N/A'}<br/>
                      <span className="text-blue-500">Pass: student123</span>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    {userRole === 'admin' && (
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => handleEdit(student)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Sửa">
                                <Edit size={18} />
                            </button>
                            <button onClick={() => handleDelete(student._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </div>
      <AnimatePresence>
        <StudentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} student={selectedStudent} onSubmit={handleModalSubmit} />
      </AnimatePresence>
    </div>
  );
};

export default Students;
