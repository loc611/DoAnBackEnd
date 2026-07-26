import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit, Trash2, X } from 'lucide-react';
import api from '../services/api';
import Swal from 'sweetalert2';

const StudentModal = ({ isOpen, onClose, student, classesList, onSubmit }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    studentCode: '',
    gender: 'Nam',
    classId: '',
    phone: '',
    parentPhone: ''
  });

  useEffect(() => {
    if (student) {
      setFormData({
        fullName: student.fullName || '',
        studentCode: student.studentCode || '',
        gender: student.gender || 'Nam',
        classId: student.classId?._id || '',
        phone: student.phone || '',
        parentPhone: student.parentPhone || ''
      });
    } else {
      setFormData({
        fullName: '',
        studentCode: '',
        gender: 'Nam',
        classId: '',
        phone: '',
        parentPhone: ''
      });
    }
  }, [student, isOpen]);

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
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nhập họ tên..." />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mã học sinh *</label>
              <input type="text" name="studentCode" value={formData.studentCode} onChange={handleChange} required disabled={!!student} className={`w-full px-4 py-2 rounded-lg border border-gray-200 ${student ? 'bg-gray-50 text-gray-500' : 'focus:ring-2 focus:ring-blue-500'} outline-none`} placeholder="VD: HS001" />
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Lớp học</label>
              <select name="classId" value={formData.classId} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">-- Chưa có lớp --</option>
                {classesList.map(c => (
                  <option key={c._id} value={c._id}>{c.className} (Khối {c.grade})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại HS</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nhập số điện thoại..." />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Số ĐT Phụ huynh</label>
              <input type="text" name="parentPhone" value={formData.parentPhone} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="SĐT phụ huynh..." />
            </div>
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
  const [classesList, setClassesList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const userRole = localStorage.getItem('userRole') || 'student';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resStudents, resClasses] = await Promise.all([
        api.get('/students'),
        api.get('/classes')
      ]);
      setStudents(resStudents.data);
      setClassesList(resClasses.data);
    } catch (err) {
      console.error(err);
      Swal.fire('Lỗi', 'Không thể tải dữ liệu!', 'error');
    } finally {
      setLoading(false);
    }
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
    const result = await Swal.fire({
        title: 'Xóa học sinh?',
        text: 'Toàn bộ dữ liệu tài khoản và hồ sơ học sinh sẽ bị xóa. Bạn có chắc chắn?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonText: 'Hủy',
        confirmButtonText: 'Xóa ngay'
    });

    if (result.isConfirmed) {
        try {
            await api.delete(`/students/${id}`);
            Swal.fire('Thành công', 'Đã xoá học sinh', 'success');
            fetchData();
        } catch (err) {
            Swal.fire('Lỗi', err.response?.data?.message || 'Lỗi khi xoá học sinh', 'error');
        }
    }
  };

  const handleModalSubmit = async (formData) => {
      try {
          if (selectedStudent) {
              await api.put(`/students/${selectedStudent._id}`, formData);
              Swal.fire('Thành công', 'Cập nhật thành công', 'success');
          } else {
              await api.post('/students', formData);
              Swal.fire('Thành công', 'Thêm học sinh thành công', 'success');
          }
          setIsModalOpen(false);
          fetchData();
      } catch (err) {
          Swal.fire('Lỗi', err.response?.data?.message || 'Có lỗi xảy ra', 'error');
      }
  };

  const filteredStudents = students.filter(s => 
      s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.studentCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-poppins">
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
              className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
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
                <th className="px-6 py-4 border-b border-gray-100">Lớp</th>
                <th className="px-6 py-4 border-b border-gray-100">SĐT</th>
                <th className="px-6 py-4 border-b border-gray-100">Trạng thái</th>
                {userRole === 'admin' && (
                  <th className="px-6 py-4 border-b border-gray-100">Tài khoản (Tự động)</th>
                )}
                {userRole === 'admin' && (
                  <th className="px-6 py-4 border-b border-gray-100 text-right">Thao tác</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                  <tr>
                      <td colSpan={userRole === 'admin' ? 8 : 6} className="px-6 py-8 text-center text-gray-500">
                          Không có dữ liệu học sinh nào.
                      </td>
                  </tr>
              ) : filteredStudents.map((student) => (
                <tr key={student._id} className="hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-0">
                  <td className="px-6 py-4 font-medium text-blue-600">{student.studentCode}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{student.fullName}</td>
                  <td className="px-6 py-4">{student.gender}</td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-medium">
                      {student.classId ? student.classId.className : 'Chưa xếp'}
                    </span>
                  </td>
                  <td className="px-6 py-4">{student.phone}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      student.userId?.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {student.userId?.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </td>
                  {userRole === 'admin' && (
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {student.userId?.email || 'N/A'}<br/>
                      <span className="text-blue-500">Pass: student123</span>
                    </td>
                  )}
                  {userRole === 'admin' && (
                    <td className="px-6 py-4">
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => handleEdit(student)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Sửa">
                                <Edit size={18} />
                            </button>
                            <button onClick={() => handleDelete(student._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </div>
      <AnimatePresence>
        <StudentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} student={selectedStudent} classesList={classesList} onSubmit={handleModalSubmit} />
      </AnimatePresence>
    </div>
  );
};

export default Students;
