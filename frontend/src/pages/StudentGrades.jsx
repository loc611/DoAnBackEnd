import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Award, 
  TrendingUp, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  FileText, 
  Sparkles, 
  Clock, 
  Send, 
  ShieldCheck, 
  RefreshCw, 
  ArrowRight,
  ExternalLink,
  X,
  HelpCircle
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import api from '../services/api';
import Swal from 'sweetalert2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const SEMESTERS = [
  { id: 'HK1_2026', name: 'Học kỳ 1 (2025 - 2026)' },
  { id: 'HK2_2026', name: 'Học kỳ 2 (2025 - 2026)' },
  { id: 'CN_2026', name: 'Cả năm (2025 - 2026)' }
];

const StudentGrades = () => {
  const [loading, setLoading] = useState(true);
  const [gradeData, setGradeData] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState('HK1_2026');
  const [activeTab, setActiveTab] = useState('transcript'); // 'transcript' | 'reviews'

  // Modal Phúc khảo điểm
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewList, setReviewList] = useState([]);
  const [reviewForm, setReviewForm] = useState({
    subjectGradeDetailId: '',
    scoreComponent: 'gk', // 'tx' | 'gk' | 'ck'
    expectedScore: '',
    reason: '',
    evidenceUrl: ''
  });

  useEffect(() => {
    fetchGrades();
    fetchReviews();
  }, [selectedSemester]);

  const fetchGrades = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/student/grades?semester=${selectedSemester}`);
      if (res.data?.success) {
        setGradeData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching student grades:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await api.get('/student/grade-reviews');
      if (res.data?.success) {
        setReviewList(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  const subjects = gradeData?.subjects || [];

  const handleOpenReviewModal = (subjectItem, defaultComponent = 'gk') => {
    setReviewForm({
      subjectGradeDetailId: subjectItem?.id || '',
      subjectName: subjectItem?.subjectName || '',
      scoreComponent: defaultComponent,
      expectedScore: '',
      reason: '',
      evidenceUrl: ''
    });
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.reason || reviewForm.reason.trim().length < 10) {
      Swal.fire({
        icon: 'warning',
        title: 'Lý do chưa đủ chi tiết',
        text: 'Vui lòng giải trình rõ ràng lý do gửi phúc khảo (tối thiểu 10 ký tự)',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    try {
      setSubmittingReview(true);
      const res = await api.post('/student/grade-reviews', {
        subjectGradeDetailId: reviewForm.subjectGradeDetailId,
        scoreComponent: reviewForm.scoreComponent,
        expectedScore: reviewForm.expectedScore ? parseFloat(reviewForm.expectedScore) : null,
        reason: reviewForm.reason,
        evidenceUrl: reviewForm.evidenceUrl
      });

      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Gửi yêu cầu phúc khảo thành công!',
          text: res.data.message || 'Nhà trường sẽ chấm lại và phản hồi trong thời gian quy định.',
          confirmButtonColor: '#10b981'
        });
        setShowReviewModal(false);
        fetchReviews();
        fetchGrades();
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Không thể gửi đơn',
        text: err.response?.data?.message || 'Có lỗi xảy ra khi nộp đơn phúc khảo',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const barChartData = {
    labels: subjects.map(s => s.subjectName),
    datasets: [
      {
        label: 'Điểm TB Môn (ĐTBm)',
        data: subjects.map(s => s.averageScore || 0),
        backgroundColor: subjects.map(s => {
          const score = s.averageScore || 0;
          if (score >= 8.0) return 'rgba(16, 185, 129, 0.85)';
          if (score >= 6.5) return 'rgba(59, 130, 246, 0.85)';
          if (score >= 5.0) return 'rgba(245, 158, 11, 0.85)';
          return 'rgba(239, 68, 68, 0.85)';
        }),
        borderRadius: 8
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { size: 13, weight: 'bold' }
      }
    },
    scales: {
      y: { min: 0, max: 10, ticks: { stepSize: 2 } }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-bold">
            <Award size={14} />
            <span>Học Bạ Điện Tử & Bảng Điểm Cá Nhân</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            Kết Quả Học Tập (Academic Results)
          </h1>
          <p className="text-xs text-slate-400">
            Hiển thị chuẩn theo Thông tư 22/2021/TT-BGDĐT: ĐGtx, ĐGgk, ĐGck và ĐTBm.
          </p>
        </div>

        {/* Bộ lọc học kỳ */}
        <div className="flex items-center gap-2">
          <select 
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SEMESTERS.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('transcript')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative ${
            activeTab === 'transcript'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Bảng Điểm Chi Tiết
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
            activeTab === 'reviews'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Đơn Phúc Khảo Điểm
          {reviewList.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
              {reviewList.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'transcript' ? (
        <>
          {/* Card Thống kê GPA & Xếp loại */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/20 space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-200">Điểm Trung Bình (GPA)</p>
              <h2 className="text-3xl font-black">{gradeData?.gpa || '—'}</h2>
              <p className="text-[11px] text-blue-100">Tính theo trung bình có trọng số các môn học</p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Xếp Loại Học Lực</p>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-black ${
                  gradeData?.academicRank === 'Giỏi' ? 'text-emerald-600' :
                  gradeData?.academicRank === 'Khá' ? 'text-blue-600' :
                  gradeData?.academicRank === 'Trung bình' ? 'text-amber-600' : 'text-slate-700 dark:text-slate-200'
                }`}>
                  {gradeData?.academicRank || 'Đang cập nhật'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Tiêu chuẩn Quy chế 22 - Bộ GD&ĐT</p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Tổng Số Môn Đã Chấm</p>
              <h2 className="text-3xl font-black text-slate-800 dark:text-white">
                {subjects.filter(s => s.averageScore > 0).length} / {subjects.length}
              </h2>
              <p className="text-[11px] text-slate-400">Số tín chỉ / môn bắt buộc & tự chọn</p>
            </div>
          </div>

          {/* BẢNG ĐIỂM CHI TIẾT CÁC MÔN */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">Bảng Điểm Từng Môn Học</h3>
                <p className="text-xs text-slate-400">Bấm nút "Phúc khảo" nếu bạn có thắc mắc hoặc cần chấm lại bài thi</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200/60 dark:border-slate-800">
                    <th className="py-3.5 px-4">Môn học</th>
                    <th className="py-3.5 px-4 text-center">Tín chỉ</th>
                    <th className="py-3.5 px-4 text-center">ĐG Thường Xuyên (ĐGtx)</th>
                    <th className="py-3.5 px-4 text-center">Giữa Kỳ (ĐGgk)</th>
                    <th className="py-3.5 px-4 text-center">Cuối Kỳ (ĐGck)</th>
                    <th className="py-3.5 px-4 text-center">ĐTB Môn</th>
                    <th className="py-3.5 px-4 text-center">Ghi chú & Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {subjects.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-white text-sm">
                            {item.subjectName}
                          </span>
                          {item.isTransferred && (
                            <span 
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60"
                              title="Điểm chuyển tiếp từ trường cũ"
                            >
                              Chuyển trường
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">{item.subjectCode}</span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-semibold text-slate-600 dark:text-slate-300">
                        {item.credits || 2}
                      </td>

                      {/* ĐGtx */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {item.regularScores && item.regularScores.length > 0 ? (
                            item.regularScores.map((score, sIdx) => (
                              <span key={sIdx} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200">
                                {score}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </div>
                      </td>

                      {/* ĐGgk */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-white text-sm">
                        {item.midtermScore !== null && item.midtermScore !== undefined ? item.midtermScore : '—'}
                      </td>

                      {/* ĐGck */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-white text-sm">
                        {item.finalScore !== null && item.finalScore !== undefined ? item.finalScore : '—'}
                      </td>

                      {/* ĐTBm */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                          item.averageScore >= 8.0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' :
                          item.averageScore >= 6.5 ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' :
                          item.averageScore >= 5.0 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' :
                          item.averageScore > 0 ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' :
                          'text-slate-400'
                        }`}>
                          {item.averageScore !== null && item.averageScore !== undefined ? item.averageScore : '—'}
                        </span>
                      </td>

                      {/* Thao tác / Phúc khảo */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {item.reviewStatus ? (
                            <span className={`px-2 py-1 rounded-lg text-[11px] font-bold ${
                              item.reviewStatus === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                              item.reviewStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              Phúc khảo: {item.reviewStatus}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOpenReviewModal(item)}
                              className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-xs font-bold transition-all"
                            >
                              Phúc khảo
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Biểu đồ so sánh các môn */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              Biểu Đồ Phân Bổ Điểm Trung Bình Từng Môn (ĐTBm)
            </h3>
            <div className="h-64 w-full">
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          </div>
        </>
      ) : (
        /* TAB: LỊCH SỬ ĐƠN PHÚC KHẢO */
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Danh Sách Yêu Cầu Phúc Khảo Đã Gửi</h3>
              <p className="text-xs text-slate-400">Theo dõi tiến độ xem xét và kết quả chấm lại bài thi</p>
            </div>
          </div>

          {reviewList.length > 0 ? (
            <div className="space-y-3">
              {reviewList.map(r => (
                <div key={r.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-white text-sm">{r.subjectName}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        {r.scoreComponent}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Điểm hiện tại: <span className="font-bold">{r.currentScore}</span> {r.expectedScore && <span>• Kỳ vọng: <span className="font-bold text-emerald-600">{r.expectedScore}</span></span>}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic">"Lý do: {r.reason}"</p>
                    {r.responseNote && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Phản hồi từ GV/BGH: {r.responseNote}</p>
                    )}
                  </div>

                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      r.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                      r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      r.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {r.status === 'PENDING' ? 'Chờ duyệt' :
                       r.status === 'APPROVED' ? 'Chấp thuận (Đã đổi điểm)' :
                       r.status === 'REJECTED' ? 'Từ chối' : r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              <FileText size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              Bạn chưa gửi yêu cầu phúc khảo nào trong học kỳ này.
            </div>
          )}
        </div>
      )}

      {/* MODAL GỬI ĐƠN PHÚC KHẢO ĐIỂM */}
      <AnimatePresence>
        {showReviewModal && (
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
                    <Award size={18} />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-lg">
                    Đơn Phúc Khảo Điểm - {reviewForm.subjectName}
                  </h3>
                </div>
                <button 
                  onClick={() => setShowReviewModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Đầu điểm cần chấm lại
                  </label>
                  <select 
                    value={reviewForm.scoreComponent}
                    onChange={(e) => setReviewForm({ ...reviewForm, scoreComponent: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="gk">Điểm Đánh giá Giữa kỳ (ĐGgk)</option>
                    <option value="ck">Điểm Đánh giá Cuối kỳ (ĐGck)</option>
                    <option value="tx">Điểm Đánh giá Thường xuyên (ĐGtx)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Điểm số bạn kỳ vọng (ước lượng)
                  </label>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    max="10"
                    placeholder="Ví dụ: 8.5"
                    value={reviewForm.expectedScore}
                    onChange={(e) => setReviewForm({ ...reviewForm, expectedScore: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Lý do giải trình chi tiết <span className="text-rose-500">*</span>
                  </label>
                  <textarea 
                    rows={3}
                    required
                    placeholder="Mô tả cụ thể câu hỏi hoặc phần bài thi bạn cho rằng có sự chênh lệch điểm số..."
                    value={reviewForm.reason}
                    onChange={(e) => setReviewForm({ ...reviewForm, reason: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Link minh chứng hoặc ảnh bài làm (Google Drive / Ảnh đính kèm nếu có)
                  </label>
                  <input 
                    type="url" 
                    placeholder="https://drive.google.com/..."
                    value={reviewForm.evidenceUrl}
                    onChange={(e) => setReviewForm({ ...reviewForm, evidenceUrl: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
                  ⚠️ <strong>Lưu ý:</strong> Hội đồng chấm phúc khảo sẽ rút bài thi gốc và đối chiếu lại barem điểm. Điểm phúc khảo có thể tăng, giữ nguyên hoặc giảm tùy theo kết quả chấm lại thực tế.
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 rounded-xl"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit"
                    disabled={submittingReview}
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2"
                  >
                    {submittingReview ? 'Đang gửi...' : 'Nộp Đơn Phúc Khảo'}
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

export default StudentGrades;
