import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Filter, Edit, Trash2, X, Lock, Unlock, ShieldAlert, Award, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import Swal from 'sweetalert2';
import { generateTeacherCode } from '../utils/codeGenerator';
import { isValidPhoneNumber, sanitizePhoneNumber, PHONE_ERROR_MESSAGES } from '../utils/phoneValidation';

const DEFAULT_SUBJECTS = [
  'Toán học', 'Vật lý', 'Hóa học', 'Ngữ văn', 'Sinh học', 'Lịch sử', 'Địa lý', 'Tiếng Anh', 'Tin học', 'Giáo dục công dân', 'Thể dục', 'Giáo dục quốc phòng', 'Công nghệ'
];

const TEACHER_POSITIONS = [
  'Giáo viên bộ môn',
  'Giáo viên chủ nhiệm',
  'Trưởng bộ môn',
  'Trưởng khoa / Quản khoa',
  'Ban giám hiệu'
];

const TeacherModal = ({ isOpen, onClose, teacher, subjectsList = [], onSubmit }) => {
  const [formData, setFormData] = useState({
    teacherCode: '',
    fullName: '',
    subject: 'Toán học',
    position: 'Giáo viên bộ môn',
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
        position: teacher.profile?.position || 'Giáo viên bộ môn',
        phone: teacher.profile?.phone || '',
        email: teacher.email || '',
        username: teacher.username || ''
      });
    } else {
      setFormData({
        teacherCode: generateTeacherCode(),
        fullName: '',
        subject: subjectsList[0]?.name || 'Toán học',
        position: 'Giáo viên bộ môn',
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
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200"
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/70">
          <h2 className="text-xl font-bold text-slate-800">
            {teacher ? 'Sửa thông tin Giáo viên' : 'Thêm Giáo viên mới'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-xl hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        
        <form className="p-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Họ và tên *</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" placeholder="Nhập họ tên..." />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Mã giáo viên (Bất biến) *</label>
              <input type="text" name="teacherCode" value={formData.teacherCode} readOnly required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 font-mono font-bold text-indigo-600 outline-none cursor-not-allowed text-sm" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Chức vụ trong trường *</label>
              <select name="position" value={formData.position} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium text-slate-700">
                {TEACHER_POSITIONS.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Môn giảng dạy chính *</label>
              <select name="subject" value={formData.subject} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium text-slate-700">
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

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Số điện thoại liên hệ *</label>
              <input 
                type="tel" 
                name="phone" 
                value={formData.phone} 
                onChange={handleChange} 
                placeholder="VD: 0912345678" 
                maxLength={10}
                className={`w-full px-4 py-2.5 rounded-xl border outline-none transition-colors text-sm font-medium ${
                  errors.phone ? 'border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/20' : 'border-slate-200 focus:ring-2 focus:ring-indigo-500'
                }`} 
              />
              {errors.phone && (
                <p className="text-rose-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                  <span>⚠️</span> {errors.phone}
                </p>
              )}
            </div>
            
            {!teacher && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tên đăng nhập hệ thống *</label>
                  <input type="text" name="username" value={formData.username} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" placeholder="Tên đăng nhập (VD: gv_nguyenvanb)" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email trường cấp *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" placeholder="Email (VD: gv001@school.edu.vn)" />
                </div>
              </>
            )}
          </div>

          <div className="mt-8 flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors font-semibold text-sm">
              Hủy bỏ
            </button>
            <button type="submit" className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer">
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
  const [positionFilter, setPositionFilter] = useState('');
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
        const updateData = {
          fullName: formData.fullName,
          phone: formData.phone,
          subject: formData.subject,
          position: formData.position
        };
        await api.put(`/users/${selectedTeacher.id}`, updateData);
        Swal.fire('Thành công', 'Cập nhật thành công', 'success');
      } else {
        const newData = {
          ...formData,
          role: 'teacher',
          password: `${formData.teacherCode}@123`
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
    const isCurrentActive = teacher.status === 'active';
    const newStatus = isCurrentActive ? 'blocked' : 'active';
    const actionText = isCurrentActive ? 'Khóa' : 'Mở khóa';
    
    const result = await Swal.fire({
      title: `${actionText} tài khoản?`,
      text: `Bạn có chắc chắn muốn ${actionText.toLowerCase()} quyền truy cập của giáo viên này?`,
      icon: isCurrentActive ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: isCurrentActive ? '#d33' : '#10b981',
      cancelButtonText: 'Hủy',
      confirmButtonText: 'Xác nhận'
    });

    if (result.isConfirmed) {
      try {
        await api.patch(`/users/${teacher.id}/status`, { status: newStatus });
        Swal.fire('Thành công', `Đã ${actionText.toLowerCase()} tài khoản thành công`, 'success');
        fetchTeachers();
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Có lỗi xảy ra', 'error');
      }
    }
  };

  const filteredTeachers = teachers.filter(t => {
    const nameMatch = t.profile?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    const codeMatch = t.profile?.teacherCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const posMatch = positionFilter ? (t.profile?.position === positionFilter) : true;
    return (nameMatch || codeMatch) && posMatch;
  });

  const getInitials = (name) => {
    if (!name) return 'GV';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const stats = useMemo(() => {
    const total = teachers.length;
    const active = teachers.filter(t => t.status === 'active').length;
    const departments = new Set(teachers.map(t => t.profile?.specialization || 'Toán học')).size;
    return { total, active, departments };
  }, [teachers]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Quản lý Cán bộ Giáo viên</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">Danh sách giáo viên, phân công bộ môn và phân quyền chức vụ</p>
        </div>
        {userRole === 'admin' && (
          <button onClick={handleAdd} className="btn-primary flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-2xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 transition-all cursor-pointer">
            <Plus size={18} className="mr-2" />
            Thêm Giáo viên
          </button>
        )}
      </div>

      {/* Quick Stats Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Award size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tổng số cán bộ GV</p>
            <p className="text-xl font-extrabold text-slate-800">{stats.total} Giáo viên</p>
          </div>
        </div>
        <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Sparkles size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tài khoản Hoạt động</p>
            <p className="text-xl font-extrabold text-slate-800">{stats.active} / {stats.total}</p>
          </div>
        </div>
        <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Filter size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tổ bộ môn phụ trách</p>
            <p className="text-xl font-extrabold text-slate-800">{stats.departments} Chuyên môn</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/60">
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm theo mã GV, họ tên..."
              className="pl-10 pr-4 py-2.5 w-full border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium text-slate-800 shadow-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex space-x-2 w-full sm:w-auto">
            <select
              value={positionFilter}
              onChange={e => setPositionFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-2xl outline-none text-sm bg-white font-semibold text-slate-700 shadow-xs"
            >
              <option value="">Tất cả Chức vụ</option>
              {TEACHER_POSITIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
             <div className="p-12 text-center text-slate-500 font-medium">Đang tải danh sách giáo viên...</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
              <thead className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Mã GV</th>
                  <th className="px-6 py-4 min-w-[200px]">Họ và tên</th>
                  <th className="px-6 py-4 min-w-[170px]">Chức vụ</th>
                  <th className="px-6 py-4 min-w-[150px]">Bộ môn</th>
                  <th className="px-6 py-4">Số điện thoại</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-slate-400 font-medium">Không tìm thấy giáo viên nào.</td></tr>
                ) : filteredTeachers.map((teacher) => {
                  const isActive = teacher.status === 'active';
                  return (
                    <tr key={teacher.id} className="hover:bg-indigo-50/40 transition-colors">
                      {/* Mã GV */}
                      <td className="px-6 py-4 font-mono font-bold text-indigo-600 text-sm">
                        {teacher.profile?.teacherCode}
                      </td>

                      {/* Họ và tên with Avatar */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0">
                            {getInitials(teacher.profile?.fullName)}
                          </div>
                          <span className="font-bold text-slate-900 text-sm">
                            {teacher.profile?.fullName}
                          </span>
                        </div>
                      </td>

                      {/* Chức vụ */}
                      <td className="px-6 py-4">
                        <span className="whitespace-nowrap inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-2xs">
                          {teacher.profile?.position || 'Giáo viên bộ môn'}
                        </span>
                      </td>

                      {/* Bộ môn */}
                      <td className="px-6 py-4">
                        <span className="whitespace-nowrap inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100 shadow-2xs">
                          {teacher.profile?.specialization || 'Toán học'}
                        </span>
                      </td>

                      {/* Số điện thoại */}
                      <td className="px-6 py-4 font-medium text-slate-700 font-mono text-sm">
                        {teacher.profile?.phone || '—'}
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4 font-medium text-slate-500 text-xs font-mono">
                        {teacher.email}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-6 py-4">
                        <span className={`whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {isActive ? 'Hoạt động' : 'Bị khóa'}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center space-x-1.5">
                          {userRole === 'admin' ? (
                            <>
                              <button 
                                onClick={() => handleToggleStatus(teacher)} 
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                  isActive 
                                    ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 hover:scale-105' 
                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:scale-105'
                                }`} 
                                title={isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                              >
                                {isActive ? <Lock size={15} /> : <Unlock size={15} />}
                              </button>
                              <button 
                                onClick={() => handleEdit(teacher)} 
                                className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-105 transition-all cursor-pointer" 
                                title="Sửa thông tin"
                              >
                                <Edit size={15} />
                              </button>
                              <button 
                                onClick={() => handleDelete(teacher.id)} 
                                className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-100 hover:scale-105 transition-all cursor-pointer" 
                                title="Xóa giáo viên"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Chỉ xem</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      <AnimatePresence>
        {isModalOpen && (
          <TeacherModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            teacher={selectedTeacher} 
            subjectsList={subjects} 
            onSubmit={handleModalSubmit} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Teachers;
