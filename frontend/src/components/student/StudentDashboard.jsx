import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, 
  Calendar, 
  Clock, 
  UserCheck, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight, 
  Sparkles, 
  GraduationCap, 
  FileText, 
  Send, 
  Layers, 
  ChevronRight, 
  BookOpen, 
  TrendingUp, 
  ShieldAlert,
  BellRing,
  ExternalLink,
  HelpCircle,
  X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import api from '../../services/api';
import Swal from 'sweetalert2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const StudentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form đơn xin nghỉ học nhanh
  const [absenceForm, setAbsenceForm] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    session: 'all_day',
    reason: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/student/dashboard');
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải Dashboard học sinh:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAbsenceSubmit = async (e) => {
    e.preventDefault();
    if (!absenceForm.reason || absenceForm.reason.trim().length < 5) {
      Swal.fire({
        icon: 'warning',
        title: 'Thiếu thông tin',
        text: 'Vui lòng nhập lý do xin nghỉ chi tiết (tối thiểu 5 ký tự)',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/student/absences', absenceForm);
      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Gửi đơn thành công!',
          text: 'Đơn xin nghỉ học đã được chuyển đến Giáo viên chủ nhiệm phê duyệt.',
          confirmButtonColor: '#10b981'
        });
        setShowAbsenceModal(false);
        setAbsenceForm({
          fromDate: new Date().toISOString().split('T')[0],
          toDate: new Date().toISOString().split('T')[0],
          session: 'all_day',
          reason: ''
        });
        fetchDashboardData();
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi gửi đơn',
        text: err.response?.data?.message || 'Không thể gửi đơn xin nghỉ, vui lòng thử lại sau',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Cấu hình biểu đồ Biến động GPA
  const chartData = useMemo(() => {
    const defaultLabels = ['HK1 (25-26)', 'HK2 (25-26)', 'Cả Năm'];
    const trend = data?.gpaTrend || [];
    
    const labels = trend.length > 0 ? trend.map(t => t.semester) : defaultLabels;
    const scores = trend.length > 0 ? trend.map(t => t.gpa) : [8.2, 8.5, 8.4];

    return {
      labels,
      datasets: [
        {
          label: 'Điểm trung bình (GPA)',
          data: scores,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.12)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#2563eb',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }
      ]
    };
  }, [data?.gpaTrend]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { size: 13, weight: 'bold' },
        bodyFont: { size: 13 },
        padding: 10,
        cornerRadius: 8
      }
    },
    scales: {
      y: {
        min: 0,
        max: 10,
        ticks: { stepSize: 2, color: '#94a3b8' },
        grid: { color: 'rgba(148, 163, 184, 0.1)' }
      },
      x: {
        ticks: { color: '#94a3b8' },
        grid: { display: false }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Đang tải Cổng thông tin học sinh...</p>
      </div>
    );
  }

  const student = data?.student;
  const attendance = data?.attendanceWidget || {
    totalSessions: 0,
    totalMissed: 0,
    attendanceRate: 100,
    warningLevel: 'safe',
    warningMessage: 'Chuyên cần tốt'
  };

  // Tính phần trăm tiến trình nghỉ học trên mốc 45 buổi (cấm thi)
  const missedPercent = Math.min(100, Math.round((attendance.totalMissed / 45) * 100));

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner Chào Mừng & Thẻ Học Sinh */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 text-white p-6 sm:p-8 shadow-xl shadow-blue-900/20"
      >
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-12 w-60 h-60 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-blue-200">
              <Sparkles size={14} className="text-yellow-300" />
              <span>Cổng Thông Tin Học Sinh THPT</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Niên khóa 2026 - 2027</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Xin chào, {student?.fullName || 'Học sinh'}! 👋
            </h1>

            <p className="text-sm text-blue-100/90 max-w-xl leading-relaxed">
              Mã học sinh: <span className="font-bold text-white tracking-wider">{student?.studentCode}</span> • Lớp: <span className="font-bold text-white">{student?.className}</span>
              {student?.homeroomTeacher && (
                <span> • GVCN: <span className="font-semibold text-white">{student.homeroomTeacher.name} ({student.homeroomTeacher.phone})</span></span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => setShowAbsenceModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-900 font-bold text-sm shadow-lg hover:bg-blue-50 hover:shadow-xl transition-all duration-150 active:scale-95"
            >
              <Send size={16} className="text-blue-600" />
              Nộp Đơn Xin Nghỉ Học
            </button>

            <Link 
              to="/student/grades"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600/40 hover:bg-blue-600/60 backdrop-blur-md border border-white/20 text-white font-semibold text-sm transition-all duration-150"
            >
              <Award size={16} />
              Xem Học Bạ & Điểm
            </Link>
          </div>
        </div>
      </motion.div>

      {/* 2. Grid Bento Widgets Chính */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* WIDGET A: Cảnh Báo Chuyên Cần & Smart Progress Bar (5 Cột) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-2xl ${
                  attendance.warningLevel === 'banned' ? 'bg-rose-500 text-white' :
                  attendance.warningLevel === 'danger' ? 'bg-amber-500 text-white' :
                  attendance.warningLevel === 'warning' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                  'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                }`}>
                  <UserCheck size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 dark:text-white text-base">Cảnh Báo Chuyên Cần</h2>
                  <p className="text-xs text-slate-400">Theo Quy chế Đánh giá & Xếp loại BGDĐT</p>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
                attendance.warningLevel === 'banned' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                attendance.warningLevel === 'danger' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                attendance.warningLevel === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {attendance.warningLevel === 'banned' ? 'CẤM THI' :
                 attendance.warningLevel === 'danger' ? 'NGUY HIỂM' :
                 attendance.warningLevel === 'warning' ? 'CẢNH BÁO' : 'AN TOÀN'}
              </span>
            </div>

            {/* Thông số tổng quan */}
            <div className="grid grid-cols-3 gap-2.5 my-4 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Tỷ lệ có mặt</p>
                <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{attendance.attendanceRate}%</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Có phép</p>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{attendance.excusedCount || 0}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Tổng buổi nghỉ</p>
                <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{attendance.totalMissed}</p>
              </div>
            </div>

            {/* Smart Progress Bar với các mốc giới hạn */}
            <div className="space-y-2 mt-5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Tiến độ nghỉ: <span className="font-black text-slate-900 dark:text-white">{attendance.totalMissed}</span> / 45 buổi
                </span>
                <span className="text-slate-400">{missedPercent}% ngưỡng cấm thi</span>
              </div>

              {/* Progress Bar đa vạch */}
              <div className="relative w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
                {/* Vạch mốc 20 buổi (44.4%) */}
                <div className="absolute top-0 bottom-0 left-[44.4%] w-0.5 bg-amber-400/80 z-20" title="Mốc cảnh báo nguy hiểm: 20 buổi" />
                
                {/* Thanh tiến trình */}
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${missedPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full transition-all ${
                    attendance.warningLevel === 'banned' ? 'bg-gradient-to-r from-rose-500 to-red-600' :
                    attendance.warningLevel === 'danger' ? 'bg-gradient-to-r from-amber-500 to-rose-500' :
                    attendance.warningLevel === 'warning' ? 'bg-gradient-to-r from-blue-500 to-amber-500' :
                    'bg-gradient-to-r from-emerald-400 to-blue-500'
                  }`}
                />
              </div>

              {/* Chú thích các mốc */}
              <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                <span>0 buổi</span>
                <span className="text-amber-500 font-semibold">⚠️ 20 buổi (Nguy cơ)</span>
                <span className="text-rose-500 font-bold">⛔ 45 buổi (Cấm thi)</span>
              </div>
            </div>

            {/* Lời nhắn cảnh báo */}
            <div className={`mt-4 p-3 rounded-2xl text-xs flex items-start gap-2.5 ${
              attendance.warningLevel === 'banned' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200' :
              attendance.warningLevel === 'danger' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200' :
              'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 border border-slate-200/60'
            }`}>
              {attendance.warningLevel === 'danger' || attendance.warningLevel === 'banned' ? (
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              ) : (
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              )}
              <span className="leading-relaxed">{attendance.warningMessage}</span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Link 
              to="/student/attendance" 
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              Lịch sử chi tiết <ChevronRight size={14} />
            </Link>
            <button 
              onClick={() => setShowAbsenceModal(true)}
              className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 flex items-center gap-1"
            >
              Gửi đơn xin phép
            </button>
          </div>
        </motion.div>

        {/* WIDGET B: Lịch Học Hôm Nay (4 Cột) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Clock size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 dark:text-white text-base">Lịch Học Hôm Nay</h2>
                  <p className="text-xs text-slate-400">{data?.todaySchedule?.dayName || 'Hôm nay'}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                {data?.todaySchedule?.periods?.length || 0} tiết
              </span>
            </div>

            {/* Danh sách các tiết học */}
            <div className="space-y-2.5 mt-3">
              {data?.todaySchedule?.periods && data.todaySchedule.periods.length > 0 ? (
                data.todaySchedule.periods.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 hover:bg-indigo-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm">
                          {item.subject}
                        </p>
                        <p className="text-[11px] text-slate-400">{item.period}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                      Tiết {idx + 1}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <Calendar size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  Hôm nay không có lịch học hoặc là ngày nghỉ cuối tuần
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link 
              to="/student/schedule" 
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              Xem Thời Khóa Biểu Toàn Tuần <ChevronRight size={14} />
            </Link>
          </div>
        </motion.div>

        {/* WIDGET C: Biểu Đồ Biến Động GPA Qua Các Kỳ (3 Cột) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <TrendingUp size={18} />
                </div>
                <h2 className="font-bold text-slate-800 dark:text-white text-sm">Biến Động GPA</h2>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                Tăng trưởng
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mb-3">Điểm trung bình học kỳ</p>

            <div className="h-44 w-full">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Link 
              to="/student/grades" 
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Học bạ chi tiết <ChevronRight size={14} />
            </Link>
            <span className="text-[11px] text-slate-400 font-medium">Thang điểm 10</span>
          </div>
        </motion.div>
      </div>

      {/* 3. Hàng Chức Năng Nhanh & Thông Báo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Action: Đăng ký tổ hợp khối 10 */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="p-5 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-200/60 dark:border-indigo-900/40 flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
              <Layers size={20} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white text-base">Đăng Ký Tổ Hợp Môn Khối 10</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Chọn thứ tự ưu tiên NV1, NV2, NV3 cho các cụm chuyên đề tự chọn (KHTN, KHXH) năm học mới.
            </p>
          </div>
          <div className="mt-4 pt-3">
            <Link 
              to="/student/subject-combination" 
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all"
            >
              Đăng Ký Nguyện Vọng <ArrowUpRight size={14} />
            </Link>
          </div>
        </motion.div>

        {/* Quick Action: Phúc khảo điểm */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="p-5 rounded-3xl bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent border border-blue-200/60 dark:border-blue-900/40 flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/20">
              <Award size={20} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white text-base">Phúc Khảo & Đính Chính Điểm</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Gửi yêu cầu chấm lại cho các đầu điểm thường xuyên, giữa kỳ hoặc cuối kỳ trong đợt mở phúc khảo.
            </p>
          </div>
          <div className="mt-4 pt-3">
            <Link 
              to="/student/grades" 
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all"
            >
              Gửi Đơn Phúc Khảo <ArrowUpRight size={14} />
            </Link>
          </div>
        </motion.div>

        {/* Quick Action: Lịch thi học kỳ */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200/60 dark:border-emerald-900/40 flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20">
              <Calendar size={20} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white text-base">Lịch Thi & Phòng Thi</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tra cứu số báo danh (SBD), phòng thi, ca thi và thời gian thi học kỳ của khối và lớp học.
            </p>
          </div>
          <div className="mt-4 pt-3">
            <Link 
              to="/student/exams" 
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all"
            >
              Tra Cứu Lịch Thi <ArrowUpRight size={14} />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* MODAL NỘP ĐƠN XIN NGHỈ HỌC */}
      <AnimatePresence>
        {showAbsenceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                    <Send size={18} />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-lg">Đơn Xin Nghỉ Học Điện Tử</h3>
                </div>
                <button 
                  onClick={() => setShowAbsenceModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAbsenceSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Từ ngày</label>
                    <input 
                      type="date" 
                      required
                      value={absenceForm.fromDate}
                      onChange={(e) => setAbsenceForm({ ...absenceForm, fromDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Đến ngày</label>
                    <input 
                      type="date" 
                      required
                      value={absenceForm.toDate}
                      onChange={(e) => setAbsenceForm({ ...absenceForm, toDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Buổi nghỉ</label>
                  <select 
                    value={absenceForm.session}
                    onChange={(e) => setAbsenceForm({ ...absenceForm, session: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all_day">Cả ngày</option>
                    <option value="morning">Buổi sáng</option>
                    <option value="afternoon">Buổi chiều</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Lý do xin nghỉ <span className="text-rose-500">*</span>
                  </label>
                  <textarea 
                    rows={3}
                    required
                    placeholder="Nhập lý do chi tiết (ốm sốt, việc gia đình có phép...)"
                    value={absenceForm.reason}
                    onChange={(e) => setAbsenceForm({ ...absenceForm, reason: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 text-xs leading-relaxed">
                  💡 <strong>Quy trình phê duyệt:</strong> Đơn sẽ được gửi trực tiếp đến Giáo viên chủ nhiệm. Khi GVCN duyệt, hệ thống sẽ tự động cập nhật trạng thái <em>Có phép</em> trên sổ điểm danh lớp.
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowAbsenceModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 rounded-xl"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting ? 'Đang gửi...' : 'Gửi Đơn Cho GVCN'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentDashboard;
