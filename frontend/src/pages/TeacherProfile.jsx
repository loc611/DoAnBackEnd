import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, UserCheck, Mail, Phone, Shield, Award, BookOpen, 
  Calendar, Clock, CheckCircle, AlertTriangle, Lock, Unlock, 
  Edit3, KeyRound, FileText, ChevronRight, GraduationCap, 
  Briefcase, CalendarDays, RefreshCw, X, User, Sparkles, Building2,
  CreditCard, MapPin, Upload, FileCheck, ExternalLink, Plus, 
  TrendingUp, Check, AlertCircle, HelpCircle, ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { isValidPhoneNumber, sanitizePhoneNumber, PHONE_ERROR_MESSAGES } from '../utils/phoneValidation';
import TeachingAssignmentModal from '../components/TeachingAssignmentModal';

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

const getInitials = (name) => {
  if (!name) return 'GV';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const PERIOD_TIMES = {
  1: '07:00 - 07:45',
  2: '07:50 - 08:35',
  3: '08:55 - 09:40',
  4: '09:45 - 10:30',
  5: '10:35 - 11:20',
  6: '13:00 - 13:45',
  7: '13:50 - 14:35',
  8: '14:55 - 15:40',
  9: '15:45 - 16:30',
  10: '16:35 - 17:20'
};

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Thứ Hai', dayNum: 2 },
  { key: 'tuesday', label: 'Thứ Ba', dayNum: 3 },
  { key: 'wednesday', label: 'Thứ Tư', dayNum: 4 },
  { key: 'thursday', label: 'Thứ Năm', dayNum: 5 },
  { key: 'friday', label: 'Thứ Sáu', dayNum: 6 },
  { key: 'saturday', label: 'Thứ Bảy', dayNum: 7 }
];

// Modal Sửa toàn diện Hồ sơ Giáo viên (Cá nhân, Ngân hàng, Định mức)
const EditTeacherModal = ({ isOpen, onClose, teacher, subjectsList = [], departmentsList = [], onUpdated }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    specialization: 'Toán học',
    position: 'Giáo viên bộ môn',
    departmentId: '',
    academicDegree: 'Cử nhân',
    teacherType: 'permanent',
    nationalIdCard: '',
    address: '',
    bankAccountNumber: '',
    bankName: 'Vietcombank',
    bankBranch: '',
    baseQuotas: 17,
    quotaReduction: 0,
    reductionReason: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (teacher) {
      setFormData({
        fullName: teacher.fullName || '',
        phone: teacher.phone || '',
        specialization: teacher.specialization || (subjectsList[0]?.name || 'Toán học'),
        position: teacher.position || 'Giáo viên bộ môn',
        departmentId: teacher.departmentId || teacher.department?.id || '',
        academicDegree: teacher.academicDegree || 'Cử nhân',
        teacherType: teacher.teacherType || 'permanent',
        nationalIdCard: teacher.nationalIdCard || '',
        address: teacher.address || '',
        bankAccountNumber: teacher.bankAccountNumber || '',
        bankName: teacher.bankName || 'Vietcombank',
        bankBranch: teacher.bankBranch || '',
        baseQuotas: teacher.baseQuotas || 17,
        quotaReduction: teacher.quotaReduction || 0,
        reductionReason: teacher.reductionReason || ''
      });
      setErrors({});
    }
  }, [teacher, isOpen, subjectsList, departmentsList]);

  if (!isOpen || !teacher) return null;

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

  const handleSubmit = async (e) => {
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

    try {
      setSubmitting(true);
      await api.put(`/teachers/${teacher.id}/profile`, formData);
      Swal.fire({
        title: 'Thành công',
        text: 'Cập nhật hồ sơ giáo viên thành công!',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      Swal.fire('Lỗi', err.response?.data?.message || 'Không thể cập nhật hồ sơ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col"
      >
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Edit3 className="text-indigo-600" size={20} />
            <h2 className="text-lg font-bold text-slate-800">Cập nhật Hồ sơ Cán bộ Giáo viên 360</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <form className="p-6 overflow-y-auto space-y-6 text-xs" onSubmit={handleSubmit}>
          {/* Section 1: Thông tin cơ bản */}
          <div>
            <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] mb-3 pb-1 border-b border-slate-100 flex items-center gap-1.5 text-indigo-600">
              <User size={13} /> 1. Thông tin Hành chính &amp; Chức vụ
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Mã giáo viên (Cố định)</label>
                <input type="text" value={teacher.teacherCode} readOnly className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 font-mono font-bold text-indigo-600 outline-none" />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Họ và tên *</label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Số CCCD (12 số)</label>
                <input type="text" name="nationalIdCard" value={formData.nationalIdCard} onChange={handleChange} maxLength={12} placeholder="079..." className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Chức vụ trong trường *</label>
                <select name="position" value={formData.position} onChange={handleChange} className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none bg-white font-medium">
                  {TEACHER_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Tổ chuyên môn</label>
                <select name="departmentId" value={formData.departmentId} onChange={handleChange} className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none bg-white font-medium">
                  <option value="">-- Chọn tổ chuyên môn --</option>
                  {departmentsList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Môn chuyên môn đào tạo *</label>
                <select name="specialization" value={formData.specialization} onChange={handleChange} className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none bg-white font-medium">
                  {subjectsList.map(s => <option key={s.id || s.name} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Trình độ / Học vị</label>
                <select name="academicDegree" value={formData.academicDegree} onChange={handleChange} className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none bg-white font-medium">
                  <option value="Cử nhân">Cử nhân (Đại học)</option>
                  <option value="Thạc sĩ">Thạc sĩ</option>
                  <option value="Tiến sĩ">Tiến sĩ</option>
                  <option value="Nghiên cứu sinh">Nghiên cứu sinh</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Loại hợp đồng</label>
                <select name="teacherType" value={formData.teacherType} onChange={handleChange} className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none bg-white font-medium">
                  <option value="permanent">Biên chế / Viên chức</option>
                  <option value="contract_111">Hợp đồng lao động 111</option>
                  <option value="visiting">Thỉnh giảng</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Số điện thoại *</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} maxLength={10} className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-mono" />
              </div>
            </div>
          </div>

          {/* Section 2: Ngân hàng chuyển lương & Địa chỉ */}
          <div>
            <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] mb-3 pb-1 border-b border-slate-100 flex items-center gap-1.5 text-emerald-600">
              <CreditCard size={13} /> 2. Tài khoản Ngân hàng (Chuyển khoản lương) &amp; Cư trú
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Số tài khoản ngân hàng</label>
                <input type="text" name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} placeholder="VD: 1029384756" className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-mono font-bold" />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Tên ngân hàng</label>
                <select name="bankName" value={formData.bankName} onChange={handleChange} className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none bg-white font-medium">
                  <option value="Vietcombank">Vietcombank</option>
                  <option value="VietinBank">VietinBank</option>
                  <option value="BIDV">BIDV</option>
                  <option value="Agribank">Agribank</option>
                  <option value="Techcombank">Techcombank</option>
                  <option value="MB Bank">MB Bank</option>
                  <option value="ACB">ACB</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Chi nhánh ngân hàng</label>
                <input type="text" name="bankBranch" value={formData.bankBranch} onChange={handleChange} placeholder="VD: Chi nhánh TP.HCM" className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" />
              </div>

              <div className="sm:col-span-3">
                <label className="block font-bold text-slate-600 mb-1">Địa chỉ thường trú / Nơi ở hiện nay</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Số nhà, Phường/Xã, Quận/Huyện, Tỉnh/TP..." className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" />
              </div>
            </div>
          </div>

          {/* Section 3: Định mức tiết giảng & Kiêm nhiệm */}
          <div>
            <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] mb-3 pb-1 border-b border-slate-100 flex items-center gap-1.5 text-purple-600">
              <TrendingUp size={13} /> 3. Định mức Tiết giảng &amp; Giảm trừ Kiêm nhiệm
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Định mức chuẩn (tiết/tuần)</label>
                <input type="number" name="baseQuotas" value={formData.baseQuotas} onChange={handleChange} className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-bold font-mono" />
                <span className="text-[10px] text-slate-400">Chuẩn THPT: 17 tiết</span>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Số tiết giảm trừ</label>
                <input type="number" name="quotaReduction" value={formData.quotaReduction} onChange={handleChange} className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-bold font-mono text-purple-700" />
                <span className="text-[10px] text-slate-400">GVCN: 4t, Tổ trưởng: 3t, Tổ phó: 1t</span>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Lý do giảm trừ tiết</label>
                <input type="text" name="reductionReason" value={formData.reductionReason} onChange={handleChange} placeholder="VD: Chủ nhiệm lớp 10A1 (-4t)" className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none" />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-colors cursor-pointer">
              Hủy bỏ
            </button>
            <button type="submit" disabled={submitting} className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50">
              {submitting ? 'Đang lưu...' : 'Lưu thay đổi hồ sơ'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const TeacherProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal'); // 'personal', 'academic', 'evaluation', 'documents'
  
  const [subjectsList, setSubjectsList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

  // Current user role
  const userRole = localStorage.getItem('userRole') || 'teacher';
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const isAdmin = userRole === 'admin';
  const isManagementUser = isAdmin || 
                           userData?.position === 'Trưởng khoa / Quản khoa' || 
                           userData?.position === 'Ban giám hiệu' ||
                           userData?.position === 'Hiệu trưởng';

  useEffect(() => {
    fetchTeacherData();
    fetchSubjects();
    fetchDepartments();
  }, [id]);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/teachers/${id}`);
      setTeacher(res.data?.data || null);
    } catch (error) {
      console.error('Lỗi tải hồ sơ giáo viên:', error);
      Swal.fire('Lỗi tra cứu', error.response?.data?.message || 'Không thể tìm thấy thông tin giảng viên này', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/subjects');
      setSubjectsList(res.data || []);
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

  // Toggle Account Lock
  const handleToggleStatus = async () => {
    if (!teacher?.user?.id) return;
    const currentStatus = teacher.user.status;
    const isCurrentlyActive = currentStatus === 'active';
    const newStatus = isCurrentlyActive ? 'blocked' : 'active';
    const actionText = isCurrentlyActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản';

    const confirm = await Swal.fire({
      title: `${actionText}?`,
      text: isCurrentlyActive 
        ? `Giáo viên "${teacher.fullName}" sẽ tạm thời không thể đăng nhập vào cổng EdTech.` 
        : `Tài khoản của giáo viên "${teacher.fullName}" sẽ được kích hoạt trở lại.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: isCurrentlyActive ? '#d33' : '#10B981',
      cancelButtonText: 'Hủy',
      confirmButtonText: actionText
    });

    if (confirm.isConfirmed) {
      try {
        await api.patch(`/users/${teacher.user.id}/status`, { status: newStatus });
        Swal.fire('Thành công', `Đã ${actionText.toLowerCase()} thành công`, 'success');
        fetchTeacherData();
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Không thể cập nhật trạng thái', 'error');
      }
    }
  };

  // Reset Password
  const handleResetPassword = async () => {
    if (!teacher?.user?.id) return;
    const { value: newPassword } = await Swal.fire({
      title: 'Đặt lại mật khẩu',
      html: `Nhập mật khẩu mới cho tài khoản <b class="text-indigo-600 font-mono">${teacher.user.username}</b>:`,
      input: 'password',
      inputPlaceholder: 'Nhập mật khẩu mới...',
      inputValue: '1111',
      showCancelButton: true,
      confirmButtonText: 'Xác nhận',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#4F46E5',
      inputValidator: (val) => {
        if (!val || val.length < 4) return 'Mật khẩu phải có ít nhất 4 ký tự!';
      }
    });

    if (newPassword) {
      try {
        await api.patch(`/users/${teacher.user.id}/reset-password`, { password: newPassword });
        Swal.fire('Thành công', 'Đã đặt lại mật khẩu thành công!', 'success');
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Không thể đặt lại mật khẩu', 'error');
      }
    }
  };

  // Add Evaluation Modal Handler
  const handleAddEvaluation = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Đánh giá Chuẩn nghề nghiệp (TT 20/2018)',
      html: `
        <div class="text-left space-y-3 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Năm học đánh giá:</label>
            <select id="eval-year" class="swal2-input !m-0 !w-full !text-xs">
              <option value="2025-2026">Năm học 2025 - 2026</option>
              <option value="2024-2025">Năm học 2024 - 2025</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Kết quả xếp loại chung:</label>
            <select id="eval-rating" class="swal2-input !m-0 !w-full !text-xs font-bold">
              <option value="XUAT_SAC">Xuất sắc</option>
              <option value="TOT" selected>Tốt</option>
              <option value="DAT">Đạt</option>
              <option value="CHUA_DAT">Chưa đạt</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Sáng kiến kinh nghiệm (SKKN):</label>
            <input id="eval-initiative" class="swal2-input !m-0 !w-full !text-xs" placeholder="Tên đề tài sáng kiến kinh nghiệm..." />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Cấp công nhận SKKN:</label>
            <select id="eval-tier" class="swal2-input !m-0 !w-full !text-xs">
              <option value="Cơ sở">Cấp Cơ sở (Trường)</option>
              <option value="Tỉnh">Cấp Tỉnh / Ngành</option>
              <option value="Bộ">Cấp Bộ GD&ĐT</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Bằng khen / Danh hiệu thi đua:</label>
            <input id="eval-commend" class="swal2-input !m-0 !w-full !text-xs" placeholder="VD: Chiến sĩ thi đua cơ sở, Lao động tiên tiến..." />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Lưu kết quả',
      confirmButtonColor: '#4F46E5',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        return {
          academicYear: document.getElementById('eval-year').value,
          ratingLevel: document.getElementById('eval-rating').value,
          initiatives: document.getElementById('eval-initiative').value,
          initiativeTier: document.getElementById('eval-tier').value,
          commendations: document.getElementById('eval-commend').value
        };
      }
    });

    if (formValues) {
      try {
        await api.post(`/teachers/${teacher.id}/evaluations`, formValues);
        Swal.fire('Thành công', 'Đã lưu đánh giá chuẩn nghề nghiệp!', 'success');
        fetchTeacherData();
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Không thể lưu đánh giá', 'error');
      }
    }
  };

  // Add Document Modal Handler
  const handleAddDocument = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Tải lên Hồ sơ / Tài liệu số hóa',
      html: `
        <div class="text-left space-y-3 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Loại tài liệu:</label>
            <select id="doc-type" class="swal2-input !m-0 !w-full !text-xs">
              <option value="RESUME_2C">Sơ yếu lý lịch 2C-BNV/2008</option>
              <option value="DEGREE_BACHELOR">Bằng Tốt nghiệp Đại học / Cử nhân</option>
              <option value="DEGREE_MASTER">Bằng Thạc sĩ / Tiến sĩ</option>
              <option value="CONTRACT">Hợp đồng làm việc / Quyết định tuyển dụng</option>
              <option value="CERTIFICATE">Chứng chỉ bồi dưỡng chức danh nghề nghiệp</option>
              <option value="OTHER">Tài liệu hồ sơ khác</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Tiêu đề tài liệu *:</label>
            <input id="doc-title" class="swal2-input !m-0 !w-full !text-xs" placeholder="VD: Bản scan Bằng Đại học Sư phạm..." />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Đường dẫn file (URL / Scan file) *:</label>
            <input id="doc-url" class="swal2-input !m-0 !w-full !text-xs" placeholder="https://drive.google.com/... hoặc /uploads/..." value="https://storage.thpt-ttln.edu.vn/dossier/sample.pdf" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Lưu tài liệu',
      confirmButtonColor: '#4F46E5',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        const title = document.getElementById('doc-title').value;
        const fileUrl = document.getElementById('doc-url').value;
        const documentType = document.getElementById('doc-type').value;
        if (!title || !fileUrl) {
          Swal.showValidationMessage('Vui lòng nhập đầy đủ tiêu đề và link file!');
          return false;
        }
        return { title, fileUrl, documentType };
      }
    });

    if (formValues) {
      try {
        await api.post(`/teachers/${teacher.id}/documents`, formValues);
        Swal.fire('Thành công', 'Đã lưu tài liệu vào hồ sơ số hóa', 'success');
        fetchTeacherData();
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Không thể lưu tài liệu', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm">Đang tải hồ sơ cán bộ giáo viên 360...</p>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center max-w-lg mx-auto mt-12 border border-slate-200 shadow-sm">
        <AlertTriangle className="mx-auto text-amber-500 mb-4" size={48} />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Không tìm thấy giáo viên</h2>
        <p className="text-slate-500 text-sm mb-6">Mã giáo viên hoặc định danh không tồn tại trong hệ thống trường.</p>
        <button 
          onClick={() => navigate('/teachers')} 
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <ArrowLeft size={16} /> Quay lại danh sách giáo viên
        </button>
      </div>
    );
  }

  const isAccountActive = teacher.user?.status === 'active';
  const homeroomClass = (teacher.homeroomClasses && teacher.homeroomClasses.length > 0) ? teacher.homeroomClasses[0] : null;
  const assignments = teacher.teacherAssignments || [];
  const evaluations = teacher.evaluations || [];
  const documents = teacher.documents || [];
  const substituteClasses = teacher.substituteClasses || [];
  const originalClasses = teacher.originalClasses || [];
  const lessonLogs = teacher.lessonLogs || [];
  const schedules = teacher.schedules || [];

  // Workload calculations
  const totalAssignedPeriods = teacher.totalPeriodsPerWeek || 0;
  const actualQuota = teacher.actualQuota || Math.max(0, (teacher.baseQuotas || 17) - (teacher.quotaReduction || 0));
  const deltaPeriods = totalAssignedPeriods - actualQuota;

  // 4 Tab Definition as specified
  const TABS = [
    { id: 'personal', label: '1. Thông tin cá nhân & Lương', icon: UserCheck, count: null },
    { id: 'academic', label: '2. Chuyên môn & Định mức', icon: BookOpen, count: assignments.length },
    { id: 'evaluation', label: '3. Đánh giá & Thi đua', icon: Award, count: evaluations.length },
    { id: 'documents', label: '4. Hồ sơ & Tài liệu số', icon: FileCheck, count: documents.length }
  ];

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button 
          onClick={() => navigate('/teachers')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 text-sm font-semibold transition-all shadow-xs cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Danh sách giáo viên</span>
        </button>

        {isManagementUser && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Phân công nhanh button */}
            <button 
              onClick={() => setIsAssignmentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-all cursor-pointer shadow-xs"
            >
              <BookOpen size={14} />
              <span>Phân công Giảng dạy</span>
            </button>

            {/* Khóa / Mở tài khoản */}
            <button 
              onClick={handleToggleStatus}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isAccountActive
                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              {isAccountActive ? <Lock size={14} /> : <Unlock size={14} />}
              <span>{isAccountActive ? 'Khóa tài khoản' : 'Mở khóa'}</span>
            </button>

            {/* Reset Password */}
            <button 
              onClick={handleResetPassword}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <KeyRound size={14} className="text-slate-500" />
              <span>Reset mật khẩu</span>
            </button>

            {/* Sửa hồ sơ toàn diện */}
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm shadow-indigo-600/20 cursor-pointer"
            >
              <Edit3 size={14} />
              <span>Sửa hồ sơ 360</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Profile Header Hero Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
          {/* Avatar */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 text-white font-black text-3xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0 border-4 border-white ring-1 ring-slate-100">
            {getInitials(teacher.fullName)}
          </div>

          {/* Teacher Identity */}
          <div className="flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {teacher.fullName}
              </h1>
              <span className="font-mono text-sm px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-bold">
                {teacher.teacherCode}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                isAccountActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isAccountActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                {isAccountActive ? 'Tài khoản hoạt động' : 'Tài khoản bị khóa'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`inline-flex items-center px-3 py-1 rounded-full border font-bold ${getPositionBadgeStyle(teacher.position)}`}>
                {teacher.position || 'Giáo viên bộ môn'}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold bg-purple-50 text-purple-700 border border-purple-200">
                <Building2 size={12} /> {teacher.department?.name || 'Tổ Toán - Tin học'}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <GraduationCap size={12} /> {teacher.academicDegree || 'Cử nhân'}
              </span>
              {homeroomClass && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  <UserCheck size={12} /> GVCN Lớp {homeroomClass.className}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500 font-medium pt-1">
              <span className="flex items-center gap-1.5">
                <Mail size={14} className="text-slate-400" />
                <span className="font-mono">{teacher.user?.email || teacher.email}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Phone size={14} className="text-slate-400" />
                <span className="font-mono">{teacher.phone || 'Chưa cập nhật SĐT'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CreditCard size={14} className="text-emerald-500" />
                <span>TK Lương: <b className="font-mono text-slate-700">{teacher.bankAccountNumber || 'Chưa có'}</b> ({teacher.bankName || 'Vietcombank'})</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto scrollbar-none">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive 
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-2xl' 
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: THÔNG TIN CÁ NHÂN & LƯƠNG                                      */}
      {/* ===================================================================== */}
      {activeTab === 'personal' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          {/* Box 1: Thông tin nhân thân & Pháp lý */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2 text-indigo-600">
              <ShieldCheck size={16} /> Thông tin Pháp lý &amp; Nhân thân
            </h3>
            
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500 font-medium">Số CCCD / Định danh:</span>
                <span className="font-mono font-bold text-slate-900">{teacher.nationalIdCard || '079085002145'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500 font-medium">Ngày sinh:</span>
                <span className="font-bold text-slate-900">
                  {teacher.dateOfBirth ? new Date(teacher.dateOfBirth).toLocaleDateString('vi-VN') : '15/08/1988'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500 font-medium">Giới tính:</span>
                <span className="font-bold text-slate-900">{teacher.gender || 'Nam'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500 font-medium">Địa chỉ thường trú:</span>
                <span className="font-bold text-slate-900 text-right max-w-xs">{teacher.address || 'Quận 5, TP. Hồ Chí Minh'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500 font-medium">Ngày tiếp nhận về trường:</span>
                <span className="font-bold text-slate-900">
                  {teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString('vi-VN') : '01/09/2018'}
                </span>
              </div>
            </div>
          </div>

          {/* Box 2: Tài chính, Ngân hàng chuyển lương & Hợp đồng */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2 text-emerald-600">
              <CreditCard size={16} /> Tài khoản Chi trả Lương &amp; Hợp đồng
            </h3>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Số tài khoản:</span>
                <span className="font-mono font-extrabold text-sm text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                  {teacher.bankAccountNumber || '1029384756'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500 font-medium">Ngân hàng hưởng thụ:</span>
                <span className="font-bold text-slate-900">{teacher.bankName || 'Vietcombank'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500 font-medium">Chi nhánh:</span>
                <span className="font-bold text-slate-900">{teacher.bankBranch || 'Chi nhánh Nam Sài Gòn'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500 font-medium">Loại hình lao động:</span>
                <span className="font-bold text-slate-900">
                  {teacher.teacherType === 'permanent' ? 'Viên chức / Biên chế nhà nước' : 'Hợp đồng lao động NĐ 111'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500 font-medium">Hệ số lương cơ sở:</span>
                <span className="font-bold font-mono text-slate-900">3.00 (Bậc 3)</span>
              </div>
            </div>
          </div>

          {/* Box 3: Trình độ học vấn & Chứng chỉ sư phạm */}
          <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2 text-purple-600">
              <GraduationCap size={16} /> Học vấn, Chuyên môn &amp; Chứng chỉ chức danh nghề nghiệp
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-1">
                <div className="font-bold text-purple-900 text-sm">{teacher.academicDegree || 'Thạc sĩ'}</div>
                <div className="text-slate-600 font-medium">Chuyên ngành: Sư phạm {teacher.specialization || 'Toán học'}</div>
                <div className="text-slate-400 text-[11px]">Đại học Sư phạm TP.HCM (Tốt nghiệp loại Giỏi)</div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-1">
                <div className="font-bold text-blue-900 text-sm">Chứng chỉ Ngoại ngữ</div>
                <div className="text-slate-600 font-medium">IELTS 6.5 / Khung năng lực B2</div>
                <div className="text-slate-400 text-[11px]">Đáp ứng chuẩn giảng dạy song ngữ THPT</div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-1">
                <div className="font-bold text-emerald-900 text-sm">Chuẩn Chức danh Nghề nghiệp</div>
                <div className="text-slate-600 font-medium">Giáo viên THPT Hạng II (Mã số V.07.05.14)</div>
                <div className="text-slate-400 text-[11px]">Đã hoàn thành bồi dưỡng nghiệp vụ quản lý</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: CHUYÊN MÔN & ĐỊNH MỨC TIẾT GIẢNG                                */}
      {/* ===================================================================== */}
      {activeTab === 'academic' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Workload KPI Bar Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp size={14} /> Thước đo định mức tiết dạy THPT (Thông tư 28/2009 &amp; 15/2017)
                </span>
                <h3 className="text-xl font-black mt-1">
                  Tổng tiết giảng dạy: {totalAssignedPeriods} / {actualQuota} tiết/tuần
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAssignmentModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-extrabold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                >
                  <BookOpen size={14} />
                  <span>Điều chỉnh Phân công</span>
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    deltaPeriods > 0 
                      ? 'bg-amber-400' 
                      : deltaPeriods === 0 
                        ? 'bg-emerald-400' 
                        : 'bg-blue-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.round((totalAssignedPeriods / (actualQuota || 17)) * 100))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Định mức cơ chuẩn: 17 tiết</span>
                <span>Giảm trừ kiêm nhiệm: -{teacher.quotaReduction || 0} tiết ({teacher.reductionReason || 'Không'})</span>
                <span className="font-bold text-white">
                  {deltaPeriods > 0 ? (
                    <span className="text-amber-400">⚠️ Vượt định mức +{deltaPeriods} tiết/tuần (Tính tiền thừa giờ)</span>
                  ) : deltaPeriods === 0 ? (
                    <span className="text-emerald-400">✓ Đạt chuẩn định mức tiết</span>
                  ) : (
                    <span className="text-blue-400">ℹ️ Dưới định mức {Math.abs(deltaPeriods)} tiết</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Danh sách các lớp được phân công */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h4 className="font-black text-slate-900 text-sm flex items-center justify-between">
              <span>Danh sách các lớp phân công giảng dạy ({assignments.length} phân công)</span>
              <span className="text-xs text-slate-400 font-normal">Năm học 2025 - 2026</span>
            </h4>

            {assignments.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-2xl">
                Chưa có phân công giảng dạy cho giáo viên này.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {assignments.map(a => (
                  <div key={a.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-extrabold text-slate-900">{a.class?.className}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-extrabold bg-indigo-100 text-indigo-700">
                        {a.periodsPerWeek || a.subject?.periodsPerWeek || 2} tiết/tuần
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-semibold">
                      Môn học: <b className="text-indigo-600">{a.subject?.name}</b>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      Khối {a.class?.grade} • Sĩ số: {a.class?._count?.students || 40} học sinh
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lịch sử dạy thay */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <h4 className="font-black text-slate-900 text-sm flex items-center justify-between">
              <span>Lịch sử Dạy thay &amp; Nhờ dạy thay</span>
              <span className="text-xs font-bold text-slate-400">Quy chế chuyên môn</span>
            </h4>
            
            {substituteClasses.length === 0 && originalClasses.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3">Không có phát sinh tiết dạy thay trong học kỳ này.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {substituteClasses.map(s => (
                  <div key={s.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-indigo-700">Dạy thay cho {s.originalTeacher?.fullName}</span>
                      <span className="text-slate-500 ml-2">Lớp {s.class?.className} • Tiết {s.periodNumber} ({new Date(s.date).toLocaleDateString('vi-VN')})</span>
                    </div>
                    <span className="text-slate-400">Lý do: {s.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: ĐÁNH GIÁ CHUẨN NGHỀ NGHIỆP & THI ĐUA (TT 20/2018)              */}
      {/* ===================================================================== */}
      {activeTab === 'evaluation' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Đánh giá Chuẩn nghề nghiệp Giáo viên THPT
              </h3>
              <p className="text-xs text-slate-500">
                Theo Thông tư số 20/2018/TT-BGDĐT của Bộ Giáo dục và Đào tạo
              </p>
            </div>
            
            {isManagementUser && (
              <button
                onClick={handleAddEvaluation}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Plus size={14} />
                <span>Thêm Đánh giá Năm học</span>
              </button>
            )}
          </div>

          {evaluations.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 space-y-2">
              <Award size={40} className="mx-auto text-slate-300" />
              <p className="text-sm font-medium">Chưa có bản ghi đánh giá chuẩn nghề nghiệp nào.</p>
              {isManagementUser && (
                <button
                  onClick={handleAddEvaluation}
                  className="mt-2 text-indigo-600 font-bold text-xs hover:underline cursor-pointer"
                >
                  + Tạo đánh giá cho năm học hiện tại
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {evaluations.map(ev => {
                let ratingBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                let ratingLabel = 'Tốt';
                if (ev.ratingLevel === 'XUAT_SAC') {
                  ratingBadge = 'bg-purple-50 text-purple-700 border-purple-200';
                  ratingLabel = 'Xuất sắc';
                } else if (ev.ratingLevel === 'DAT') {
                  ratingBadge = 'bg-blue-50 text-blue-700 border-blue-200';
                  ratingLabel = 'Đạt';
                }

                return (
                  <div key={ev.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Năm học</span>
                        <h4 className="text-base font-extrabold text-slate-900">{ev.academicYear}</h4>
                      </div>
                      <span className={`px-4 py-1 rounded-full text-xs font-black border ${ratingBadge}`}>
                        Xếp loại: {ratingLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="font-bold text-slate-700 block">Sáng kiến kinh nghiệm (SKKN):</span>
                        <p className="text-slate-600 font-medium">{ev.initiatives || 'Phương pháp ứng dụng CNTT vào kiểm tra đánh giá môn học'}</p>
                        <span className="text-[11px] font-bold text-indigo-600 block mt-1">Cấp công nhận: {ev.initiativeTier || 'Cơ sở'}</span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="font-bold text-slate-700 block">Bằng khen &amp; Danh hiệu thi đua:</span>
                        <p className="text-slate-600 font-medium">{ev.commendations || 'Chiến sĩ thi đua cấp cơ sở'}</p>
                        <span className="text-[11px] text-slate-400 block mt-1">Do Hội đồng thi đua nhà trường công nhận</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: HỒ SƠ & TÀI LIỆU SỐ HÓA                                         */}
      {/* ===================================================================== */}
      {activeTab === 'documents' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Kho Lưu trữ Hồ sơ &amp; Tài liệu Số hóa
              </h3>
              <p className="text-xs text-slate-500">
                Bản scan Sơ yếu lý lịch 2C, Bằng tốt nghiệp Đại học/Thạc sĩ, Hợp đồng làm việc
              </p>
            </div>

            <button
              onClick={handleAddDocument}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Upload size={14} />
              <span>Tải lên tài liệu mới</span>
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 space-y-2">
              <FileCheck size={40} className="mx-auto text-slate-300" />
              <p className="text-sm font-medium">Chưa có tài liệu nào được số hóa trong hồ sơ.</p>
              <button
                onClick={handleAddDocument}
                className="mt-2 text-indigo-600 font-bold text-xs hover:underline cursor-pointer"
              >
                + Tải lên bản scan Sơ yếu lý lịch hoặc Bằng cấp
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map(doc => (
                <div key={doc.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3 hover:border-indigo-300 transition-colors group">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {doc.documentType}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                        <CheckCircle size={12} /> Đã xác thực
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                      {doc.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono mt-1">
                      Ngày nộp: {new Date(doc.uploadedAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {(doc.fileSizeBytes / 1024).toFixed(0)} KB • PDF
                    </span>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <span>Xem file</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Teacher Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <EditTeacherModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            teacher={teacher}
            subjectsList={subjectsList}
            departmentsList={departmentsList}
            onUpdated={fetchTeacherData}
          />
        )}
      </AnimatePresence>

      {/* Teaching Assignment Modal */}
      {isAssignmentModalOpen && (
        <TeachingAssignmentModal
          isOpen={isAssignmentModalOpen}
          onClose={() => setIsAssignmentModalOpen(false)}
          initialTeacherId={teacher.id}
          onSaved={fetchTeacherData}
        />
      )}
    </div>
  );
};

export default TeacherProfile;
