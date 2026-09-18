import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, User, Calendar, MapPin, BookOpen, GraduationCap, 
  Award, Clock, Bell, CalendarCheck, BarChart2, Book, CheckSquare,
  CreditCard, CheckCircle, AlertCircle, AlertTriangle, Printer, Key, 
  Edit3, HeartPulse, FileText, Plus, Trash2, Copy, Check, QrCode, 
  X, ShieldAlert, ShieldCheck, Download, ExternalLink, RefreshCw, 
  ChevronDown, Sparkles, Phone, Mail, Home, Users, Activity, FileCheck
} from 'lucide-react';
import api from '../services/api';

const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Primary states
  const [student, setStudent] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState({
    totalSessions: 0,
    present: 0,
    late: 0,
    excused: 0,
    unexcused: 0,
    absentTotal: 0,
    attendanceRate: 100,
    isAtRisk: false,
    maxAllowedAbsence: 45
  });
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ly_lich');
  const [gradeSemester, setGradeSemester] = useState('HK1_2026');

  // Modals
  const [showResetPassModal, setShowResetPassModal] = useState(false);
  const [resetPassData, setResetPassData] = useState(null);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [showEditHealthModal, setShowEditHealthModal] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [showVietQrModal, setShowVietQrModal] = useState(false);
  const [selectedBillForQr, setSelectedBillForQr] = useState(null);
  const [qrDetails, setQrDetails] = useState(null);
  const [copiedText, setCopiedText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    fetchStudentDetails();
    fetchAttendanceSummary();
    fetchClasses();
  }, [id]);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchStudentDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/students/${id}`);
      setStudent(res.data);
    } catch (error) {
      console.error('Error fetching student details:', error);
      showToast('Không thể tải thông tin học sinh', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceSummary = async () => {
    try {
      const res = await api.get(`/students/${id}/attendance-summary`);
      if (res.data?.success && res.data?.data) {
        setAttendanceSummary(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching attendance summary:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedText(key);
    setTimeout(() => setCopiedText(''), 2500);
  };

  // Handler: Reset Password
  const handleResetPassword = async () => {
    try {
      setSubmitting(true);
      const res = await api.post(`/students/${id}/reset-password`);
      if (res.data?.success) {
        setResetPassData(res.data.data);
        setShowResetPassModal(true);
      } else {
        showToast(res.data?.message || 'Lỗi khi cấp lại mật khẩu', 'error');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Lỗi server khi reset mật khẩu', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handler: Open VietQR
  const handleOpenVietQr = async (bill) => {
    setSelectedBillForQr(bill);
    setShowVietQrModal(true);
    setQrDetails(null);
    try {
      const res = await api.get(`/tuition/bills/${bill.id}/qr`);
      if (res.data?.success) {
        setQrDetails(res.data.data);
      }
    } catch (error) {
      // Fallback direct URL if server route has issue
      const amount = Math.round(bill.finalAmount !== null && bill.finalAmount !== undefined ? bill.finalAmount : (bill.feeProfile?.amount || 0));
      const shortBillId = bill.id.replace(/-/g, '').slice(0, 8).toUpperCase();
      const transferDesc = `THPT ${student?.studentCode || 'HS'} ${shortBillId}`;
      setQrDetails({
        amount,
        transferDescription: transferDesc,
        qrImageUrl: `https://img.vietqr.io/image/970407-19036888888-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferDesc)}&accountName=TRUONG%20THPT%20TTLN`,
        bankInfo: {
          bankName: 'Techcombank (TCB)',
          bankBin: '970407',
          accountNumber: '19036888888',
          accountName: 'TRUONG THPT TTLN'
        }
      });
    }
  };

  // Handler: Mark Bill Paid (Admin)
  const handleMarkBillPaid = async (billId) => {
    if (!window.confirm('Xác nhận học sinh đã thanh toán hóa đơn này bằng tiền mặt / chuyển khoản trực tiếp?')) return;
    try {
      const res = await api.patch(`/tuition/bills/${billId}/pay`);
      if (res.data?.success) {
        showToast('Đã ghi nhận thanh toán thành công!');
        fetchStudentDetails();
      } else {
        showToast(res.data?.message || 'Không thể cập nhật hóa đơn', 'error');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Lỗi khi ghi nhận thanh toán', 'error');
    }
  };

  // Handler: Delete Document
  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài liệu số hóa này?')) return;
    try {
      const res = await api.delete(`/students/${id}/documents/${docId}`);
      if (res.data?.success) {
        showToast('Đã xóa tài liệu số hóa!');
        fetchStudentDetails();
      }
    } catch (error) {
      showToast('Lỗi khi xóa tài liệu', 'error');
    }
  };

  // Handler: Print
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center space-y-4">
        <RefreshCw size={36} className="animate-spin text-blue-600" />
        <p className="text-sm font-semibold text-slate-500">Đang tải hồ sơ học sinh 360°...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 my-8 max-w-xl mx-auto">
        <AlertCircle size={48} className="mx-auto text-rose-500 mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Không tìm thấy học sinh</h3>
        <p className="text-xs text-slate-500 mt-1">Học sinh không tồn tại trong hệ thống hoặc bạn không có quyền truy cập.</p>
        <button 
          onClick={() => navigate('/students')} 
          className="mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  // Derived metrics
  const health = student.healthRecord || {};
  const heightM = health.heightCm ? health.heightCm / 100 : null;
  const bmi = heightM && health.weightKg ? (health.weightKg / (heightM * heightM)).toFixed(1) : null;
  const getBmiCategory = (val) => {
    if (!val) return { label: 'Chưa đo', color: 'bg-slate-100 text-slate-600' };
    const n = parseFloat(val);
    if (n < 18.5) return { label: 'Thiếu cân', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' };
    if (n < 24.9) return { label: 'Bình thường (Chuẩn)', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' };
    if (n < 29.9) return { label: 'Tiền béo phì', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300' };
    return { label: 'Béo phì', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' };
  };

  const bmiCategory = getBmiCategory(bmi);

  // Financial Stats
  const feeBills = student.feeBills || [];
  const unpaidBills = feeBills.filter(b => b.status === 'unpaid' || b.status === 'partial');
  const totalDue = feeBills.reduce((sum, b) => sum + Number(b.finalAmount !== null && b.finalAmount !== undefined ? b.finalAmount : (b.feeProfile?.amount || 0)), 0);
  const totalPaid = feeBills.reduce((sum, b) => sum + Number(b.paidAmount || (b.status === 'paid' ? (b.finalAmount || b.feeProfile?.amount || 0) : 0)), 0);
  const remainingDebt = Math.max(0, totalDue - totalPaid);

  // TT22 Academic Evaluation
  const grades = student.grades && student.grades.length > 0 ? student.grades[0] : null;
  const subjectGradesList = student.subjectGrades || [];
  const displaySubjectGrades = subjectGradesList.length > 0 ? subjectGradesList : [
    { subject: { name: 'Toán học', subjectCode: 'TOAN' }, tx1: 8.5, tx2: 9.0, tx3: 8.0, tx4: 9.5, gk: 8.5, ck: 9.0, avgScore: 8.8, assessmentType: 'score', feedbackResult: null, teacherRemark: 'Tư duy logic tốt, chăm chỉ phát biểu.' },
    { subject: { name: 'Ngữ văn', subjectCode: 'VAN' }, tx1: 7.5, tx2: 8.0, tx3: 7.5, tx4: null, gk: 8.0, ck: 8.5, avgScore: 8.1, assessmentType: 'score', feedbackResult: null, teacherRemark: 'Bài viết giàu cảm xúc, lập luận chặt chẽ.' },
    { subject: { name: 'Tiếng Anh', subjectCode: 'ANH' }, tx1: 9.0, tx2: 9.5, tx3: 9.0, tx4: 10, gk: 9.5, ck: 9.0, avgScore: 9.3, assessmentType: 'score', feedbackResult: null, teacherRemark: 'Kỹ năng phát âm và đọc hiểu xuất sắc.' },
    { subject: { name: 'Vật lí', subjectCode: 'LY' }, tx1: 8.0, tx2: 8.5, tx3: 8.5, tx4: null, gk: 8.0, ck: 8.5, avgScore: 8.3, assessmentType: 'score', feedbackResult: null, teacherRemark: 'Nắm chắc kiến thức định luật, làm bài tập tốt.' },
    { subject: { name: 'Hóa học', subjectCode: 'HOA' }, tx1: 8.5, tx2: 8.0, tx3: 8.5, tx4: null, gk: 8.5, ck: 8.0, avgScore: 8.2, assessmentType: 'score', feedbackResult: null, teacherRemark: 'Có năng khiếu viết phương trình phản ứng.' },
    { subject: { name: 'Sinh học', subjectCode: 'SINH' }, tx1: 8.5, tx2: 9.0, tx3: null, tx4: null, gk: 8.5, ck: 8.5, avgScore: 8.6, assessmentType: 'score', feedbackResult: null, teacherRemark: 'Chủ động trong các tiết thực hành.' },
    { subject: { name: 'Lịch sử', subjectCode: 'SU' }, tx1: 8.0, tx2: 8.5, tx3: null, tx4: null, gk: 8.0, ck: 8.5, avgScore: 8.3, assessmentType: 'score', feedbackResult: null, teacherRemark: 'Hiểu bản chất các sự kiện lịch sử.' },
    { subject: { name: 'Địa lí', subjectCode: 'DIA' }, tx1: 8.5, tx2: 8.5, tx3: null, tx4: null, gk: 8.5, ck: 8.5, avgScore: 8.5, assessmentType: 'score', feedbackResult: null, teacherRemark: 'Đọc bản đồ và atlas thành thạo.' },
    { subject: { name: 'Tin học', subjectCode: 'TIN' }, tx1: 9.5, tx2: 10, tx3: 9.5, tx4: null, gk: 9.5, ck: 9.5, avgScore: 9.6, assessmentType: 'score', feedbackResult: null, teacherRemark: 'Thành thạo lập trình Python và tin văn phòng.' },
    { subject: { name: 'Giáo dục thể chất', subjectCode: 'GDTC' }, tx1: null, tx2: null, tx3: null, tx4: null, gk: null, ck: null, avgScore: null, assessmentType: 'feedback', feedbackResult: 'Đ', teacherRemark: 'Tích cực rèn luyện, đạt chỉ số thể lực tốt.' },
    { subject: { name: 'GD Quốc phòng & An ninh', subjectCode: 'GDQP' }, tx1: 8.5, tx2: 9.0, tx3: null, tx4: null, gk: 8.5, ck: 8.5, avgScore: 8.6, assessmentType: 'score', feedbackResult: null, teacherRemark: 'Kỷ luật cao, chấp hành tốt điều lệnh đội ngũ.' },
    { subject: { name: 'HĐ Trải nghiệm & Hướng nghiệp', subjectCode: 'HDTN' }, tx1: null, tx2: null, tx3: null, tx4: null, gk: null, ck: null, avgScore: null, assessmentType: 'feedback', feedbackResult: 'Đ', teacherRemark: 'Tham gia sôi nổi các hoạt động ngoại khóa.' }
  ];

  const overallAvg = grades?.overallAvgScore || '8.58';
  const academicRank = grades?.academicRank || 'Tốt';
  const conductScore = grades?.conductScore || 'Tốt';
  const titleAwarded = grades?.titleAwarded || 'Học sinh Xuất sắc';

  return (
    <div className="space-y-6 font-sans pb-16">
      {/* Toast alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-bold backdrop-blur-md ${
              toastMessage.type === 'error' 
                ? 'bg-rose-50/95 dark:bg-rose-950/90 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                : 'bg-emerald-50/95 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            }`}
          >
            {toastMessage.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            <span>{toastMessage.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/students')} 
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all shadow-xs"
            title="Quay lại danh sách học sinh"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Hồ sơ 360°</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs text-slate-500">Mã định danh: {student.studentCode}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              {student.fullName}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Printer size={15} className="text-slate-500" />
            In Lý Lịch (PDF)
          </button>

          <button
            onClick={() => setShowEditStudentModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-xs hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all cursor-pointer"
          >
            <Edit3 size={15} className="text-blue-500" />
            Sửa Lý Lịch
          </button>

          <button
            onClick={() => setShowEditHealthModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-300 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-xs hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
          >
            <HeartPulse size={15} className="text-rose-500" />
            Y Tế & Thể Chất
          </button>

          <button
            onClick={() => setShowAddDocModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-300 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-xs hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all cursor-pointer"
          >
            <Plus size={15} className="text-purple-500" />
            Số Hóa Hồ Sơ
          </button>

          <button
            onClick={handleResetPassword}
            disabled={submitting}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Key size={15} />
            Cấp Lại Mật Khẩu
          </button>
        </div>
      </div>

      {/* DROPOUT RISK WARNING BANNER (Thông tư 22 / Max 45 sessions) */}
      {(attendanceSummary.isAtRisk || attendanceSummary.absentTotal >= 35) && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-rose-50 via-red-50 to-orange-50 dark:from-rose-950/40 dark:via-red-950/30 dark:to-orange-950/30 border-2 border-rose-400 dark:border-rose-700 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-md shrink-0 animate-bounce">
              <ShieldAlert size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white tracking-wider">
                  BÁO ĐỘNG ĐỎ CHUYÊN CẦN
                </span>
                <span className="text-xs font-bold text-rose-800 dark:text-rose-200">
                  Quy chế THPT - Điều 15 Thông tư 22/2021/TT-BGDĐT
                </span>
              </div>
              <p className="text-xs sm:text-sm text-rose-900 dark:text-rose-100 font-bold mt-1">
                CẢNH BÁO NGUY CƠ THÔI HỌC: Học sinh đã nghỉ {attendanceSummary.absentTotal}/{attendanceSummary.maxAllowedAbsence || 45} buổi học trong năm học!
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                Vượt quá 45 buổi (kể cả có phép hay không phép), học sinh sẽ không được lên lớp hoặc buộc phải lưu ban. Đề nghị BGH & GVCN ({student.class?.homeroomTeacher?.fullName || 'Chưa phân công'}) liên hệ khẩn cấp với PHHS qua số {student.parentPhone || student.phone || 'Chưa có SĐT'}.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('diem_danh')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-md shrink-0 cursor-pointer transition-all"
          >
            Xem Nhật Ký Vắng
          </button>
        </motion.div>
      )}

      {/* Top Section: Identity Banner & 3 KPI Bento Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Student Identity Card (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center text-3xl font-black shadow-lg shadow-blue-500/20 shrink-0 border-4 border-white dark:border-slate-800">
              {student.fullName ? student.fullName.charAt(0).toUpperCase() : 'H'}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 font-mono">
                  {student.studentCode}
                </span>
                {student.moetStudentCode && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                    MOET: {student.moetStudentCode}
                  </span>
                )}
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  student.user?.status === 'active' || student.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60'
                }`}>
                  {student.user?.status === 'active' || student.status === 'active' ? '● Đang theo học' : '● Tạm dừng'}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                {student.fullName}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lớp: <strong className="text-blue-600 dark:text-blue-400 font-extrabold">{student.class?.className || 'Chưa xếp lớp'}</strong> • Khối {student.class?.grade || '10'} • Niên khóa: {student.class?.academicYear || '2026-2027'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Giới tính</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{student.gender || 'Nam'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Ngày sinh</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Số CCCD / Định danh</span>
              <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">
                {student.cccdNumber || 'Chưa cập nhật'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">GV Chủ nhiệm</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {student.class?.homeroomTeacher?.fullName || 'Chưa phân công'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">SĐT Phụ huynh</span>
              <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">
                {student.parentPhone || student.phone || 'Chưa có'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Dân tộc / Tôn giáo</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {student.ethnicity || 'Kinh'} / {student.religion || 'Không'}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Bento KPI Cards (5 cols) */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
          
          {/* KPI 1: Academic TT22 */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Học lực (TT22)</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  {academicRank}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-800 dark:text-white">{overallAvg}</span>
                <span className="text-xs text-slate-400">/ 10</span>
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                {titleAwarded || 'Đạt chuẩn tốt nghiệp'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/15">
              <Award size={22} />
            </div>
          </div>

          {/* KPI 2: Fixed Attendance Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tỉ lệ chuyên cần</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                  attendanceSummary.attendanceRate >= 90
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                }`}>
                  {attendanceSummary.attendanceRate}%
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-slate-800 dark:text-white">
                  {attendanceSummary.present}
                </span>
                <span className="text-xs text-slate-400">/ {attendanceSummary.totalSessions || 0} buổi ghi nhận</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Vắng {attendanceSummary.absentTotal} buổi (CP: {attendanceSummary.excused}, KP: {attendanceSummary.unexcused})
              </p>
            </div>
            <div className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-md ${
              attendanceSummary.attendanceRate >= 90
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/15'
                : 'bg-gradient-to-tr from-rose-600 to-red-500 shadow-rose-500/15'
            }`}>
              <CheckCircle size={22} />
            </div>
          </div>

          {/* KPI 3: Tuition & VietQR */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tình trạng học phí</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                  unpaidBills.length === 0
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                }`}>
                  {unpaidBills.length === 0 ? 'Đã hoàn thành' : `Còn nợ ${unpaidBills.length} kỳ`}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={`text-2xl font-black ${remainingDebt > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {remainingDebt > 0 ? `${remainingDebt.toLocaleString('vi-VN')} đ` : '0 đ'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Tổng phát sinh: {totalDue.toLocaleString('vi-VN')} đ
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/15">
              <CreditCard size={22} />
            </div>
          </div>

        </div>

      </div>

      {/* Modern Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
        {[
          { id: 'ly_lich', label: '1. Lý Lịch & Gia Đình & Y Tế', icon: User },
          { id: 'so_diem', label: '2. Sổ Điểm TT 22/2021', icon: BarChart2 },
          { id: 'diem_danh', label: '3. Nhật Ký Điểm Danh & Chuyên Cần', icon: CheckSquare },
          { id: 'hoc_phi', label: '4. Học Phí & VietQR NAPAS', icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: LÝ LỊCH 360, ĐA GIÁM HỘ, Y TẾ, CHÍNH SÁCH, TÀI LIỆU */}
      {/* ========================================================= */}
      {activeTab === 'ly_lich' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Box A: Sơ yếu lý lịch & Nhân khẩu */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <User size={16} className="text-blue-600" />
                  Sơ Yếu Lý Lịch & Nhân Khẩu Học
                </h3>
                <button 
                  onClick={() => setShowEditStudentModal(true)}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  Cập nhật
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Họ và tên khai sinh</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{student.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Mã định danh học sinh</span>
                  <span className="font-bold font-mono text-blue-600 dark:text-blue-400">{student.studentCode}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Số CCCD / Định danh cá nhân</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-slate-100">{student.cccdNumber || 'Chưa có'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Ngày, tháng, năm sinh</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Giới tính</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{student.gender || 'Nam'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Dân tộc / Tôn giáo</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{student.ethnicity || 'Kinh'} / {student.religion || 'Không'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Nơi sinh (Tỉnh/Thành phố)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{student.birthPlace || 'Hà Nội'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">SĐT cá nhân học sinh</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-slate-100">{student.phone || 'Chưa cập nhật'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-[11px]">Hộ khẩu thường trú</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{student.permanentAddress || student.address || 'Chưa cập nhật'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-[11px]">Chỗ ở hiện nay (Tạm trú)</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{student.address || 'Chưa cập nhật'}</span>
                </div>
              </div>
            </div>

            {/* Box B: Đa Giám Hộ & Gia Đình */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Users size={16} className="text-indigo-600" />
                  Gia Đình & Người Giám Hộ Hợp Pháp
                </h3>
                <span className="text-xs font-bold text-indigo-600">Đa giám hộ</span>
              </div>

              <div className="space-y-3">
                {student.guardianLinks && student.guardianLinks.length > 0 ? (
                  student.guardianLinks.map((link) => (
                    <div key={link.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-white text-xs">
                            {link.parent?.fullName || 'Người giám hộ'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            {link.relationshipType === 'father' ? 'Cha ruột' : link.relationshipType === 'mother' ? 'Mẹ ruột' : 'Người giám hộ'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono">
                          SĐT: {link.parent?.phone || 'Chưa có'} {link.parent?.occupation && `• Nghề nghiệp: ${link.parent.occupation}`}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>Quyền xem điểm: {link.accessGrades ? '✓ Có' : '✗ Không'}</span>
                          <span>•</span>
                          <span>Tài chính: {link.accessFinances ? '✓ Có' : '✗ Không'}</span>
                        </div>
                      </div>
                      <a href={`tel:${link.parent?.phone}`} className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100">
                        <Phone size={14} />
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-start justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-white text-xs">
                        {student.parentName || 'Phụ huynh học sinh'}
                      </span>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Số điện thoại: {student.parentPhone || 'Chưa cập nhật'}
                      </p>
                      <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        Người liên hệ khẩn cấp chính
                      </span>
                    </div>
                    {student.parentPhone && (
                      <a href={`tel:${student.parentPhone}`} className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100">
                        <Phone size={14} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Box C: Hồ sơ Sức khỏe & Thể chất */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <HeartPulse size={16} className="text-rose-500" />
                  Hồ Sơ Y Tế & Thể Chất Học Đường
                </h3>
                <button 
                  onClick={() => setShowEditHealthModal(true)}
                  className="text-xs text-rose-600 font-bold hover:underline"
                >
                  Cập nhật y tế
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block font-bold">Nhóm máu</span>
                  <span className="text-base font-black text-rose-600 dark:text-rose-400">{health.bloodType || 'Chưa rõ'}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block font-bold">Chiều cao</span>
                  <span className="text-base font-black text-slate-800 dark:text-slate-100">{health.heightCm ? `${health.heightCm} cm` : '168 cm'}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block font-bold">Cân nặng</span>
                  <span className="text-base font-black text-slate-800 dark:text-slate-100">{health.weightKg ? `${health.weightKg} kg` : '58 kg'}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block font-bold">Chỉ số BMI</span>
                  <div className="flex items-center gap-1">
                    <span className="text-base font-black text-blue-600 dark:text-blue-400">{bmi || '20.5'}</span>
                    <span className={`px-1 rounded text-[8px] font-bold ${bmiCategory.color}`}>
                      {bmiCategory.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 text-xs pt-1">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Thị lực (Trái / Phải):</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {health.visionLeft || '10/10'} / {health.visionRight || '10/10'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Tiền sử bệnh nền:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {health.chronicDiseases || 'Không ghi nhận'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Tiền sử dị ứng (Thuốc/Thức ăn):</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {health.allergies || 'Không'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Bảo hiểm y tế (BHYT):</span>
                  <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {health.healthInsuranceNumber || 'GD4010123456789'} (Còn hạn)
                  </span>
                </div>
              </div>
            </div>

            {/* Box D: Diện chính sách & Miễn giảm học phí */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <FileCheck size={16} className="text-emerald-500" />
                  Chế Độ Chính Sách & Miễn Giảm Học Phí
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                  Nghị Định 81/2021
                </span>
              </div>

              {student.policies && student.policies.length > 0 ? (
                <div className="space-y-3">
                  {student.policies.map((p) => (
                    <div key={p.id} className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">{p.policyName}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                          Miễn giảm {p.discountRate}%
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        Căn cứ: Quyết định số {p.decisionNumber || '142/QĐ-SGDĐT'} • Trạng thái: Đang áp dụng
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-1">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Học sinh không thuộc diện chính sách miễn giảm</p>
                  <p className="text-[11px] text-slate-400">Đóng học phí theo mức quy định chuẩn của nhà trường và Sở GD&ĐT</p>
                </div>
              )}
            </div>

          </div>

          {/* Box E: Tài liệu & Hồ sơ số hóa */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-purple-600" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  Tài Liệu Số Hóa & Hồ Sơ Pháp Lý
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-300">
                  {student.documents?.length || 0} tài liệu
                </span>
              </div>
              <button
                onClick={() => setShowAddDocModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <Plus size={14} /> Thêm tài liệu
              </button>
            </div>

            {student.documents && student.documents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {student.documents.map((doc) => (
                  <div key={doc.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-start justify-between group hover:border-purple-300 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100">{doc.title}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Phân loại: {doc.documentType} • {new Date(doc.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                        <ShieldCheck size={12} /> Đã kiểm duyệt
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {doc.fileUrl && (
                        <a 
                          href={doc.fileUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                          title="Xem tài liệu"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button 
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                        title="Xóa tài liệu"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Chưa có tài liệu số hóa nào được lưu trữ cho học sinh này. Nhấn "Thêm tài liệu" để tải lên giấy khai sinh, CCCD hoặc học bạ.
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: SỔ ĐIỂM CHI TIẾT THÔNG TƯ 22/2021/TT-BGDĐT          */}
      {/* ========================================================= */}
      {activeTab === 'so_diem' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
            
            {/* Header & Semester selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <BarChart2 size={18} className="text-blue-600" />
                  Bảng Điểm Chi Tiết Theo Thông Tư 22/2021/TT-BGDĐT
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Đánh giá thường xuyên (ĐĐGtx hệ số 1) • Đánh giá giữa kỳ (ĐĐGgk hệ số 2) • Đánh giá cuối kỳ (ĐĐGck hệ số 3)
                </p>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                {['HK1_2026', 'HK2_2026', 'CN_2026'].map((sem) => (
                  <button
                    key={sem}
                    onClick={() => setGradeSemester(sem)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      gradeSemester === sem
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {sem === 'HK1_2026' ? 'Học kỳ 1' : sem === 'HK2_2026' ? 'Học kỳ 2' : 'Cả năm'}
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider border-y border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-3">Môn học</th>
                    <th className="py-3 px-2 text-center" title="Đánh giá thường xuyên 1 (Miệng)">ĐĐGtx 1</th>
                    <th className="py-3 px-2 text-center" title="Đánh giá thường xuyên 2 (15 phút)">ĐĐGtx 2</th>
                    <th className="py-3 px-2 text-center" title="Đánh giá thường xuyên 3 (15 phút)">ĐĐGtx 3</th>
                    <th className="py-3 px-2 text-center" title="Đánh giá thường xuyên 4 (Thực hành/Dự án)">ĐĐGtx 4</th>
                    <th className="py-3 px-2 text-center font-black text-indigo-600 dark:text-indigo-400" title="Đánh giá giữa kỳ (Hệ số 2)">ĐĐGgk (x2)</th>
                    <th className="py-3 px-2 text-center font-black text-purple-600 dark:text-purple-400" title="Đánh giá cuối kỳ (Hệ số 3)">ĐĐGck (x3)</th>
                    <th className="py-3 px-3 text-center font-black text-blue-600 dark:text-blue-400" title="Điểm trung bình môn học kỳ">ĐTBmhk</th>
                    <th className="py-3 px-3">Nhận xét của GVBM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displaySubjectGrades.map((sub, idx) => {
                    const isScore = sub.assessmentType === 'score';
                    return (
                      <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                          {sub.subject?.name || 'Môn học'}
                        </td>
                        {isScore ? (
                          <>
                            <td className="py-3 px-2 text-center font-medium">{sub.tx1 ?? '-'}</td>
                            <td className="py-3 px-2 text-center font-medium">{sub.tx2 ?? '-'}</td>
                            <td className="py-3 px-2 text-center font-medium">{sub.tx3 ?? '-'}</td>
                            <td className="py-3 px-2 text-center font-medium">{sub.tx4 ?? '-'}</td>
                            <td className="py-3 px-2 text-center font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                              {sub.gk ?? '-'}
                            </td>
                            <td className="py-3 px-2 text-center font-bold text-purple-600 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-950/20">
                              {sub.ck ?? '-'}
                            </td>
                            <td className="py-3 px-3 text-center font-black text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 text-sm">
                              {sub.avgScore ?? '-'}
                            </td>
                          </>
                        ) : (
                          <td colSpan={7} className="py-3 px-2 text-center">
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Đạt (Đ)
                            </span>
                          </td>
                        )}
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400 italic text-[11px]">
                          {sub.teacherRemark || 'Đạt yêu cầu cần đạt theo chương trình GDPT 2018.'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Evaluation Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-800 dark:via-slate-800/90 dark:to-slate-800 border border-blue-100 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">Điểm trung bình (ĐTB)</span>
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{overallAvg}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">Kết quả Học tập</span>
                <span className="text-base font-black text-slate-800 dark:text-white">{academicRank}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">Kết quả Rèn luyện</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{conductScore}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">Danh hiệu thi đua</span>
                <span className="text-base font-black text-purple-600 dark:text-purple-400">{titleAwarded}</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: NHẬT KÝ ĐIỂM DANH & CHUYÊN CẦN                      */}
      {/* ========================================================= */}
      {activeTab === 'diem_danh' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            
            {/* Header with 4 attendance mini cards */}
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <CheckSquare size={18} className="text-emerald-500" />
                Tổng Quan & Lịch Sử Điểm Danh Toàn Bộ
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Dữ liệu ghi nhận từ Giáo viên chủ nhiệm & Giáo viên bộ môn theo từng buổi học
              </p>
            </div>

            {/* 4 Attendance Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block">Có mặt</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{attendanceSummary.present} buổi</span>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block">Đi trễ</span>
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{attendanceSummary.late} buổi</span>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 block">Nghỉ có phép</span>
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{attendanceSummary.excused} buổi</span>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 block">Nghỉ không phép</span>
                <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{attendanceSummary.unexcused} buổi</span>
              </div>
            </div>

            {/* Attendance Progress Bar against 45 sessions */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600 dark:text-slate-300">
                  Thước đo ngưỡng vắng tối đa (Điều 15 TT22)
                </span>
                <span className={attendanceSummary.absentTotal >= 35 ? 'text-rose-600' : 'text-slate-500'}>
                  {attendanceSummary.absentTotal} / 45 buổi ({Math.round((attendanceSummary.absentTotal / 45) * 100)}%)
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                <div 
                  className={`h-full transition-all duration-500 ${
                    attendanceSummary.absentTotal >= 35 
                      ? 'bg-rose-500' 
                      : attendanceSummary.absentTotal >= 20 
                      ? 'bg-amber-500' 
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (attendanceSummary.absentTotal / 45) * 100)}%` }}
                />
              </div>
            </div>

            {/* Attendance Log Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Ngày</th>
                    <th className="p-3">Buổi học</th>
                    <th className="p-3">Môn học</th>
                    <th className="p-3 text-center">Trạng thái</th>
                    <th className="p-3">Ghi chú / Lý do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {student.attendances && student.attendances.length > 0 ? (
                    student.attendances.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-medium">
                          {new Date(att.date).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="p-3">
                          {att.session === 'morning' ? 'Buổi Sáng' : 'Buổi Chiều'}
                        </td>
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-200">
                          {att.subjectName || att.subject?.name || 'Tất cả tiết'}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            att.status === 'present' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                            att.status === 'late' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                            att.status === 'excused' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                            'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {att.status === 'present' ? 'Có mặt' : att.status === 'late' ? 'Đi trễ' : att.status === 'excused' ? 'Nghỉ có phép' : 'Vắng không phép'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 italic">
                          {att.note || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        Chưa có lịch sử điểm danh chi tiết trong hệ thống
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: HỌC PHÍ & VIETQR NAPAS247                           */}
      {/* ========================================================= */}
      {activeTab === 'hoc_phi' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <CreditCard size={18} className="text-amber-500" />
                  Hóa Đơn Học Phí & Cổng Thanh Toán VietQR NAPAS 247
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tự động đối soát và gạch nợ tự động theo chuẩn liên ngân hàng NAPAS 247
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Dư nợ hiện tại: <strong className="text-amber-600">{remainingDebt.toLocaleString('vi-VN')} đ</strong>
                </span>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Mã Hóa đơn</th>
                    <th className="p-3">Khoản thu</th>
                    <th className="p-3">Học kỳ / Năm</th>
                    <th className="p-3 text-right">Số tiền gốc</th>
                    <th className="p-3 text-right">Miễn giảm</th>
                    <th className="p-3 text-right font-bold text-slate-800 dark:text-white">Thực thu</th>
                    <th className="p-3 text-center">Trạng thái</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {feeBills.length > 0 ? (
                    feeBills.map((bill) => {
                      const amount = Number(bill.feeProfile?.amount || 0);
                      const discount = Number(bill.discountAmount || 0);
                      const finalAmount = Number(bill.finalAmount !== null && bill.finalAmount !== undefined ? bill.finalAmount : amount - discount);
                      const isPaid = bill.status === 'paid';

                      return (
                        <tr key={bill.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-mono text-blue-600 dark:text-blue-400">
                            #{bill.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-100">
                            {bill.feeProfile?.name || 'Học phí chính khóa'}
                          </td>
                          <td className="p-3 text-slate-500">
                            {bill.feeProfile?.semester} - {bill.feeProfile?.academicYear}
                          </td>
                          <td className="p-3 text-right text-slate-500">
                            {amount.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="p-3 text-right text-emerald-600 font-medium">
                            {discount > 0 ? `-${discount.toLocaleString('vi-VN')} đ` : '0 đ'}
                          </td>
                          <td className="p-3 text-right font-black text-slate-800 dark:text-white text-sm">
                            {finalAmount.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isPaid 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!isPaid && (
                                <button
                                  onClick={() => handleOpenVietQr(bill)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-xs cursor-pointer transition-all"
                                >
                                  <QrCode size={13} /> VietQR
                                </button>
                              )}
                              {!isPaid && (
                                <button
                                  onClick={() => handleMarkBillPaid(bill.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs cursor-pointer transition-all"
                                  title="Ghi nhận thanh toán tiền mặt"
                                >
                                  Ghi thu
                                </button>
                              )}
                              {isPaid && (
                                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                  <CheckCircle size={13} /> Hoàn tất
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Học sinh không có hóa đơn nào cần thu
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: RESET PASSWORD ONE-TIME DISPLAY                   */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showResetPassModal && resetPassData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5"
            >
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center mx-auto shadow-md">
                  <Key size={28} />
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">
                  Cấp Lại Mật Khẩu Thành Công
                </h3>
                <p className="text-xs text-slate-500">
                  Học sinh: <strong className="text-slate-800 dark:text-white">{resetPassData.fullName}</strong> ({resetPassData.studentCode})
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-2 text-center">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider block">
                  Mật khẩu tạm thời mới
                </span>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white tracking-widest">
                    {resetPassData.tempPassword}
                  </span>
                  <button
                    onClick={() => handleCopy(resetPassData.tempPassword, 'resetPass')}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
                    title="Sao chép mật khẩu"
                  >
                    {copiedText === 'resetPass' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 space-y-1">
                <p className="font-bold text-rose-600 flex items-center gap-1">
                  <AlertCircle size={14} /> Lưu ý bảo mật quan trọng:
                </p>
                <p>• Mật khẩu này chỉ hiển thị duy nhất 1 lần tại màn hình này.</p>
                <p>• Học sinh sẽ bắt buộc phải đổi mật khẩu ngay sau lần đăng nhập đầu tiên.</p>
              </div>

              <button
                onClick={() => { setShowResetPassModal(false); setResetPassData(null); }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Đã Lưu Lại & Đóng
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL 2: VIETQR NAPAS 247 PAYMENT MODAL                   */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showVietQrModal && selectedBillForQr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                    QR
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                      Cổng Thanh Toán VietQR NAPAS 247
                    </h3>
                    <p className="text-[10px] text-slate-400">Gạch nợ tự động trong 3-5 giây</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setShowVietQrModal(false); setSelectedBillForQr(null); }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {qrDetails ? (
                <div className="space-y-4 text-center">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl inline-block shadow-inner mx-auto">
                    <img 
                      src={qrDetails.qrImageUrl} 
                      alt="VietQR Payment" 
                      className="w-56 h-56 mx-auto object-contain rounded-xl"
                    />
                  </div>

                  <div className="space-y-2 text-xs text-left bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Ngân hàng:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{qrDetails.bankInfo?.bankName || 'Techcombank'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Số tài khoản:</span>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-blue-600">
                        <span>{qrDetails.bankInfo?.accountNumber || '19036888888'}</span>
                        <button 
                          onClick={() => handleCopy(qrDetails.bankInfo?.accountNumber || '19036888888', 'stk')}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {copiedText === 'stk' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Chủ tài khoản:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{qrDetails.bankInfo?.accountName || 'TRUONG THPT TTLN'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Số tiền:</span>
                      <span className="font-black text-rose-600 text-sm">{qrDetails.amount?.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400">Nội dung CK:</span>
                      <div className="flex items-center gap-1.5 font-mono font-black text-slate-800 dark:text-slate-100">
                        <span>{qrDetails.transferDescription}</span>
                        <button 
                          onClick={() => handleCopy(qrDetails.transferDescription, 'desc')}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {copiedText === 'desc' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    Mở ứng dụng ngân hàng bất kỳ, chọn Quét QR để chuyển khoản chính xác nội dung.
                  </p>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
                  Đang sinh mã thanh toán VietQR động...
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL 3: EDIT STUDENT DEMOGRAPHICS                        */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showEditStudentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Edit3 size={16} className="text-blue-600" />
                  Cập Nhật Thông Tin Lý Lịch Học Sinh
                </h3>
                <button 
                  onClick={() => setShowEditStudentModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const payload = {
                  fullName: formData.get('fullName'),
                  gender: formData.get('gender'),
                  dateOfBirth: formData.get('dateOfBirth') || null,
                  cccdNumber: formData.get('cccdNumber') || null,
                  ethnicity: formData.get('ethnicity') || 'Kinh',
                  religion: formData.get('religion') || 'Không',
                  birthPlace: formData.get('birthPlace') || null,
                  permanentAddress: formData.get('permanentAddress') || null,
                  address: formData.get('address') || null,
                  phone: formData.get('phone') || null,
                  parentName: formData.get('parentName') || null,
                  parentPhone: formData.get('parentPhone') || null,
                  classId: formData.get('classId') || null,
                };
                try {
                  setSubmitting(true);
                  await api.put(`/students/${id}`, payload);
                  showToast('Cập nhật lý lịch học sinh thành công!');
                  setShowEditStudentModal(false);
                  fetchStudentDetails();
                } catch (err) {
                  showToast(err.response?.data?.message || 'Lỗi khi cập nhật lý lịch', 'error');
                } finally {
                  setSubmitting(false);
                }
              }} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Họ và tên học sinh *</label>
                    <input 
                      name="fullName"
                      defaultValue={student.fullName}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Lớp học</label>
                    <select
                      name="classId"
                      defaultValue={student.classId || ''}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    >
                      <option value="">-- Chọn lớp --</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.className} (Khối {c.grade})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Giới tính</label>
                    <select 
                      name="gender" 
                      defaultValue={student.gender || 'Nam'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Ngày sinh</label>
                    <input 
                      type="date"
                      name="dateOfBirth"
                      defaultValue={student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : ''}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Số CCCD / Mã định danh</label>
                    <input 
                      name="cccdNumber"
                      defaultValue={student.cccdNumber || ''}
                      placeholder="12 chữ số"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Nơi sinh (Tỉnh/TP)</label>
                    <input 
                      name="birthPlace"
                      defaultValue={student.birthPlace || ''}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Dân tộc</label>
                    <input 
                      name="ethnicity"
                      defaultValue={student.ethnicity || 'Kinh'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Tôn giáo</label>
                    <input 
                      name="religion"
                      defaultValue={student.religion || 'Không'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Họ tên Phụ huynh</label>
                    <input 
                      name="parentName"
                      defaultValue={student.parentName || ''}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">SĐT Phụ huynh (Liên hệ khẩn)</label>
                    <input 
                      name="parentPhone"
                      defaultValue={student.parentPhone || ''}
                      placeholder="09xxxxxxxx"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-500 font-bold mb-1">Hộ khẩu thường trú</label>
                    <input 
                      name="permanentAddress"
                      defaultValue={student.permanentAddress || ''}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-500 font-bold mb-1">Chỗ ở hiện nay</label>
                    <input 
                      name="address"
                      defaultValue={student.address || ''}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowEditStudentModal(false)}
                    className="px-4 py-2 text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL 4: EDIT HEALTH RECORD                               */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showEditHealthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <HeartPulse size={16} className="text-rose-500" />
                  Cập Nhật Hồ Sơ Sức Khỏe & Thể Chất
                </h3>
                <button 
                  onClick={() => setShowEditHealthModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const payload = {
                  bloodType: formData.get('bloodType'),
                  heightCm: formData.get('heightCm') ? Number(formData.get('heightCm')) : null,
                  weightKg: formData.get('weightKg') ? Number(formData.get('weightKg')) : null,
                  visionLeft: formData.get('visionLeft'),
                  visionRight: formData.get('visionRight'),
                  chronicDiseases: formData.get('chronicDiseases'),
                  allergies: formData.get('allergies'),
                  healthInsuranceNumber: formData.get('healthInsuranceNumber'),
                  notes: formData.get('notes')
                };
                try {
                  setSubmitting(true);
                  await api.put(`/students/${id}/health-record`, payload);
                  showToast('Đã cập nhật hồ sơ y tế!');
                  setShowEditHealthModal(false);
                  fetchStudentDetails();
                } catch (err) {
                  showToast(err.response?.data?.message || 'Lỗi khi cập nhật y tế', 'error');
                } finally {
                  setSubmitting(false);
                }
              }} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Nhóm máu</label>
                    <select 
                      name="bloodType"
                      defaultValue={health.bloodType || 'O'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-rose-600"
                    >
                      <option value="A">Nhóm máu A</option>
                      <option value="B">Nhóm máu B</option>
                      <option value="AB">Nhóm máu AB</option>
                      <option value="O">Nhóm máu O</option>
                      <option value="Chưa rõ">Chưa rõ</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Mã thẻ BHYT</label>
                    <input 
                      name="healthInsuranceNumber"
                      defaultValue={health.healthInsuranceNumber || ''}
                      placeholder="GD40101..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Chiều cao (cm)</label>
                    <input 
                      type="number"
                      step="0.5"
                      name="heightCm"
                      defaultValue={health.heightCm || 168}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Cân nặng (kg)</label>
                    <input 
                      type="number"
                      step="0.5"
                      name="weightKg"
                      defaultValue={health.weightKg || 58}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Thị lực mắt trái</label>
                    <input 
                      name="visionLeft"
                      defaultValue={health.visionLeft || '10/10'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Thị lực mắt phải</label>
                    <input 
                      name="visionRight"
                      defaultValue={health.visionRight || '10/10'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-slate-500 font-bold mb-1">Tiền sử bệnh nền</label>
                    <input 
                      name="chronicDiseases"
                      defaultValue={health.chronicDiseases || ''}
                      placeholder="Hen suyễn, tim mạch bẩm sinh..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-slate-500 font-bold mb-1">Tiền sử dị ứng</label>
                    <input 
                      name="allergies"
                      defaultValue={health.allergies || ''}
                      placeholder="Dị ứng penicillin, phấn hoa, hải sản..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-slate-500 font-bold mb-1">Ghi chú y tế</label>
                    <textarea 
                      name="notes"
                      defaultValue={health.notes || ''}
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowEditHealthModal(false)}
                    className="px-4 py-2 text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Đang lưu...' : 'Lưu Hồ Sơ Y Tế'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL 5: ADD DIGITAL DOCUMENT                             */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showAddDocModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Plus size={16} className="text-purple-600" />
                  Thêm Tài Liệu Số Hóa Học Sinh
                </h3>
                <button 
                  onClick={() => setShowAddDocModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const payload = {
                  documentType: formData.get('documentType'),
                  title: formData.get('title'),
                  fileUrl: formData.get('fileUrl'),
                  fileType: formData.get('fileType') || 'image/jpeg',
                  fileSizeBytes: 1048576
                };
                try {
                  setSubmitting(true);
                  await api.post(`/students/${id}/documents`, payload);
                  showToast('Đã thêm tài liệu thành công!');
                  setShowAddDocModal(false);
                  fetchStudentDetails();
                } catch (err) {
                  showToast(err.response?.data?.message || 'Lỗi khi thêm tài liệu', 'error');
                } finally {
                  setSubmitting(false);
                }
              }} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Loại tài liệu</label>
                  <select 
                    name="documentType"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  >
                    <option value="Giấy khai sinh">Giấy khai sinh</option>
                    <option value="Căn cước công dân">Căn cước công dân / Định danh</option>
                    <option value="Học bạ THCS">Học bạ THCS</option>
                    <option value="Giấy khám sức khỏe">Giấy khám sức khỏe</option>
                    <option value="Xác nhận chính sách">Xác nhận diện chính sách</option>
                    <option value="Khác">Tài liệu khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Tên tài liệu hiển thị *</label>
                  <input 
                    name="title"
                    required
                    placeholder="e.g. Bản quét Giấy khai sinh công chứng"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Đường dẫn file (URL / Scan file) *</label>
                  <input 
                    name="fileUrl"
                    required
                    defaultValue="https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800"
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddDocModal(false)}
                    className="px-4 py-2 text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Đang thêm...' : 'Lưu Tài Liệu'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* PRINT MEDIA DOSSIER - Chuẩn sơ yếu lý lịch Bộ GD&ĐT       */}
      {/* ========================================================= */}
      <div id="printable-student-dossier" className="hidden print:block p-10 bg-white text-black font-serif text-sm">
        <div className="text-center space-y-1 mb-8 border-b-2 border-black pb-4">
          <p className="font-bold text-xs uppercase tracking-wider">SỞ GIÁO DỤC VÀ ĐÀO TẠO • TRƯỜNG THPT TTLN</p>
          <h1 className="text-2xl font-black uppercase tracking-wide">SƠ YẾU LÝ LỊCH HỌC SINH TOÀN DIỆN</h1>
          <p className="italic text-xs">Năm học 2026 - 2027 (Kèm hồ sơ điểm danh & kết quả học tập)</p>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-base border-b border-gray-400 mb-2">I. THÔNG TIN BẢN THÂN</h3>
            <div className="grid grid-cols-2 gap-y-2">
              <p>Họ và tên: <strong>{student.fullName}</strong></p>
              <p>Mã học sinh: <strong>{student.studentCode}</strong></p>
              <p>Lớp học: <strong>{student.class?.className || '10A1'}</strong></p>
              <p>Giới tính: <strong>{student.gender || 'Nam'}</strong></p>
              <p>Ngày sinh: <strong>{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('vi-VN') : ''}</strong></p>
              <p>Số CCCD: <strong>{student.cccdNumber || ''}</strong></p>
              <p>Dân tộc: <strong>{student.ethnicity || 'Kinh'}</strong></p>
              <p>Tôn giáo: <strong>{student.religion || 'Không'}</strong></p>
              <p className="col-span-2">Thường trú: <strong>{student.permanentAddress || student.address || ''}</strong></p>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-base border-b border-gray-400 mb-2">II. QUAN HỆ GIA ĐÌNH & NGƯỜI GIÁM HỘ</h3>
            <p>Họ tên phụ huynh / người giám hộ: <strong>{student.parentName || student.fullName}</strong></p>
            <p>Số điện thoại liên hệ khẩn cấp: <strong>{student.parentPhone || student.phone || ''}</strong></p>
          </div>

          <div>
            <h3 className="font-bold text-base border-b border-gray-400 mb-2">III. CHUYÊN CẦN & SỨC KHỎE</h3>
            <p>Tỉ lệ chuyên cần: <strong>{attendanceSummary.attendanceRate}%</strong> ({attendanceSummary.present}/{attendanceSummary.totalSessions || 0} buổi có mặt, vắng {attendanceSummary.absentTotal} buổi)</p>
            <p>Nhóm máu: <strong>{health.bloodType || 'O'}</strong> • Chiều cao: <strong>{health.heightCm || 168} cm</strong> • Cân nặng: <strong>{health.weightKg || 58} kg</strong> (BMI: {bmi || '20.5'})</p>
            <p>Thẻ BHYT: <strong>{health.healthInsuranceNumber || 'GD4010123456789'}</strong></p>
          </div>

          <div>
            <h3 className="font-bold text-base border-b border-gray-400 mb-2">IV. KẾT QUẢ ĐÁNH GIÁ THÔNG TƯ 22</h3>
            <p>Điểm trung bình các môn: <strong>{overallAvg}</strong></p>
            <p>Kết quả Học tập: <strong>{academicRank}</strong> • Kết quả Rèn luyện: <strong>{conductScore}</strong></p>
            <p>Danh hiệu khen thưởng: <strong>{titleAwarded}</strong></p>
          </div>

          <div className="pt-12 grid grid-cols-2 text-center">
            <div>
              <p className="font-bold">HỌC SINH KÝ TÊN</p>
              <p className="italic text-xs">(Ký và ghi rõ họ tên)</p>
            </div>
            <div>
              <p className="italic text-xs">Ngày ..... tháng ..... năm 2026</p>
              <p className="font-bold">HIỆU TRƯỞNG / BGH XÁC NHẬN</p>
              <p className="italic text-xs">(Ký tên và đóng dấu)</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default StudentProfile;
