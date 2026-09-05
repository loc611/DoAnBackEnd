import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Award, TrendingUp, Calendar, AlertCircle, CheckCircle2, ChevronRight, FileText, Lock, Sparkles, Clock } from 'lucide-react';
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
  const [studentInfo, setStudentInfo] = useState(null);
  const [gradesList, setGradesList] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('HK1_2026');

  useEffect(() => {
    fetchMyGrades();
  }, []);

  const fetchMyGrades = async () => {
    try {
      setLoading(true);
      const res = await api.get('/grades/my-grades');
      if (res.data) {
        setStudentInfo(res.data.student);
        setGradesList(res.data.grades || []);
      }
    } catch (err) {
      console.error('Error fetching student grades:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentGrade = useMemo(() => {
    return gradesList.find(g => g.semester === selectedSemester) || null;
  }, [gradesList, selectedSemester]);

  const isLocked = currentGrade?.status === 'locked';

  const subjects = [
    { key: 'math', name: 'Toán học', icon: '📐', credits: 4 },
    { key: 'literature', name: 'Ngữ văn', icon: '📖', credits: 4 },
    { key: 'english', name: 'Ngoại ngữ (Tiếng Anh)', icon: '🌍', credits: 3 },
    { key: 'physics', name: 'Vật lý', icon: '⚡', credits: 2 },
    { key: 'chemistry', name: 'Hóa học', icon: '🧪', credits: 2 },
    { key: 'it', name: 'Tin học', icon: '💻', credits: 2 }
  ];

  const { gpa, rank, rankColor } = useMemo(() => {
    if (!currentGrade || !isLocked) return { gpa: '—', rank: 'Đang cập nhật', rankColor: 'bg-slate-100 text-slate-600 border-slate-200' };
    const scores = [
      currentGrade.math || 0,
      currentGrade.literature || 0,
      currentGrade.english || 0,
      currentGrade.physics || 0,
      currentGrade.chemistry || 0,
      currentGrade.it || 0
    ];
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const gpaStr = avg.toFixed(2);
    let r = 'Chưa xếp loại';
    let color = 'bg-slate-100 text-slate-700';

    if (avg >= 8.0) {
      r = 'Học Lực Giỏi';
      color = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    } else if (avg >= 6.5) {
      r = 'Học Lực Khá';
      color = 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (avg >= 5.0) {
      r = 'Học Lực Trung Bình';
      color = 'bg-amber-100 text-amber-800 border-amber-200';
    } else if (avg > 0) {
      r = 'Học Lực Yếu';
      color = 'bg-rose-100 text-rose-800 border-rose-200';
    }

    return { gpa: gpaStr, rank: r, rankColor: color };
  }, [currentGrade, isLocked]);

  const barChartData = {
    labels: subjects.map(s => s.name),
    datasets: [
      {
        label: 'Điểm số',
        data: currentGrade && isLocked ? [
          currentGrade.math,
          currentGrade.literature,
          currentGrade.english,
          currentGrade.physics,
          currentGrade.chemistry,
          currentGrade.it
        ] : [0, 0, 0, 0, 0, 0],
        backgroundColor: [
          '#6366f1',
          '#3b82f6',
          '#10b981',
          '#f59e0b',
          '#ec4899',
          '#8b5cf6'
        ],
        borderRadius: 10
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 10,
        ticks: { stepSize: 2 }
      }
    },
    plugins: {
      legend: { display: false }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-indigo-700/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
              Sổ Điểm Điện Tử Cá Nhân
            </span>
            {isLocked ? (
              <span className="bg-emerald-500/30 border border-emerald-400/50 px-3 py-0.5 rounded-full text-xs font-bold text-emerald-200 flex items-center gap-1">
                <CheckCircle2 size={13} /> Đã công bố
              </span>
            ) : (
              <span className="bg-amber-500/30 border border-amber-400/50 px-3 py-0.5 rounded-full text-xs font-bold text-amber-200 flex items-center gap-1">
                <Clock size={13} /> Đang cập nhật (Chưa khóa)
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold mt-2 tracking-tight">{studentInfo?.fullName || 'Học sinh'}</h1>
          <p className="text-indigo-200 text-sm mt-1 font-medium">
            Mã HS: <strong className="text-white">{studentInfo?.studentCode}</strong> • Lớp: <strong className="text-white">{studentInfo?.class?.className || 'Chưa gán lớp'}</strong> • GVCN: <strong className="text-white">{studentInfo?.class?.homeroomTeacher?.fullName || 'Chưa cập nhật'}</strong>
          </p>
        </div>

        {/* Semester Select */}
        <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 flex items-center gap-2">
          <Calendar size={18} className="text-indigo-200 ml-2" />
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="bg-transparent text-white font-bold py-1 px-3 outline-none cursor-pointer text-sm"
          >
            {SEMESTERS.map(s => (
              <option key={s.id} value={s.id} className="text-slate-800 font-medium">{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Draft Notification if not locked */}
      {!isLocked && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-sm font-bold text-amber-900">Bảng điểm đang trong quá trình tổng hợp</h4>
            <p className="text-xs text-amber-700 mt-0.5 font-medium">
              Giáo viên bộ môn đang tiến hành nhập và đối soát điểm số cho học kỳ này. Điểm số chính thức sẽ hiển thị ngay khi Nhà trường khóa và công bố bảng điểm.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-2xl">
            <Award size={28} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Điểm Trung Bình (GPA)</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-0.5">{gpa} {isLocked && <span className="text-sm font-medium text-slate-400">/ 10</span>}</h3>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Xếp Loại Học Lực</p>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold mt-1 border ${rankColor}`}>
              {rank}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <BookOpen size={28} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Tổng Số Môn Đánh Giá</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{subjects.length} môn học</h3>
          </div>
        </div>
      </div>

      {/* Subject Score Breakdown & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Table breakdown */}
        <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
              <FileText size={18} className="text-indigo-600" />
              Chi tiết điểm từng môn học
            </h3>
            <span className="text-xs font-semibold text-slate-500">{selectedSemester}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {subjects.map(s => {
              const score = (currentGrade && isLocked) ? currentGrade[s.key] : null;
              const isPass = score !== null && score >= 5.0;
              return (
                <div key={s.key} className="p-4 flex items-center justify-between hover:bg-indigo-50/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{s.icon}</span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{s.name}</h4>
                      <p className="text-xs text-slate-400 font-medium">{s.credits} tiết / tuần</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`font-black text-base ${
                      score === null ? 'text-slate-400' :
                      score >= 8.0 ? 'text-emerald-600' :
                      score >= 6.5 ? 'text-indigo-600' :
                      score >= 5.0 ? 'text-amber-600' :
                      'text-rose-500'
                    }`}>
                      {score !== null ? score.toFixed(1) : '—'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      score === null ? 'bg-slate-100 text-slate-500' :
                      isPass ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {score === null ? 'Chờ công bố' : (isPass ? 'Đạt' : 'Chưa đạt')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart View */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-4 text-sm">Biểu đồ phổ điểm học tập</h3>
          <div className="flex-1 min-h-[260px] pb-4">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
          <p className="text-xs text-center text-slate-400 font-medium mt-auto">
            Dữ liệu điểm số được niêm phong chính thức bởi Nhà trường.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentGrades;
