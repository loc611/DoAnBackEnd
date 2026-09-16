import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, Award, TrendingUp, Calendar, AlertCircle, CheckCircle2, 
  ChevronRight, FileText, Lock, Sparkles, Clock, Printer, User, Star 
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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const SEMESTERS = [
  { id: 'HK1_2026', name: 'Học kỳ 1 (2025 - 2026)' },
  { id: 'HK2_2026', name: 'Học kỳ 2 (2025 - 2026)' },
  { id: 'CN_2026', name: 'Cả năm (2025 - 2026)' }
];

const StudentGrades = () => {
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState('HK1_2026');
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    fetchMyGrades(selectedSemester);
  }, [selectedSemester]);

  const fetchMyGrades = async (semester) => {
    try {
      setLoading(true);
      const res = await api.get(`/grades/my-grades?semester=${semester}`);
      if (res.data?.success) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải kết quả học tập:', err);
    } finally {
      setLoading(false);
    }
  };

  const student = reportData?.student || {};
  const summary = reportData?.summary || {};
  const subjectGrades = reportData?.subjectGrades || [];
  const isPublished = reportData?.isPublished;

  // Lọc các môn tính điểm để vẽ biểu đồ
  const scoredSubjects = useMemo(() => {
    return subjectGrades.filter(s => s.avgScore !== null && !isNaN(s.avgScore));
  }, [subjectGrades]);

  const barChartData = {
    labels: scoredSubjects.map(s => s.subjectName || s.subjectCode),
    datasets: [
      {
        label: 'Điểm trung bình môn (ĐTBmhk)',
        data: scoredSubjects.map(s => parseFloat(s.avgScore)),
        backgroundColor: scoredSubjects.map(s => {
          const score = parseFloat(s.avgScore);
          if (score >= 8.0) return 'rgba(16, 185, 129, 0.85)';
          if (score >= 6.5) return 'rgba(59, 130, 246, 0.85)';
          if (score >= 5.0) return 'rgba(245, 158, 11, 0.85)';
          return 'rgba(239, 68, 68, 0.85)';
        }),
        borderRadius: 8,
        borderWidth: 0
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` Điểm TB: ${context.raw} / 10`
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 10,
        ticks: { stepSize: 2 }
      },
      x: {
        grid: { display: false }
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md flex items-center gap-1.5 border border-white/20">
              <Sparkles size={13} className="text-amber-300" />
              Sổ Điểm Điện Tử • Chuẩn Thông Tư 22
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isPublished ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {isPublished ? 'Đã công bố chính thức' : 'Bản dự kiến / Đang cập nhật'}
            </span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">Kết Quả Học Tập & Rèn Luyện</h1>
          <p className="text-slate-300 mt-1 text-sm font-medium">
            Học sinh: <strong className="text-white font-bold">{student.fullName}</strong> • Mã HS: <strong className="text-blue-300 font-mono">{student.studentCode}</strong> • Lớp: <strong className="text-white">{student.className}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-400 backdrop-blur-md cursor-pointer"
          >
            {SEMESTERS.map(s => (
              <option key={s.id} value={s.id} className="text-slate-900">{s.name}</option>
            ))}
          </select>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-slate-900 font-bold rounded-xl text-sm hover:bg-slate-100 transition-all shadow-md cursor-pointer"
          >
            <Printer size={16} /> In Phiếu Điểm
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          Đang nạp phiếu điểm Thông tư 22...
        </div>
      ) : (
        <>
          {/* Thẻ Tổng kết Xếp loại Thông tư 22 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Điểm TB các môn */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Điểm TB Các Môn (ĐTB)</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                  {summary.overallAvgScore !== null ? summary.overallAvgScore : '—'}
                </span>
                <span className="text-xs text-slate-400 font-medium">/ 10</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Tính từ các môn đánh giá bằng điểm</p>
            </div>

            {/* Kết quả Học tập */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kết quả Học tập</p>
              <div className="mt-2">
                <span className={`inline-block px-3 py-1 rounded-xl text-base font-extrabold ${
                  summary.academicRank === 'Tốt' || summary.academicRank === 'Xuất sắc'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : summary.academicRank === 'Khá'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      : summary.academicRank === 'Đạt'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {summary.academicRank || 'Chưa xếp loại'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Tiêu chí Điều 9 Thông tư 22</p>
            </div>

            {/* Kết quả Rèn luyện */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kết quả Rèn luyện</p>
              <div className="mt-2">
                <span className={`inline-block px-3 py-1 rounded-xl text-base font-extrabold ${
                  summary.conductScore === 'Tốt'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : summary.conductScore === 'Khá'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                }`}>
                  {summary.conductScore || 'Tốt'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Đánh giá bởi GVCN: {student.homeroomTeacher || 'Chưa rõ'}</p>
            </div>

            {/* Danh hiệu khen thưởng */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 p-5 rounded-2xl border border-amber-200/60 dark:border-slate-700 shadow-xs">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Award size={14} /> Danh Hiệu Thi Đua
              </p>
              <div className="mt-2">
                {summary.titleAwarded ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-black bg-amber-400 text-slate-950 shadow-xs">
                    <Star size={14} className="fill-slate-950" /> {summary.titleAwarded}
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-slate-500 italic">Không có danh hiệu</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">Khen thưởng theo Điều 15 TT 22</p>
            </div>
          </div>

          {/* Biểu đồ phân phối điểm số */}
          {scoredSubjects.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-600" />
                Biểu Đồ Kết Quả Điểm Số Các Môn Học
              </h3>
              <div className="h-56 w-full">
                <Bar data={barChartData} options={barChartOptions} />
              </div>
            </div>
          )}

          {/* Bảng chi tiết toàn bộ các môn học theo Thông tư 22 */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Bảng Điểm Chi Tiết Môn Học</h2>
                <p className="text-xs text-slate-500 mt-0.5">Bao gồm ĐĐG thường xuyên, ĐĐG giữa kỳ và ĐĐG cuối kỳ</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 uppercase border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-center w-12" rowSpan={2}>STT</th>
                    <th className="px-4 py-3 min-w-[180px]" rowSpan={2}>Môn Học</th>
                    <th className="px-4 py-3 min-w-[150px]" rowSpan={2}>Giáo viên giảng dạy</th>
                    <th className="px-4 py-2 text-center border-b border-slate-200 dark:border-slate-700" colSpan={4}>ĐĐG Thường xuyên</th>
                    <th className="px-4 py-2 text-center border-b border-slate-200 dark:border-slate-700 w-24">ĐĐG GK (x2)</th>
                    <th className="px-4 py-2 text-center border-b border-slate-200 dark:border-slate-700 w-24">ĐĐG CK (x3)</th>
                    <th className="px-4 py-3 text-center w-28 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400" rowSpan={2}>
                      ĐTB Môn / Đánh Giá
                    </th>
                    <th className="px-4 py-3 min-w-[200px]" rowSpan={2}>Nhận xét của Giáo viên</th>
                  </tr>
                  <tr>
                    <th className="px-2 py-1.5 text-center text-slate-500 w-14">TX1</th>
                    <th className="px-2 py-1.5 text-center text-slate-500 w-14">TX2</th>
                    <th className="px-2 py-1.5 text-center text-slate-500 w-14">TX3</th>
                    <th className="px-2 py-1.5 text-center text-slate-500 w-14">TX4</th>
                    <th className="px-2 py-1.5 text-center text-slate-500 w-24">Giữa kỳ</th>
                    <th className="px-2 py-1.5 text-center text-slate-500 w-24">Cuối kỳ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {subjectGrades.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-500">
                        Chưa có dữ liệu điểm môn học cho học kỳ này.
                      </td>
                    </tr>
                  ) : (
                    subjectGrades.map((sg, idx) => (
                      <tr key={sg.subjectId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                          {sg.subjectName || sg.subjectCode}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                          {sg.teacherName}
                        </td>

                        {sg.assessmentType === 'feedback' ? (
                          <td colSpan={6} className="px-4 py-3.5 text-center font-bold text-slate-500 italic">
                            Môn học đánh giá bằng nhận xét
                          </td>
                        ) : (
                          <>
                            <td className="px-2 py-3.5 text-center font-medium text-slate-700 dark:text-slate-300">{sg.tx1 ?? '—'}</td>
                            <td className="px-2 py-3.5 text-center font-medium text-slate-700 dark:text-slate-300">{sg.tx2 ?? '—'}</td>
                            <td className="px-2 py-3.5 text-center font-medium text-slate-700 dark:text-slate-300">{sg.tx3 ?? '—'}</td>
                            <td className="px-2 py-3.5 text-center font-medium text-slate-700 dark:text-slate-300">{sg.tx4 ?? '—'}</td>
                            <td className="px-2 py-3.5 text-center font-bold text-indigo-600 dark:text-indigo-400">{sg.gk ?? '—'}</td>
                            <td className="px-2 py-3.5 text-center font-bold text-purple-600 dark:text-purple-400">{sg.ck ?? '—'}</td>
                          </>
                        )}

                        {/* Điểm TB hoặc Đạt / Chưa đạt */}
                        <td className="px-4 py-3.5 text-center bg-blue-50/30 dark:bg-blue-950/10">
                          {sg.assessmentType === 'feedback' ? (
                            <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${
                              sg.feedbackResult === 'Đ' 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : sg.feedbackResult === 'CĐ'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                                  : 'text-slate-400'
                            }`}>
                              {sg.feedbackResult ? (sg.feedbackResult === 'Đ' ? 'Đạt' : 'Chưa đạt') : 'Chưa đánh giá'}
                            </span>
                          ) : (
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                              sg.avgScore === null 
                                ? 'text-slate-400' 
                                : parseFloat(sg.avgScore) >= 8.0 
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                  : parseFloat(sg.avgScore) >= 6.5
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                    : parseFloat(sg.avgScore) >= 5.0
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                            }`}>
                              {sg.avgScore !== null ? sg.avgScore : '—'}
                            </span>
                          )}
                        </td>

                        {/* Nhận xét */}
                        <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300 italic">
                          {sg.teacherRemark || 'Chưa có nhận xét'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Nhận xét chung của GVCN */}
          {summary.teacherRemark && (
            <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Ý kiến nhận xét của Giáo viên chủ nhiệm
              </h4>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                "{summary.teacherRemark}"
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentGrades;
