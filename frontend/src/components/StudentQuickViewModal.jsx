import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, User, Phone, Mail, MapPin, Calendar, ExternalLink, 
  Copy, Check, Shield, Award, HeartPulse, GraduationCap, 
  Users, Sparkles, CheckCircle2, Clock, AlertCircle, Eye
} from 'lucide-react';
import api from '../services/api';

const StudentQuickViewModal = ({ isOpen, onClose, studentId, initialData = null }) => {
  const [student, setStudent] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    if (isOpen && studentId) {
      if (initialData) {
        setStudent(initialData);
      }
      fetchStudentDetail(studentId);
    } else {
      setStudent(null);
      setCopiedKey(null);
    }
  }, [isOpen, studentId]);

  const fetchStudentDetail = async (id) => {
    try {
      setLoading(true);
      const res = await api.get(`/students/${id}`);
      if (res.data) {
        setStudent(res.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải thông tin học sinh:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenFullProfile = () => {
    if (!student?.id) return;
    window.open(`/students/${student.id}`, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  // Tính toán tóm tắt điểm danh nếu có dữ liệu
  const attendances = student?.attendances || [];
  const totalSessions = attendances.length;
  const presentSessions = attendances.filter(a => a.status === 'present' || a.status === 'PRESENT').length;
  const excusedSessions = attendances.filter(a => a.status === 'excused' || a.status === 'EXCUSED').length;
  const unexcusedSessions = attendances.filter(a => a.status === 'absent' || a.status === 'ABSENT' || a.status === 'unexcused').length;
  const attendanceRate = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 100;

  // Lấy tên chữ cái đầu cho avatar
  const getInitials = (name) => {
    if (!name) return 'HS';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const isFemale = student?.gender === 'Nữ';
  const isActive = (student?.status || student?.user?.status) !== 'inactive' && (student?.status || student?.user?.status) !== 'blocked';

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200"
      >
        {/* Header Gradient */}
        <div className="relative p-6 bg-gradient-to-r from-indigo-800 via-indigo-700 to-blue-700 text-white flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg border-2 border-white/30 backdrop-blur-md ${
                isFemale ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white' : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
              }`}>
                {getInitials(student?.fullName)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {student?.fullName || 'Đang tải thông tin...'}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isActive ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40' : 'bg-rose-500/30 text-rose-200 border border-rose-400/40'
                  }`}>
                    {isActive ? 'Đang học' : 'Tạm khóa'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-indigo-100 font-medium">
                  <span className="px-2 py-0.5 bg-white/15 rounded-lg border border-white/20 font-bold tracking-wider">
                    Mã: {student?.studentCode || '—'}
                  </span>
                  {student?.class?.className && (
                    <span className="px-2 py-0.5 bg-white/15 rounded-lg border border-white/20">
                      Lớp {student.class.className} {student.class.grade ? `(Khối ${student.class.grade})` : ''}
                    </span>
                  )}
                  {student?.gender && (
                    <span className="px-2 py-0.5 bg-white/15 rounded-lg border border-white/20">
                      {student.gender}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-slate-50/50">
          {loading && !student ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-500">Đang đồng bộ hồ sơ học sinh...</p>
            </div>
          ) : (
            <>
              {/* Card 1: Thông tin cá nhân & Nhân khẩu học */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                  <User size={18} className="text-indigo-600" />
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Thông tin cá nhân & Lý lịch</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="text-slate-500">Ngày sinh:</span>
                    <span className="font-semibold text-slate-800">
                      {student?.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('vi-VN') : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="text-slate-500">Giới tính:</span>
                    <span className="font-semibold text-slate-800">{student?.gender || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="text-slate-500">CCCD / Định danh:</span>
                    <span className="font-semibold text-slate-800">{student?.cccdNumber || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="text-slate-500">Mã BGD (MOET):</span>
                    <span className="font-semibold text-slate-800">{student?.moetStudentCode || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="text-slate-500">Dân tộc:</span>
                    <span className="font-semibold text-slate-800">{student?.ethnicity || 'Kinh'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="text-slate-500">Tôn giáo:</span>
                    <span className="font-semibold text-slate-800">{student?.religion || 'Không'}</span>
                  </div>
                  <div className="sm:col-span-2 flex justify-between items-start py-1">
                    <span className="text-slate-500 flex-shrink-0 mr-2">Nơi sinh:</span>
                    <span className="font-semibold text-slate-800 text-right">{student?.birthPlace || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Liên hệ & Gia đình */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                  <Phone size={18} className="text-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Liên hệ & Thông tin Gia đình</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* SĐT Học sinh */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-slate-500">Số điện thoại HS</p>
                      <p className="font-bold text-slate-800 text-sm">{student?.phone || 'Chưa có'}</p>
                    </div>
                    {student?.phone && (
                      <button
                        onClick={() => copyToClipboard(student.phone, 'studentPhone')}
                        className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                        title="Sao chép số điện thoại"
                      >
                        {copiedKey === 'studentPhone' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                      </button>
                    )}
                  </div>

                  {/* Email */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="truncate mr-2">
                      <p className="text-[11px] text-slate-500">Email liên hệ</p>
                      <p className="font-bold text-slate-800 text-sm truncate">{student?.email || student?.user?.email || 'Chưa có'}</p>
                    </div>
                    {(student?.email || student?.user?.email) && (
                      <button
                        onClick={() => copyToClipboard(student?.email || student?.user?.email, 'studentEmail')}
                        className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-indigo-600 transition-all cursor-pointer flex-shrink-0"
                        title="Sao chép email"
                      >
                        {copiedKey === 'studentEmail' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                      </button>
                    )}
                  </div>

                  {/* Họ tên phụ huynh */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[11px] text-slate-500">Họ tên Phụ huynh / Giám hộ</p>
                    <p className="font-bold text-slate-800 text-sm">
                      {student?.parentName || (student?.guardianLinks?.[0]?.parent?.fullName) || 'Chưa cập nhật'}
                    </p>
                  </div>

                  {/* SĐT Phụ huynh */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-slate-500">Số điện thoại Phụ huynh</p>
                      <p className="font-bold text-emerald-700 text-sm">
                        {student?.parentPhone || (student?.guardianLinks?.[0]?.parent?.phone) || 'Chưa có'}
                      </p>
                    </div>
                    {(student?.parentPhone || student?.guardianLinks?.[0]?.parent?.phone) && (
                      <button
                        onClick={() => copyToClipboard(student?.parentPhone || student?.guardianLinks?.[0]?.parent?.phone, 'parentPhone')}
                        className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                        title="Sao chép SĐT phụ huynh"
                      >
                        {copiedKey === 'parentPhone' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                      </button>
                    )}
                  </div>

                  {/* Địa chỉ */}
                  <div className="sm:col-span-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2">
                    <MapPin size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] text-slate-500">Địa chỉ cư trú / Thường trú</p>
                      <p className="font-medium text-slate-800 text-xs mt-0.5">
                        {student?.permanentAddress || student?.address || 'Chưa cập nhật địa chỉ'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Tóm tắt Học tập & Chuyên cần */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                  <GraduationCap size={18} className="text-blue-600" />
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Tóm tắt Học tập & Chuyên cần</h4>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-center">
                    <p className="text-[11px] font-semibold text-indigo-700">Lớp hiện tại</p>
                    <p className="text-lg font-black text-indigo-900 mt-0.5">{student?.class?.className || '—'}</p>
                    <p className="text-[10px] text-indigo-500 truncate" title={student?.class?.homeroomTeacher?.fullName || 'Chưa gán'}>
                      GVCN: {student?.class?.homeroomTeacher?.fullName || 'Chưa gán'}
                    </p>
                  </div>

                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-center">
                    <p className="text-[11px] font-semibold text-emerald-700">Tỷ lệ Chuyên cần</p>
                    <p className="text-lg font-black text-emerald-800 mt-0.5">{attendanceRate}%</p>
                    <p className="text-[10px] text-emerald-600">Đi học: {presentSessions}/{totalSessions || '0'}</p>
                  </div>

                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-center">
                    <p className="text-[11px] font-semibold text-amber-700">Vắng có phép</p>
                    <p className="text-lg font-black text-amber-900 mt-0.5">{excusedSessions}</p>
                    <p className="text-[10px] text-amber-600">Đã xin phép</p>
                  </div>

                  <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 text-center">
                    <p className="text-[11px] font-semibold text-rose-700">Vắng không phép</p>
                    <p className="text-lg font-black text-rose-900 mt-0.5">{unexcusedSessions}</p>
                    <p className="text-[10px] text-rose-600">Cần nhắc nhở</p>
                  </div>
                </div>

                {/* Sức khỏe tóm tắt nếu có */}
                {student?.healthRecord && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <HeartPulse size={14} className="text-rose-500" />
                      <span>Nhóm máu: <strong className="text-slate-800">{student.healthRecord.bloodType || 'Chưa rõ'}</strong></span>
                      <span className="text-slate-300">•</span>
                      <span>Chiều cao/Cân nặng: <strong className="text-slate-800">{student.healthRecord.height || '—'}cm / {student.healthRecord.weight || '—'}kg</strong></span>
                    </div>
                    {student.healthRecord.allergies && (
                      <span className="text-rose-600 font-medium">Dị ứng: {student.healthRecord.allergies}</span>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={handleOpenFullProfile}
            disabled={!student?.id}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>Xem toàn bộ Hồ sơ 360°</span>
            <ExternalLink size={15} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default StudentQuickViewModal;
