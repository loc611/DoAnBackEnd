import { useState, useEffect } from 'react';
import { Search, Plus, Filter, Edit, Trash2, X, Lock, Unlock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import Swal from 'sweetalert2';
import { generateTeacherCode } from '../utils/codeGenerator';
import { isValidPhoneNumber, sanitizePhoneNumber, PHONE_ERROR_MESSAGES } from '../utils/phoneValidation';

const DEFAULT_SUBJECTS = [
  'Toán học', 'Vật lý', 'Hóa học', 'Ngữ văn', 'Sinh học', 'Lịch sử', 'Địa lý', 'Tiếng Anh', 'Tin học', 'Giáo dục công dân', 'Thể dục', 'Giáo dục quốc phòng', 'Công nghệ'
];

const TeacherModal = ({ isOpen, onClose, teacher, subjectsList = [], onSubmit }) => {
  const [formData, setFormData] = useState({
    teacherCode: '',
    fullName: '',
    subject: 'Toán học',
    phone: '',
    email: '',
    username: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (teacher) {
      setFormData({
        teacherCode: teacher.profile?.teacherCode || '',
        fullName: teacher.profile?.fullName || '',
        subject: teacher.profile?.specialization || (subjectsList[0]?.name || 'Toán học'),
        phone: teacher.profile?.phone || '',
        email: teacher.email || '',
        username: teacher.username || ''
      });
    } else {
      setFormData({
        teacherCode: generateTeacherCode(),
        fullName: '',
        subject: subjectsList[0]?.name || 'Toán học',
        phone: '',
        email: '',
        username: ''
      });
    }
    setErrors({});
  }, [teacher, isOpen, subjectsList]);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'phone') {
      value = sanitizePhoneNumber(value);
      const newErrors = { ...errors };
      if (!value) {
        newErrors.phone = PHONE_ERROR_MESSAGES.REQUIRED;
      } else if (!isValidPhoneNumber(value)) {
        newErrors.phone = PHONE_ERROR_MESSAGES.INVALID;
      } else {
        delete newErrors.phone;
      }
      setErrors(newErrors);
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.phone) {
      newErrors.phone = PHONE_ERROR_MESSAGES.REQUIRED;
    } else if (!isValidPhoneNumber(formData.phone)) {
      newErrors.phone = PHONE_ERROR_MESSAGES.INVALID;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

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
            {teacher ? 'Sửa thông tin Giáo viên' : 'Thêm Giáo viên mới'}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Mã giáo viên (Tự động) *</label>
              <input type="text" name="teacherCode" value={formData.teacherCode} readOnly required className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-100 font-mono font-semibold text-blue-600 outline-none cursor-not-allowed" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Môn giảng dạy *</label>
              <select name="subject" value={formData.subject} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
                {subjectsList && subjectsList.length > 0 ? (
                  subjectsList.map(s => (
                    <option key={s.id || s.subjectCode || s.name} value={s.name}>
                      {s.name} {s.subjectCode ? `(${s.subjectCode})` : ''}
                    </option>
                  ))
                ) : (
                  DEFAULT_SUBJECTS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại *</label>
              <input 
                type="tel" 
                name="phone" 
                value={formData.phone} 
                onChange={handleChange} 
                placeholder="VD: 0912345678" 
                maxLength={10}
                className={`w-full px-4 py-2 rounded-lg border outline-none transition-colors ${
                  errors.phone ? 'border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50/20' : 'border-gray-200 focus:ring-2 focus:ring-blue-500'
                }`} 
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                  <span>⚠️</span> {errors.phone}
                </p>
              )}
            </div>
            
            {!teacher && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tên đăng nhập *</label>
                  <input type="text" name="username" value={formData.username} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Tên đăng nhập hệ thống" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Email liên hệ" />
                </div>
              </>
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


const Teachers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  const userRole = localStorage.getItem('userRole') || 'student';

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const [resUsers, resSubjects] = await Promise.all([
        api.get('/users'),
        api.get('/subjects').catch(() => ({ data: [] }))
      ]);
      // Lọc ra các user có role = 'teacher'
      const teacherUsers = (resUsers.data || []).filter(u => u.role === 'teacher');
      setTeachers(teacherUsers);
      setSubjects(resSubjects.data || []);
    } catch (err) {
      console.error(err);
      Swal.fire('Lỗi', 'Không thể tải dữ liệu giáo viên', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedTeacher(null);
    setIsModalOpen(true);
  };

  const handleEdit = (teacher) => {
    setSelectedTeacher(teacher);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Xóa giáo viên?',
      text: 'Hành động này sẽ xóa hoàn toàn tài khoản và hồ sơ giáo viên!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: 'Hủy',
      confirmButtonText: 'Xóa ngay'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/users/${id}`);
        Swal.fire('Thành công', 'Đã xóa giáo viên', 'success');
        fetchTeachers();
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Có lỗi khi xóa', 'error');
      }
    }
  };

  const handleModalSubmit = async (formData) => {
    try {
      if (selectedTeacher) {
        // Cập nhật thông tin (chỉ gửi fullName, phone, subject)
        const updateData = {
          fullName: formData.fullName,
          phone: formData.phone,
          subject: formData.subject
        };
        await api.put(`/users/${selectedTeacher.id}`, updateData);
        Swal.fire('Thành công', 'Cập nhật thành công', 'success');
      } else {
        // Thêm mới
        const newData = {
          ...formData,
          role: 'teacher',
          password: `${formData.teacherCode}@123` // Mật khẩu mặc định
        };
        await api.post('/users', newData);
        Swal.fire('Thành công', 'Thêm giáo viên thành công', 'success');
      }
      setIsModalOpen(false);
      fetchTeachers();
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.message || 'Có lỗi xảy ra', 'error');
    }
  };

  const handleToggleStatus = async (teacher) => {
    const newStatus = teacher.status === 'active' ? 'inactive' : 'active';
    const actionText = newStatus === 'active' ? 'Mở khóa' : 'Khóa';
    
    const result = await Swal.fire({
      title: `${actionText} tài khoản?`,
      text: `Bạn có chắc chắn muốn ${actionText.toLowerCase()} tài khoản của giáo viên này?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: newStatus === 'active' ? '#10b981' : '#f59e0b',
      cancelButtonText: 'Hủy',
      confirmButtonText: 'Đồng ý'
    });

    if (result.isConfirmed) {
      try {
        await api.patch(`/users/${teacher.id}/status`, { status: newStatus });
        Swal.fire('Thành công', `Đã ${actionText.toLowerCase()} tài khoản`, 'success');
        fetchTeachers();
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Có lỗi xảy ra', 'error');
      }
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.profile?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.profile?.teacherCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý Giáo viên</h2>
        {userRole === 'admin' && (
          <button onClick={handleAdd} className="btn-primary flex items-center">
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
              placeholder="Tìm kiếm theo mã GV, tên..."
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
          {loading ? (
             <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
          ) : (
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
                {filteredTeachers.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-6 text-gray-500">Không tìm thấy giáo viên nào.</td></tr>
                ) : filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-0">
                    <td className="px-6 py-4 font-medium text-blue-600">{teacher.profile?.teacherCode}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{teacher.profile?.fullName}</td>
                    <td className="px-6 py-4">
                      <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg text-xs font-medium">
                        {teacher.profile?.specialization || 'Chưa phân công'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{teacher.profile?.phone || '---'}</td>
                    <td className="px-6 py-4">{teacher.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        teacher.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {teacher.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end space-x-2">
                        {userRole === 'admin' ? (
                          <>
                            <button onClick={() => handleToggleStatus(teacher)} className={`p-2 rounded-lg transition-colors ${teacher.status === 'active' ? 'text-amber-600 hover:bg-amber-100' : 'text-emerald-600 hover:bg-emerald-100'}`} title={teacher.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}>
                              {teacher.status === 'active' ? <Lock size={18} /> : <Unlock size={18} />}
                            </button>
                            <button onClick={() => handleEdit(teacher)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Sửa">
                              <Edit size={18} />
                            </button>
                            <button onClick={() => handleDelete(teacher.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
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
          )}
        </div>
      </div>
      
      <AnimatePresence>
        <TeacherModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          teacher={selectedTeacher} 
          subjectsList={subjects} 
          onSubmit={handleModalSubmit} 
        />
      </AnimatePresence>
    </div>
  );
};

export default Teachers;
