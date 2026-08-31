import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Award, TrendingUp, Calendar, AlertCircle, CheckCircle2, ChevronRight, FileText } from 'lucide-react';
import { Bar, Radar } from 'react-chartjs-2';
import api from '../services/api';

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

  const subjects = [
    { key: 'math', name: 'Toán học', icon: '📐', credits: 4 },
    { key: 'literature', name: 'Ngữ văn', icon: '📖', credits: 4 },
    { key: 'english', name: 'Ngoại ngữ (Tiếng Anh)', icon: '🌍', credits: 3 },
    { key: 'physics', name: 'Vật lý', icon: '⚡', credits: 2 },
    { key: 'chemistry', name: 'Hóa học', icon: '🧪', credits: 2 },
    { key: 'it', name: 'Tin học', icon: '💻', credits: 2 }
  ];

  const { gpa, rank, rankColor } = useMemo(() => {
    if (!currentGrade) return { gpa: '0.00', rank: 'Chưa có', rankColor: 'bg-gray-100 text-gray-700' };
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
    let color = 'bg-gray-100 text-gray-700';

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
      color = 'bg-red-100 text-red-800 border-red-200';
    }

    return { gpa: gpaStr, rank: r, rankColor: color };
  }, [currentGrade]);

  const barChartData = {
    labels: subjects.map(s => s.name),
    datasets: [
      {
        label: 'Điểm số môn học',
        data: currentGrade ? [
          currentGrade.math,
          currentGrade.literature,
          currentGrade.english,
          currentGrade.physics,
          currentGrade.chemistry,
          currentGrade.it
        ] : [0, 0, 0, 0, 0, 0],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(6, 182, 212, 0.8)'
        ],
        borderRadius: 8
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-3xl p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            Bảng Điểm Cá Nhân
          </span>
          <h1 className="text-3xl font-extrabold mt-2">{studentInfo?.fullName || 'Học sinh'}</h1>
          <p className="text-blue-100 text-sm mt-1">
            Mã HS: <strong>{studentInfo?.studentCode}</strong> • Lớp: <strong>{studentInfo?.class?.className || 'Chưa gán lớp'}</strong> • GVCN: <strong>{studentInfo?.class?.homeroomTeacher?.fullName || 'Chưa cập nhật'}</strong>
          </p>
        </div>

        {/* Semester Select */}
        <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 flex items-center gap-2">
          <Calendar size={18} className="text-blue-200 ml-2" />
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="bg-transparent text-white font-medium py-1 px-3 outline-none cursor-pointer text-sm"
          >
            <option value="HK1_2026" className="text-gray-800">Học kỳ 1 (2026-2027)</option>
            <option value="HK2_2026" className="text-gray-800">Học kỳ 2 (2026-2027)</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-2xl">
            <Award size={28} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Điểm Trung Bình (GPA)</p>
            <h3 className="text-3xl font-extrabold text-gray-800 mt-0.5">{gpa} <span className="text-sm font-medium text-gray-400">/ 10</span></h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Xếp Loại Học Lực</p>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 border ${rankColor}`}>
              {rank}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <BookOpen size={28} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Tổng Số Môn Học</p>
            <h3 className="text-2xl font-extrabold text-gray-800 mt-0.5">{subjects.length} môn</h3>
          </div>
        </div>
      </div>

      {/* Subject Score Breakdown & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Table breakdown */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              Chi tiết điểm từng môn học
            </h3>
            <span className="text-xs text-gray-500">{selectedSemester}</span>
          </div>

          <div className="divide-y divide-gray-100">
            {subjects.map(s => {
              const score = currentGrade ? currentGrade[s.key] : 0;
              const isPass = score >= 5.0;
              return (
                <div key={s.key} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{s.icon}</span>
                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm">{s.name}</h4>
                      <p className="text-xs text-gray-400">{s.credits} tiết / tuần</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`font-bold text-base ${
                      score >= 8.0 ? 'text-emerald-600' :
                      score >= 6.5 ? 'text-blue-600' :
                      score >= 5.0 ? 'text-amber-600' :
                      'text-red-500'
                    }`}>
                      {score > 0 ? score.toFixed(1) : '—'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      isPass && score > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                    }`}>
                      {score > 0 ? (isPass ? 'Đạt' : 'Cần cố gắng') : 'Chưa nhập'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart View */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col">
          <h3 className="font-bold text-gray-800 mb-4 text-sm">Biểu đồ phổ điểm học tập</h3>
          <div className="flex-1 min-h-[260px] pb-4">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
          <p className="text-xs text-center text-gray-400 mt-auto">
            Điểm số được cập nhật trực tiếp bởi giáo viên phụ trách bộ môn.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentGrades;
