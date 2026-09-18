import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Plus, Filter, Edit, Trash2, X, Lock, Unlock, 
  ShieldAlert, Award, Sparkles, Eye, KeyRound, BookOpen, 
  History, CheckSquare, Square, Send, Building2, GraduationCap, 
  Calendar, Briefcase, ChevronDown, Check, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import Swal from 'sweetalert2';
import { generateTeacherCode } from '../utils/codeGenerator';
import { isValidPhoneNumber, sanitizePhoneNumber, PHONE_ERROR_MESSAGES } from '../utils/phoneValidation';
import TeachingAssignmentModal from '../components/TeachingAssignmentModal';
import AuditLogDrawer from '../components/AuditLogDrawer';

const TEACHER_POSITIONS = [
  'Hiệu trưởng',
  'Phó Hiệu trưởng',
  'Tổ trưởng chuyên môn',
  'Tổ phó chuyên môn',
  'Giáo viên bộ môn',
  'Bí thư Đoàn trường',
  'Giám thị'
];

const getPositionBadgeStyle = (pos) => {
  switch (pos) {
    case 'Hiệu trưởng':
      return 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-900 border-amber-300 font-extrabold shadow-xs';
    case 'Phó Hiệu trưởng':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold shadow-xs';
    case 'Tổ trưởng chuyên môn':
      return 'bg-purple-50 text-purple-700 border-purple-200 font-bold shadow-xs';
    case 'Tổ phó chuyên môn':
      return 'bg-violet-50 text-violet-700 border-violet-200 font-semibold';
    case 'Bí thư Đoàn trường':
      return 'bg-rose-50 text-rose-700 border-rose-200 font-bold shadow-xs';
    case 'Giám thị':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold shadow-xs';
    case 'Giáo viên bộ môn':
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 font-medium';
  }
};

const getContractBadge = (contractType) => {
  switch (contractType) {
    case 'permanent':
    case 'BIEN_CHE':
      return { label: 'Biên chế', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'contract_111':
    case 'HD_111':
      return { label: 'HĐ 111', style: 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'visiting':
    case 'THINH_GIANG':
      return { label: 'Thỉnh giảng', style: 'bg-blue-50 text-blue-700 border-blue-200' };
    default:
      return { label: 'Biên chế', style: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
};

const TeacherModal = ({ isOpen, onClose, teacher, subjectsList = [], departmentsList = [], onSubmit }) => {
  const [formData, setFormData] = useState({
    teacherCode: '',
    fullName: '',
    subject: 'Toán học',
    position: 'Giáo viên bộ môn',
    departmentId: '',
    academicDegree: 'Cử nhân',
    teacherType: 'permanent',
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
        departmentId: teacher.profile?.departmentId || (departmentsList[0]?.id || ''),
        academicDegree: teacher.profile?.academicDegree || 'Cử nhân',
        teacherType: teacher.profile?.teacherType || 'permanent',
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
        departmentId: departmentsList[0]?.id || '',
        academicDegree: 'Cử nhân',
        teacherType: 'permanent',
        phone: '',
        email: '',
        username: ''
      });
    }
    setErrors({});
  }, [teacher, isOpen, subjectsList, departmentsList]);

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
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
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer">
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
              <label className="block text-sm font-semibold text-slate-700 mb-2">Tổ chuyên môn</label>
              <select name="departmentId" value={formData.departmentId} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium text-slate-700">
                <option value="">-- Chưa gán tổ --</option>
                {departmentsList.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
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
              <label className="block text-sm font-semibold text-slate-700 mb-2">Bộ môn đào tạo chính *</label>
              <select name="subject" value={formData.subject} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium text-slate-700">
                {subjectsList.map(sub => (
                  <option key={sub.id || sub.name} value={sub.name}>{sub.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Trình độ / Học vị</label>
              <select name="academicDegree" value={formData.academicDegree} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium text-slate-700">
                <option value="Cử nhân">Cử nhân (Đại học)</option>
                <option value="Thạc sĩ">Thạc sĩ</option>
                <option value="Tiến sĩ">Tiến sĩ</option>
                <option value="Nghiên cứu sinh">Nghiên cứu sinh</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Loại hợp đồng</label>
              <select name="teacherType" value={formData.teacherType} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium text-slate-700">
                <option value="permanent">Biên chế / Viên chức</option>
                <option value="contract_111">Hợp đồng lao động (NĐ 111)</option>
                <option value="visiting">Giáo viên thỉnh giảng</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Số điện thoại *</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} required className={`w-full px-4 py-2.5 rounded-xl border ${errors.phone ? 'border-rose-500 ring-2 ring-rose-200' : 'border-slate-200'} focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium`} placeholder="09xxxxxxxx" />
              {errors.phone && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Tên đăng nhập (Username) *</label>
              <input type="text" name="username" value={formData.username} onChange={handleChange} required disabled={!!teacher} className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 ${teacher ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'} focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium`} placeholder="VD: an.nv" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email hệ thống</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" placeholder="Tự sinh @school.edu.vn nếu trống" />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-colors cursor-pointer text-sm">
              Hủy bỏ
            </button>
            <button type="submit" className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer text-sm">
              {teacher ? 'Cập nhật giáo viên' : 'Thêm mới giáo viên'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const Teachers = () => {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [positionFilter, setPositionFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [contractFilter, setContractFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [homeroomFilter, setHomeroomFilter] = useState('');

  // Modals & Drawers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [auditTeacher, setAuditTeacher] = useState(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [assignmentTeacherId, setAssignmentTeacherId] = useState(null);

  const userRole = localStorage.getItem('userRole') || 'guest';
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const isManagementUser = userRole === 'admin' || 
                           userData?.position === 'Trưởng khoa / Quản khoa' || 
                           userData?.position === 'Ban giám hiệu' ||
                           userData?.position === 'Hiệu trưởng' ||
                           userData?.position === 'Phó Hiệu trưởng';

  useEffect(() => {
    fetchTeachers();
    fetchSubjects();
    fetchDepartments();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      const teacherUsers = (res.data || []).filter(u => u.role === 'teacher');
      setTeachers(teacherUsers);
    } catch (err) {
      console.error(err);
      Swal.fire('Lỗi', 'Không thể tải danh sách giáo viên', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/subjects');
      setSubjects(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartmentsList(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Row selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredTeachers.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (e, teacherId) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(teacherId) ? prev.filter(id => id !== teacherId) : [...prev, teacherId]
    );
  };

  const handleRowClick = (teacher) => {
    const teacherId = teacher.profile?.id || teacher.profile?.teacherCode || teacher.id;
    navigate(`/teachers/${teacherId}`);
  };

  const handleAdd = () => {
    setSelectedTeacher(null);
    setIsModalOpen(true);
  };

  const handleEdit = (teacher) => {
    setSelectedTeacher(teacher);
    setIsModalOpen(true);
  };

  const handleDelete = async (userId) => {
    const result = await Swal.fire({
      title: 'Xóa giáo viên?',
      text: 'Thao tác này sẽ xóa vĩnh viễn tài khoản và hồ sơ liên quan của giáo viên!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Xác nhận xóa',
      cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/users/${userId}`);
        Swal.fire('Đã xóa', 'Giáo viên đã được xóa khỏi hệ thống', 'success');
        fetchTeachers();
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Không thể xóa giáo viên', 'error');
      }
    }
  };

  const handleModalSubmit = async (formData) => {
    try {
      if (selectedTeacher) {
        const updateData = {
          fullName: formData.fullName,
          phone: formData.phone,
          specialization: formData.subject,
          position: formData.position,
          departmentId: formData.departmentId || null,
          academicDegree: formData.academicDegree,
          teacherType: formData.teacherType,
          email: formData.email
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

  // Reset Password for Single Teacher
  const handleResetPassword = async (teacher) => {
    const { value: newPassword } = await Swal.fire({
      title: 'Đặt lại mật khẩu',
      html: `
        <div class="text-left text-sm text-slate-600 mb-2">
          Đặt lại mật khẩu cho giáo viên: <b>${teacher.profile?.fullName || teacher.username}</b>
        </div>
      `,
      input: 'password',
      inputPlaceholder: 'Nhập mật khẩu mới (tối thiểu 4 ký tự)...',
      inputValue: '1111',
      showCancelButton: true,
      confirmButtonText: 'Xác nhận đặt lại',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#4F46E5',
      inputValidator: (val) => {
        if (!val || val.length < 4) return 'Mật khẩu phải có ít nhất 4 ký tự!';
      }
    });

    if (newPassword) {
      try {
        await api.patch(`/users/${teacher.id}/reset-password`, { password: newPassword });
        Swal.fire('Thành công', 'Đã đặt lại mật khẩu thành công!', 'success');
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Không thể đặt lại mật khẩu', 'error');
      }
    }
  };

  // Single Lock/Unlock
  const handleToggleStatus = async (teacher) => {
    if (!isManagementUser) {
      return Swal.fire('Không có quyền', 'Chỉ Quản trị viên hoặc BGH mới có quyền thực hiện.', 'warning');
    }

    const isCurrentActive = teacher.status === 'active';
    const newStatus = isCurrentActive ? 'blocked' : 'active';
    const actionText = isCurrentActive ? 'Khóa' : 'Mở khóa';
    
    const { value: reason } = await Swal.fire({
      title: `${actionText} tài khoản?`,
      text: `Bạn có chắc muốn ${actionText.toLowerCase()} quyền truy cập của giáo viên ${teacher.profile?.fullName || teacher.username}?`,
      input: 'textarea',
      inputLabel: 'Lý do thực hiện (Ghi vào Audit Log):',
      inputPlaceholder: `Nhập lý do ${actionText.toLowerCase()} tài khoản giáo viên...`,
      inputValidator: (val) => {
        if (newStatus !== 'active' && (!val || !val.trim())) {
          return 'Vui lòng nhập lý do để ghi nhận vào hệ thống!';
        }
      },
      icon: isCurrentActive ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: isCurrentActive ? '#d33' : '#10b981',
      cancelButtonText: 'Hủy bỏ',
      confirmButtonText: 'Xác nhận'
    });

    if (reason !== undefined) {
      try {
        await api.patch(`/users/${teacher.id}/status`, { 
          status: newStatus,
          reason: reason ? reason.trim() : `${actionText} tài khoản giáo viên`
        });
        Swal.fire('Thành công', `Đã ${actionText.toLowerCase()} tài khoản thành công`, 'success');
        fetchTeachers();
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Có lỗi xảy ra', 'error');
      }
    }
  };

  /* ========================================================================= */
  /* BULK ACTIONS                                                              */
  /* ========================================================================= */
  const handleBulkChangeDepartment = async () => {
    if (!departmentsList.length) return;

    const inputOptions = {};
    departmentsList.forEach(d => {
      inputOptions[d.id] = d.name;
    });

    const { value: targetDeptId } = await Swal.fire({
      title: 'Chuyển Tổ chuyên môn hàng loạt',
      text: `Chọn Tổ chuyên môn mới cho ${selectedIds.length} giáo viên đã chọn:`,
      input: 'select',
      inputOptions,
      inputPlaceholder: '-- Chọn Tổ chuyên môn đích --',
      showCancelButton: true,
      confirmButtonText: 'Xác nhận chuyển',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#4F46E5',
      inputValidator: (v) => {
        if (!v) return 'Vui lòng chọn một tổ chuyên môn!';
      }
    });

    if (targetDeptId) {
      try {
        const res = await api.post('/users/teachers/bulk-action', {
          action: 'change_department',
          userIds: selectedIds,
          targetDepartmentId: targetDeptId
        });
        Swal.fire('Thành công', res.data?.message || 'Đã chuyển tổ thành công', 'success');
        setSelectedIds([]);
        fetchTeachers();
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Không thể chuyển tổ', 'error');
      }
    }
  };

  const handleBulkLock = async (action) => {
    const isLock = action === 'lock_accounts';
    const actionText = isLock ? 'Khóa' : 'Mở khóa';

    const { value: reason } = await Swal.fire({
      title: `${actionText} hàng loạt tài khoản?`,
      text: `Thao tác này sẽ ${actionText.toLowerCase()} ${selectedIds.length} tài khoản giáo viên được chọn.`,
      input: 'textarea',
      inputLabel: 'Lý do thực hiện (Ghi nhận Audit Log):',
      inputPlaceholder: `Nhập lý do ${actionText.toLowerCase()}...`,
      showCancelButton: true,
      confirmButtonText: `Xác nhận ${actionText}`,
      confirmButtonColor: isLock ? '#d33' : '#10B981',
      cancelButtonText: 'Hủy'
    });

    if (reason !== undefined) {
      try {
        const res = await api.post('/users/teachers/bulk-action', {
          action,
          userIds: selectedIds,
          reason
        });
        Swal.fire('Thành công', res.data?.message || 'Thao tác thành công', 'success');
        setSelectedIds([]);
        fetchTeachers();
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Không thể thực thi thao tác', 'error');
      }
    }
  };

  const handleBulkResetPassword = async () => {
    const { value: password } = await Swal.fire({
      title: 'Reset mật khẩu hàng loạt',
      text: `Đặt lại mật khẩu cho ${selectedIds.length} giáo viên đã chọn. Mặc định là "1111"`,
      input: 'password',
      inputPlaceholder: 'Nhập mật khẩu mới...',
      inputValue: '1111',
      showCancelButton: true,
      confirmButtonText: 'Xác nhận Reset',
      confirmButtonColor: '#4F46E5',
      cancelButtonText: 'Hủy'
    });

    if (password !== undefined) {
      try {
        const res = await api.post('/users/teachers/bulk-action', {
          action: 'reset_passwords',
          userIds: selectedIds,
          password
        });
        Swal.fire('Thành công', res.data?.message || 'Đã đặt lại mật khẩu', 'success');
        setSelectedIds([]);
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Không thể reset mật khẩu', 'error');
      }
    }
  };

  const handleBulkSendNotification = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Gửi thông báo hàng loạt',
      html: `
        <div class="text-left space-y-3">
          <div>
            <label class="block text-xs font-bold text-slate-600 mb-1">Tiêu đề thông báo:</label>
            <input id="swal-noti-title" class="swal2-input !m-0 !w-full" placeholder="VD: Lịch họp hội đồng sư phạm tháng..." />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-600 mb-1">Nội dung thông báo:</label>
            <textarea id="swal-noti-content" class="swal2-textarea !m-0 !w-full" rows="3" placeholder="Nhập nội dung thông báo gửi tới các giáo viên..."></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Gửi ngay',
      confirmButtonColor: '#4F46E5',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        const title = document.getElementById('swal-noti-title').value;
        const content = document.getElementById('swal-noti-content').value;
        if (!title || !content) {
          Swal.showValidationMessage('Vui lòng điền đầy đủ tiêu đề và nội dung!');
          return false;
        }
        return { title, content };
      }
    });

    if (formValues) {
      try {
        const res = await api.post('/users/teachers/bulk-action', {
          action: 'send_notifications',
          userIds: selectedIds,
          title: formValues.title,
          content: formValues.content
        });
        Swal.fire('Thành công', res.data?.message || 'Đã gửi thông báo thành công', 'success');
        setSelectedIds([]);
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Không thể gửi thông báo', 'error');
      }
    }
  };

  // Filter logic
  const filteredTeachers = teachers.filter(t => {
    const nameMatch = t.profile?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    const codeMatch = t.profile?.teacherCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const phoneMatch = t.profile?.phone?.includes(searchTerm);
    const searchPass = !searchTerm || nameMatch || codeMatch || phoneMatch;

    const posPass = positionFilter ? (t.profile?.position === positionFilter) : true;
    const deptPass = departmentFilter ? (t.profile?.departmentId === departmentFilter) : true;
    const contractPass = contractFilter ? (t.profile?.teacherType === contractFilter) : true;
    const statusPass = statusFilter ? (t.status === statusFilter) : true;

    const isHomeroom = Boolean(t.profile?.homeroomClasses && t.profile.homeroomClasses.length > 0);
    const homeroomPass = homeroomFilter === 'has_homeroom' ? isHomeroom : (homeroomFilter === 'no_homeroom' ? !isHomeroom : true);

    return searchPass && posPass && deptPass && contractPass && statusPass && homeroomPass;
  });

  const getInitials = (name) => {
    if (!name) return 'GV';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = teachers.length;
    const active = teachers.filter(t => t.status === 'active').length;
    const permanentCount = teachers.filter(t => (t.profile?.teacherType || 'permanent') === 'permanent').length;
    const contractCount = total - permanentCount;
    const departmentsCount = departmentsList.length || 8;
    return { total, active, permanentCount, contractCount, departmentsCount };
  }, [teachers, departmentsList]);

  const isAllSelected = filteredTeachers.length > 0 && selectedIds.length === filteredTeachers.length;

  return (
    <div className="space-y-6 font-sans pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            Quản lý Cán bộ Giáo viên
            <span className="text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
              THPT TTLN
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Hồ sơ nhân sự 360, tổ chuyên môn và điều phối phân công giảng dạy
          </p>
        </div>
        
        <div className="flex items-center gap-2.5">
          {/* Nút Mở Ma trận Phân công giảng dạy toàn trường */}
          <button 
            onClick={() => {
              setAssignmentTeacherId(null);
              setIsAssignmentModalOpen(true);
            }} 
            className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-extrabold px-4 py-2.5 rounded-2xl border border-purple-200 shadow-xs transition-all cursor-pointer text-sm"
          >
            <BookOpen size={17} />
            <span>Phân công Giảng dạy</span>
          </button>

          {userRole === 'admin' && (
            <button 
              onClick={handleAdd} 
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-2.5 rounded-2xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 transition-all cursor-pointer text-sm"
            >
              <Plus size={18} />
              <span>Thêm Giáo viên</span>
            </button>
          )}
        </div>
      </div>

      {/* Bento Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Thẻ 1: Tổng số cán bộ GV */}
        <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            <Award size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tổng số cán bộ GV</p>
            <p className="text-xl font-extrabold text-slate-800">{stats.total} Giáo viên</p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
              {stats.permanentCount} Biên chế • {stats.contractCount} Hợp đồng
            </p>
          </div>
        </div>

        {/* Thẻ 2: Tài khoản Hoạt động */}
        <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <Sparkles size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tài khoản Hoạt động</p>
            <p className="text-xl font-extrabold text-slate-800">{stats.active} / {stats.total}</p>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
              Tỷ lệ: {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% sẵn sàng
            </p>
          </div>
        </div>

        {/* Thẻ 3: SỬA LỖI HIỂN THỊ: Tổ chuyên môn: X Tổ */}
        <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tổ chuyên môn</p>
            <p className="text-xl font-extrabold text-slate-800">{stats.departmentsCount} Tổ chuyên môn</p>
            <p className="text-[11px] text-purple-700 font-medium mt-0.5">
              Toán-Tin, KHTN, Ngữ văn...
            </p>
          </div>
        </div>

        {/* Thẻ 4: Nhật ký & An toàn hệ thống */}
        <div 
          onClick={() => setAuditTeacher({ id: 'all', fullName: 'Toàn trường' })}
          className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs flex items-center gap-4 cursor-pointer hover:border-indigo-200 transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 flex items-center justify-center font-bold shrink-0 transition-colors">
            <History size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Nhật ký hoạt động</p>
            <p className="text-sm font-extrabold text-slate-800 group-hover:text-indigo-600 transition-colors">
              Xem Audit Logs
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Lịch sử đăng nhập &amp; sửa điểm</p>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        {/* Toolbar & Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50/60">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full lg:w-96">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search size={17} className="text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Tìm theo mã GV, họ tên, số điện thoại..."
                className="pl-10 pr-4 py-2.5 w-full border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium text-slate-800 shadow-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-2 items-center">
              {/* Lọc Tổ chuyên môn */}
              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-2xl outline-none text-xs bg-white font-bold text-slate-700 shadow-xs"
              >
                <option value="">Tất cả Tổ chuyên môn</option>
                {departmentsList.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              {/* Lọc Chức vụ */}
              <select
                value={positionFilter}
                onChange={e => setPositionFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-2xl outline-none text-xs bg-white font-bold text-slate-700 shadow-xs"
              >
                <option value="">Tất cả Chức vụ</option>
                {TEACHER_POSITIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              {/* Lọc Loại hợp đồng */}
              <select
                value={contractFilter}
                onChange={e => setContractFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-2xl outline-none text-xs bg-white font-bold text-slate-700 shadow-xs"
              >
                <option value="">Tất cả Hợp đồng</option>
                <option value="permanent">Biên chế</option>
                <option value="contract_111">Hợp đồng 111</option>
                <option value="visiting">Thỉnh giảng</option>
              </select>

              {/* Lọc Kiêm nhiệm */}
              <select
                value={homeroomFilter}
                onChange={e => setHomeroomFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-2xl outline-none text-xs bg-white font-bold text-slate-700 shadow-xs"
              >
                <option value="">Tất cả Kiêm nhiệm</option>
                <option value="has_homeroom">Đang làm GVCN</option>
                <option value="no_homeroom">Không chủ nhiệm</option>
              </select>

              {/* Lọc Trạng thái tài khoản */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-2xl outline-none text-xs bg-white font-bold text-slate-700 shadow-xs"
              >
                <option value="">Tất cả Trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="blocked">Đang bị khóa</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {loading ? (
             <div className="p-16 text-center text-slate-500 font-medium flex flex-col items-center justify-center gap-3">
               <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
               <span>Đang tải danh bạ cán bộ giáo viên...</span>
             </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
              <thead className="bg-slate-50/90 text-slate-700 font-black text-xs uppercase tracking-wider border-b border-slate-100">
                <tr>
                  {/* Multi-select Checkbox Header */}
                  <th className="px-4 py-4 w-10 text-center">
                    <input 
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-5 py-4">Mã GV</th>
                  <th className="px-5 py-4 min-w-[220px]">Họ và tên</th>
                  <th className="px-5 py-4 min-w-[170px]">Tổ chuyên môn</th>
                  <th className="px-5 py-4 min-w-[160px]">Chức vụ &amp; Kiêm nhiệm</th>
                  <th className="px-5 py-4 min-w-[110px]">Trình độ</th>
                  <th className="px-5 py-4 min-w-[110px]">Hợp đồng</th>
                  <th className="px-5 py-4">Số điện thoại</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-right min-w-[170px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-16 text-slate-400 font-medium">
                        Không tìm thấy giáo viên nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                ) : filteredTeachers.map((teacher) => {
                  const isActive = teacher.status === 'active';
                  const isSelected = selectedIds.includes(teacher.id);
                  const contractBadge = getContractBadge(teacher.profile?.teacherType);

                  return (
                    <tr 
                      key={teacher.id} 
                      onClick={() => handleRowClick(teacher)}
                      className={`transition-colors cursor-pointer group ${
                        isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(e, teacher.id)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Mã GV */}
                      <td className="px-5 py-4 font-mono font-bold text-indigo-600 text-xs">
                        <span className="px-2 py-1 bg-indigo-50/80 rounded-lg border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                          {teacher.profile?.teacherCode}
                        </span>
                      </td>

                      {/* Họ và tên & Avatar */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                            {getInitials(teacher.profile?.fullName)}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors block">
                              {teacher.profile?.fullName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {teacher.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Tổ chuyên môn */}
                      <td className="px-5 py-4">
                        <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs">
                          <Building2 size={12} />
                          {teacher.profile?.department?.name || 'Tổ Toán - Tin học'}
                        </span>
                      </td>

                      {/* Chức vụ & Kiêm nhiệm */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${getPositionBadgeStyle(teacher.profile?.position)}`}>
                            {teacher.profile?.position || 'Giáo viên bộ môn'}
                          </span>
                          {teacher.profile?.homeroomClasses && teacher.profile.homeroomClasses.length > 0 && (
                            <span className="whitespace-nowrap inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-50 text-teal-700 border border-teal-200 shadow-2xs">
                              GVCN {teacher.profile.homeroomClasses.map(c => c.className).join(', ')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Trình độ / Học vị */}
                      <td className="px-5 py-4 font-semibold text-slate-700 text-xs">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200">
                          <GraduationCap size={13} className="text-slate-500" />
                          {teacher.profile?.academicDegree || 'Cử nhân'}
                        </span>
                      </td>

                      {/* Loại hợp đồng */}
                      <td className="px-5 py-4">
                        <span className={`whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${contractBadge.style}`}>
                          {contractBadge.label}
                        </span>
                      </td>

                      {/* SĐT */}
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-700">
                        {teacher.profile?.phone || '—'}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-5 py-4">
                        <span className={`whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {isActive ? 'Hoạt động' : 'Bị khóa'}
                        </span>
                      </td>

                      {/* Thao tác Icons */}
                      <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end items-center space-x-1.5">
                          {/* 1. Xem chi tiết (Mắt) */}
                          <button 
                            onClick={() => handleRowClick(teacher)} 
                            className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-105 transition-all cursor-pointer" 
                            title="Xem Hồ sơ Giáo viên 360"
                          >
                            <Eye size={15} />
                          </button>

                          {/* 2. Phân công giảng dạy (Sổ) */}
                          <button 
                            onClick={() => {
                              setAssignmentTeacherId(teacher.profile?.id || teacher.id);
                              setIsAssignmentModalOpen(true);
                            }} 
                            className="w-8 h-8 rounded-xl flex items-center justify-center bg-purple-50 text-purple-600 hover:bg-purple-100 hover:scale-105 transition-all cursor-pointer" 
                            title="Phân công giảng dạy cá nhân"
                          >
                            <BookOpen size={15} />
                          </button>

                          {/* 3. Reset Mật khẩu (Chìa khóa) */}
                          {isManagementUser && (
                            <button 
                              onClick={() => handleResetPassword(teacher)} 
                              className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 hover:bg-amber-100 hover:scale-105 transition-all cursor-pointer" 
                              title="Reset mật khẩu nhanh"
                            >
                              <KeyRound size={15} />
                            </button>
                          )}

                          {/* 4. Khóa/Mở tài khoản */}
                          {isManagementUser && (
                            <button 
                              onClick={() => handleToggleStatus(teacher)} 
                              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                isActive 
                                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 hover:scale-105' 
                                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:scale-105'
                              }`} 
                              title={isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                            >
                              {isActive ? <Lock size={15} /> : <Unlock size={15} />}
                            </button>
                          )}

                          {/* 5. Nhật ký hoạt động Audit Log */}
                          <button 
                            onClick={() => setAuditTeacher(teacher)} 
                            className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 hover:scale-105 transition-all cursor-pointer" 
                            title="Xem nhật ký thao tác"
                          >
                            <History size={15} />
                          </button>

                          {/* 6. Sửa & Xóa (Chỉ admin) */}
                          {userRole === 'admin' && (
                            <>
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

      {/* FLOATING BULK ACTION TOOLBAR */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-3.5 rounded-3xl shadow-2xl border border-slate-800 flex items-center gap-4 text-xs font-bold"
          >
            <div className="flex items-center gap-2 border-r border-slate-700 pr-4">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-black">
                {selectedIds.length}
              </span>
              <span>Đã chọn giáo viên</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkChangeDepartment}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Building2 size={14} className="text-purple-400" />
                <span>Chuyển tổ chuyên môn</span>
              </button>

              <button
                onClick={handleBulkSendNotification}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Send size={14} className="text-indigo-400" />
                <span>Gửi thông báo</span>
              </button>

              <button
                onClick={handleBulkResetPassword}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound size={14} className="text-amber-400" />
                <span>Reset MK</span>
              </button>

              <button
                onClick={() => handleBulkLock('lock_accounts')}
                className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Lock size={14} />
                <span>Khóa TK</span>
              </button>

              <button
                onClick={() => handleBulkLock('unlock_accounts')}
                className="px-3.5 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Unlock size={14} />
                <span>Mở khóa</span>
              </button>
            </div>

            <button
              onClick={() => setSelectedIds([])}
              className="text-slate-400 hover:text-white p-1 ml-2 transition-colors cursor-pointer"
              title="Hủy chọn"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit / Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <TeacherModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            teacher={selectedTeacher} 
            subjectsList={subjects} 
            departmentsList={departmentsList}
            onSubmit={handleModalSubmit} 
          />
        )}
      </AnimatePresence>

      {/* Teaching Assignment Modal */}
      {isAssignmentModalOpen && (
        <TeachingAssignmentModal
          isOpen={isAssignmentModalOpen}
          onClose={() => setIsAssignmentModalOpen(false)}
          initialTeacherId={assignmentTeacherId}
          onSaved={() => {
            fetchTeachers();
          }}
        />
      )}

      {/* Audit Log Drawer */}
      <AuditLogDrawer
        isOpen={Boolean(auditTeacher)}
        onClose={() => setAuditTeacher(null)}
        teacher={auditTeacher}
      />
    </div>
  );
};

export default Teachers;
