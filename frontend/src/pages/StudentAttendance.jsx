import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserCheck, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  XCircle, 
  Clock3, 
  Sparkles, 
  Search, 
  Filter, 
  Send,
  FileText,
  Clock,
  X,
  ChevronRight
} from 'lucide-react';
import api from '../services/api';
import Swal from 'sweetalert2';

const StudentAttendance = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'requests'
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal nộp đơn xin nghỉ học
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [absenceForm, setAbsenceForm] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    session: 'all_day',
    reason: '',
    attachmentUrl: ''
  });

  useEffect(() => {
    fetchAttendanceSummary();
  }, []);

  const fetchAttendanceSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get('/student/attendance-summary');
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Lỗi tải thông tin chuyên cần:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAbsenceSubmit = async (e) => {
    e.preventDefault();
    if (!absenceForm.reason || absenceForm.reason.trim().length < 5) {
      Swal.fire({
        icon: 'warning',
        title: 'Thiếu lý do xin nghỉ',
        text: 'Vui lòng cung cấp lý do chi tiết (tối thiểu 5 ký tự)',
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
          text: 'Đơn xin nghỉ phép đã được chuyển tới Giáo viên chủ nhiệm để xem xét.',
          confirmButtonColor: '#10b981'
        });
        setShowAbsenceModal(false);
        setAbsenceForm({
          fromDate: new Date().toISOString().split('T')[0],
          toDate: new Date().toISOString().split('T')[0],
          session: 'all_day',
          reason: '',
          attachmentUrl: ''
        });
        fetchAttendanceSummary();
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi gửi đơn',
        text: err.response?.data?.message || 'Có lỗi xảy ra khi nộp đơn',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const stats = data?.stats || {
    totalSessions: 0,
    presentCount: 0,
    lateCount: 0,
    excusedCount: 0,
    unexcusedCount: 0,
    totalMissed: 0,
    attendanceRate: 100,
    warningLevel: 'safe',
    warningMessage: 'Chuyên cần tốt'
  };

  const historyList = useMemo(() => {
    if (!data?.history) return [];
    return data.history.filter(item => {
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchSearch = !searchTerm || item.date.includes(searchTerm) || (item.note && item.note.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [data, statusFilter, searchTerm]);

  const absenceRequests = data?.absenceRequests || [];

  // Tính phần trăm tiến trình nghỉ học trên mốc 45 buổi
  const missedPercent = Math.min(100, Math.round((stats.totalMissed / 45) * 100));

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 size={12} /> Có mặt
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
            <Clock3 size={12} /> Đi muộn
          </span>
        );
      case 'excused':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
            <CheckCircle2 size={12} /> Có phép
          </span>
        );
      case 'unexcused':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
            <XCircle size={12} /> Không phép
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-bold">
            <UserCheck size={14} />
            <span>Theo Dõi Nền Nếp & Chuyên Cần</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            Chuyên Cần & Điểm Danh (Attendance Tracking)
          </h1>
          <p className="text-xs text-slate-400">
            Theo dõi chi tiết từng tiết học, cảnh báo nguy cơ cấm thi và nộp đơn xin nghỉ phép điện tử.
          </p>
        </div>

        <button 
          onClick={() => setShowAbsenceModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all active:scale-95"
        >
          <Send size={15} />
          Nộp Đơn Xin Nghỉ Học
        </button>
      </div>

      {/* 2. CẢNH BÁO TIẾN TRÌNH NGHỈ HỌC (SMART PROGRESS BAR) */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${
              stats.warningLevel === 'banned' ? 'bg-rose-500 text-white' :
              stats.warningLevel === 'danger' ? 'bg-amber-500 text-white' :
              stats.warningLevel === 'warning' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
              'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
            }`}>
              <UserCheck size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">
                Thanh Cảnh Báo Chuyên Cần & Giới Hạn Cấm Thi
              </h3>
              <p className="text-xs text-slate-400">
                Quy chế: Nghỉ quá 45 buổi bị cấm thi học kỳ. Mức cảnh báo nguy hiểm: 20 buổi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              stats.warningLevel === 'banned' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
              stats.warningLevel === 'danger' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
              stats.warningLevel === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
              'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              {stats.warningLevel === 'banned' ? 'CẤM THI HỌC KỲ' :
               stats.warningLevel === 'danger' ? 'CẢNH BÁO NGUY HIỂM' :
               stats.warningLevel === 'warning' ? 'TIỆM CẬN NGUY HIỂM' : 'AN TOÀN'}
            </span>
          </div>
        </div>

        {/* Thanh Progress Bar */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-700 dark:text-slate-300">
              Đã nghỉ: <span className="font-black text-slate-900 dark:text-white">{stats.totalMissed}</span> buổi ({stats.excusedCount} có phép, {stats.unexcusedCount} không phép)
            </span>
            <span className="text-slate-400 font-bold">{missedPercent}% ngưỡng cấm thi</span>
          </div>

          <div className="relative w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/80 dark:border-slate-700">
            {/* Vạch mốc 20 buổi (44.4%) */}
            <div className="absolute top-0 bottom-0 left-[44.4%] w-0.5 bg-amber-500 z-20 shadow-sm" title="Mốc 20 buổi: Nguy cơ cấm thi" />
            
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${missedPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full transition-all ${
                stats.warningLevel === 'banned' ? 'bg-gradient-to-r from-rose-500 to-red-600' :
                stats.warningLevel === 'danger' ? 'bg-gradient-to-r from-amber-500 to-rose-500' :
                stats.warningLevel === 'warning' ? 'bg-gradient-to-r from-blue-500 to-amber-500' :
                'bg-gradient-to-r from-emerald-400 to-blue-500'
              }`}
            />
          </div>

          <div className="flex justify-between text-[11px] text-slate-400 font-medium">
            <span>0 buổi</span>
            <span className="text-amber-500 font-bold">⚠️ Mốc 20 buổi (Cảnh báo khẩn cấp)</span>
            <span className="text-rose-500 font-bold">⛔ Mốc 45 buổi (Cấm thi toàn bộ)</span>
          </div>
        </div>

        {/* Lời nhắn cảnh báo */}
        <div className={`p-3 rounded-2xl text-xs flex items-center gap-2.5 ${
          stats.warningLevel === 'banned' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200' :
          stats.warningLevel === 'danger' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200' :
          'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 border border-slate-200/60'
        }`}>
          {stats.warningLevel === 'danger' || stats.warningLevel === 'banned' ? (
            <AlertTriangle size={18} className="shrink-0 text-rose-600" />
          ) : (
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          )}
          <span>{stats.warningMessage}</span>
        </div>
      </motion.div>

      {/* 3. 4 Thẻ Bento Thống Kê Nhanh */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tỷ lệ chuyên cần</p>
          <h2 className="text-3xl font-black text-blue-600 dark:text-blue-400">{stats.attendanceRate}%</h2>
          <p className="text-[11px] text-slate-400">Trên tổng {stats.totalSessions} tiết đã học</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Có mặt đúng giờ</p>
          <h2 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats.presentCount}</h2>
          <p className="text-[11px] text-slate-400">Số tiết có mặt đầy đủ</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nghỉ có phép</p>
          <h2 className="text-3xl font-black text-blue-500">{stats.excusedCount}</h2>
          <p className="text-[11px] text-slate-400">Đã được GVCN duyệt đơn</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nghỉ không phép / Muộn</p>
          <h2 className="text-3xl font-black text-rose-600 dark:text-rose-400">{stats.unexcusedCount} / {stats.lateCount}</h2>
          <p className="text-[11px] text-slate-400">Vắng không phép / Đi muộn</p>
        </div>
      </div>

      {/* 4. Tabs Chuyển đổi giữa Lịch sử Điểm danh & Đơn Nghỉ Học */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative ${
            activeTab === 'history'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Lịch Sử Điểm Danh Từng Tiết
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
            activeTab === 'requests'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Đơn Xin Nghỉ Học Điện Tử
          {absenceRequests.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
              {absenceRequests.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'history' ? (
        /* BẢNG LỊCH SỬ ĐIỂM DANH */
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Thanh công cụ lọc */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Lọc trạng thái:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {['all', 'present', 'late', 'excused', 'unexcused'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      statusFilter === st
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'all' ? 'Tất cả' :
                     st === 'present' ? 'Có mặt' :
                     st === 'late' ? 'Đi muộn' :
                     st === 'excused' ? 'Có phép' : 'Không phép'}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Tìm ngày hoặc ghi chú..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200/60 dark:border-slate-800">
                  <th className="py-3.5 px-4">Ngày học</th>
                  <th className="py-3.5 px-4">Tiết / Buổi</th>
                  <th className="py-3.5 px-4">Môn học</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4">Ghi chú từ giáo viên</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {historyList.length > 0 ? (
                  historyList.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-white">
                        {item.date}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-300">
                        {item.periodName} ({item.session})
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {item.subjectName}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 italic">
                        {item.note || '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      Không có bản ghi điểm danh nào phù hợp với bộ lọc
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TAB: ĐƠN XIN NGHỈ HỌC ĐÃ NỘP */
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Lịch Sử Đơn Xin Nghỉ Học</h3>
              <p className="text-xs text-slate-400">Các đơn xin nghỉ gửi đến Giáo viên chủ nhiệm</p>
            </div>
            <button 
              onClick={() => setShowAbsenceModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700"
            >
              + Tạo Đơn Mới
            </button>
          </div>

          {absenceRequests.length > 0 ? (
            <div className="space-y-3">
              {absenceRequests.map(ar => (
                <div key={ar.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-white text-sm">
                        Từ {ar.fromDate} đến {ar.toDate} ({ar.session})
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ar.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        ar.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ar.status === 'APPROVED' ? 'Đã duyệt (Có phép)' :
                         ar.status === 'REJECTED' ? 'Từ chối' : 'Chờ GVCN duyệt'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Lý do: <span className="italic">{ar.reason}</span></p>
                    {ar.reviewNote && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Phản hồi của GVCN: {ar.reviewNote}</p>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400 shrink-0">
                    Nộp lúc: {new Date(ar.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              <FileText size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              Bạn chưa có đơn xin nghỉ phép nào được tạo.
            </div>
          )}
        </div>
      )}

      {/* MODAL NỘP ĐƠN NGHỈ PHÉP */}
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
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
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
                    Lý do xin nghỉ học <span className="text-rose-500">*</span>
                  </label>
                  <textarea 
                    rows={3}
                    required
                    placeholder="Nhập lý do chi tiết (ốm sốt, khám chữa bệnh, việc gia đình có xác nhận...)"
                    value={absenceForm.reason}
                    onChange={(e) => setAbsenceForm({ ...absenceForm, reason: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Đường dẫn ảnh/đơn viết tay (nếu có)
                  </label>
                  <input 
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={absenceForm.attachmentUrl}
                    onChange={(e) => setAbsenceForm({ ...absenceForm, attachmentUrl: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 text-xs leading-relaxed">
                  💡 <strong>Quy trình phê duyệt:</strong> Khi GVCN duyệt đơn, điểm danh của các ngày này sẽ tự động chuyển thành trạng thái <em>Có phép</em>.
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

export default StudentAttendance;
