import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  School, 
  CreditCard, 
  Calendar, 
  Award, 
  Clock, 
  BellRing, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Sparkles,
  UserPlus,
  PlusCircle,
  FileSpreadsheet,
  Layers,
  Activity,
  CalendarCheck,
  ShieldCheck,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Modern Bento Stat Card
const BentoStatCard = ({ title, value, icon: Icon, gradient, badgeText, badgeType = 'positive', subtitle, delay = 0 }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md dark:shadow-none transition-all"
    >
      {/* Background Accent Glow */}
      <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-10 blur-xl ${gradient}`} />

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
            {title}
          </p>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-tight">
            {value}
          </h3>
        </div>
        
        <div className={`p-3 rounded-xl ${gradient} text-white shadow-md shadow-blue-500/10`}>
          <Icon size={22} />
        </div>
      </div>

      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {subtitle}
        </span>
        {badgeText && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
            badgeType === 'positive' 
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
              : badgeType === 'warning'
              ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60'
              : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60'
          }`}>
            <TrendingUp size={10} />
            {badgeText}
          </span>
        )}
      </div>
    </motion.div>
  );
};

const Dashboard = () => {
  const userRole = localStorage.getItem('userRole') || 'student';
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [gradeDistribution, setGradeDistribution] = useState([0, 0, 0]);
  const [adminStats, setAdminStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalSubjects: 0,
    tuitionCompleted: '0%'
  });
  const [notifications, setNotifications] = useState([]);
  const [studentGrades, setStudentGrades] = useState(null);
  const [studentBills, setStudentBills] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [selectedChartSemester, setSelectedChartSemester] = useState('HK1');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch notifications
        const notifRes = await api.get('/notifications').catch(() => ({ data: [] }));
        setNotifications(notifRes.data?.slice(0, 5) || []);

        if (userRole === 'admin') {
          const [studentsRes, classesRes, usersRes, subjectsRes, tuitionRes] = await Promise.all([
            api.get('/students').catch(() => ({ data: [] })),
            api.get('/classes').catch(() => ({ data: [] })),
            api.get('/users').catch(() => ({ data: [] })),
            api.get('/subjects').catch(() => ({ data: [] })),
            api.get('/tuition/summary').catch(() => ({ data: { data: {} } }))
          ]);

          const teachers = (usersRes.data || []).filter(u => u.role === 'teacher');
          const students = studentsRes.data || [];
          
          let k10 = 0, k11 = 0, k12 = 0;
          students.forEach(s => {
            const className = s.class?.className || '';
            if (className.startsWith('10')) k10++;
            else if (className.startsWith('11')) k11++;
            else if (className.startsWith('12')) k12++;
            else if (students.length > 0) k10++;
          });
          setGradeDistribution([k10, k11, k12]);

          const tuitionRate = tuitionRes.data?.data?.Ty_Le_Hoan_Thanh !== undefined
            ? `${tuitionRes.data.data.Ty_Le_Hoan_Thanh}%`
            : '0%';

          setAdminStats({
            totalStudents: students.length,
            totalTeachers: teachers.length || 0,
            totalClasses: classesRes.data?.length || 0,
            totalSubjects: subjectsRes.data?.length || 0,
            tuitionCompleted: tuitionRate
          });
        } else if (userRole === 'teacher') {
          if (userData.classId || (userData.homeroomClasses && userData.homeroomClasses[0]?.id)) {
            const classId = userData.homeroomClasses ? userData.homeroomClasses[0]?.id : userData.classId;
            const schedRes = await api.get(`/schedule/class/${classId}?semester=HK1_2026`).catch(() => ({ data: [] }));
            setTodaySchedule(schedRes.data || []);
          }
        } else if (userRole === 'student') {
          const [gradesRes, billsRes] = await Promise.all([
            api.get('/grades/my-grades').catch(() => ({ data: null })),
            api.get('/tuition/my-bills').catch(() => ({ data: { data: [] } }))
          ]);

          if (gradesRes.data?.grades?.length > 0) {
            setStudentGrades(gradesRes.data.grades[0]);
          }
          if (billsRes.data?.data) {
            setStudentBills(billsRes.data.data);
          }
          if (userData.classId) {
            const schedRes = await api.get(`/schedule/class/${userData.classId}?semester=HK1_2026`).catch(() => ({ data: [] }));
            setTodaySchedule(schedRes.data || []);
          }
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userRole]);

  // Chart Styling Configurations
  const barChartData = {
    labels: ['Khối 10', 'Khối 11', 'Khối 12'],
    datasets: [
      {
        label: 'Số học sinh',
        data: gradeDistribution.every(v => v === 0) ? [1, 0, 0] : gradeDistribution,
        backgroundColor: [
          'rgba(59, 130, 246, 0.85)',
          'rgba(99, 102, 241, 0.85)',
          'rgba(168, 85, 247, 0.85)'
        ],
        borderRadius: 10,
        borderSkipped: false,
      },
    ],
  };

  const doughnutData = {
    labels: ['Giỏi / Xuất Sắc', 'Khá', 'Trung Bình', 'Cần Cải Thiện'],
    datasets: [
      {
        data: [45, 38, 14, 3],
        backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
        borderWidth: 2,
        borderColor: isDark ? '#0f172a' : '#ffffff',
        hoverOffset: 6,
      },
    ],
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  // ==========================================
  // 1. TEACHER DASHBOARD VIEW
  // ==========================================
  if (userRole === 'teacher') {
    const homeroom = userData.homeroomClasses && userData.homeroomClasses.length > 0 ? userData.homeroomClasses[0] : null;

    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-6 sm:p-8 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-white/20 px-3.5 py-1 rounded-full text-xs font-semibold tracking-wider uppercase backdrop-blur-md">
                <Sparkles size={13} />
                Cổng Giảng Dạy & Nghiệp Vụ
              </span>
              <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                {getTimeGreeting()}, Thầy/Cô {userData.name}!
              </h1>
              <p className="text-emerald-100 text-xs sm:text-sm mt-1">
                Bộ môn: <strong className="text-white">{userData.specialization || 'Toán học'}</strong> • Mã GV: <strong className="text-white">{userData.teacherCode || 'GV001'}</strong> • Năm học 2026-2027
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {homeroom && (
                <Link 
                  to="/teacher/homeroom"
                  className="bg-white text-emerald-800 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md hover:bg-emerald-50 transition-all flex items-center gap-2"
                >
                  <Users size={16} /> Lớp CN: {homeroom.className}
                </Link>
              )}
              <Link
                to="/grades"
                className="bg-emerald-900/80 hover:bg-emerald-950 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 border border-emerald-400/30"
              >
                <BookOpen size={16} /> Sổ Nhập Điểm
              </Link>
            </div>
          </div>
        </div>

        {/* Quick KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <BentoStatCard 
            title="Lớp Chủ Nhiệm" 
            value={homeroom ? homeroom.className : 'Chưa có'} 
            icon={School} 
            gradient="bg-gradient-to-tr from-emerald-600 to-teal-500" 
            subtitle={homeroom ? `Khối ${homeroom.grade}` : 'Liên hệ Ban Giám Hiệu'} 
            badgeText="Chính thức"
          />
          <BentoStatCard 
            title="Môn Giảng Dạy" 
            value={userData.specialization || 'Toán học'} 
            icon={BookOpen} 
            gradient="bg-gradient-to-tr from-blue-600 to-indigo-500" 
            subtitle="Tổ chuyên môn" 
            badgeText="Bộ môn chính"
          />
          <BentoStatCard 
            title="Lịch Dạy Tuần Này" 
            value="18 tiết" 
            icon={Calendar} 
            gradient="bg-gradient-to-tr from-indigo-600 to-purple-500" 
            subtitle="Thời khóa biểu HK1" 
            badgeText="Đang thực hiện"
          />
          <BentoStatCard 
            title="Thông Báo Trường" 
            value={notifications.length} 
            icon={BellRing} 
            gradient="bg-gradient-to-tr from-amber-500 to-orange-500" 
            subtitle="Mới nhất từ BGH" 
            badgeText="Tin mới"
            badgeType="warning"
          />
        </div>

        {/* Schedule & Notices */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Teaching Schedule */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Clock size={18} className="text-emerald-600 dark:text-emerald-400" />
                Lịch Dạy Hôm Nay & Thời Khóa Biểu
              </h3>
              <Link to="/schedule" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                Xem toàn bộ TKB <ArrowRight size={14} />
              </Link>
            </div>

            <div className="space-y-2.5">
              {[
                { period: 'Tiết 1 (07:00 - 07:45)', subject: 'Toán Đại số', class: homeroom ? homeroom.className : '10A1', room: 'Phòng 204' },
                { period: 'Tiết 2 (07:50 - 08:35)', subject: 'Toán Hình học', class: homeroom ? homeroom.className : '10A1', room: 'Phòng 204' },
                { period: 'Tiết 4 (09:45 - 10:30)', subject: 'Toán Đại số', class: '10A2', room: 'Phòng 205' },
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between border border-slate-100 dark:border-slate-700/60 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                      P{idx + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">{item.subject}</h4>
                      <p className="text-[11px] text-slate-400">{item.period}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-1 rounded-lg">
                      Lớp {item.class}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">{item.room}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* School Notices */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <BellRing size={18} className="text-amber-500" />
              Thông Báo Nhà Trường
            </h3>
            <div className="space-y-3">
              {notifications.map((n, idx) => (
                <div key={n.id || idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{n.title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{n.content}</p>
                  <span className="text-[10px] text-slate-400 mt-1.5 block">
                    {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">Không có thông báo mới</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. STUDENT DASHBOARD VIEW
  // ==========================================
  if (userRole === 'student') {
    const scores = studentGrades ? [
      studentGrades.math || 0,
      studentGrades.literature || 0,
      studentGrades.english || 0,
      studentGrades.physics || 0,
      studentGrades.chemistry || 0,
      studentGrades.it || 0
    ] : [];
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : '8.40';

    return (
      <div className="space-y-6">
        {/* Student Profile Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 sm:p-8 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-2xl sm:text-3xl font-black shrink-0">
                {userData.name?.charAt(0) || 'H'}
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
                  <Sparkles size={12} />
                  Cổng Học Sinh Trực Tuyến
                </span>
                <h1 className="text-2xl sm:text-3xl font-black mt-1.5">{userData.name || 'Học sinh'}</h1>
                <p className="text-blue-100 text-xs sm:text-sm mt-1">
                  Mã HS: <strong className="text-white">{userData.studentCode || 'HS001'}</strong> • Lớp: <strong className="text-white">{userData.className || '10A1'}</strong> • GVCN: <strong className="text-white">{userData.homeroomTeacher || 'Thầy Cô Chủ Nhiệm'}</strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Link
                to="/student/grades"
                className="bg-white text-blue-800 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md hover:bg-blue-50 transition-all flex items-center gap-2"
              >
                <Award size={16} /> Bảng Điểm
              </Link>
              <Link
                to="/student/schedule"
                className="bg-blue-900/80 hover:bg-blue-950 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 border border-blue-400/30"
              >
                <Calendar size={16} /> Lịch Học
              </Link>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <BentoStatCard 
            title="Điểm Trung Bình (GPA)" 
            value={avgScore} 
            icon={Award} 
            gradient="bg-gradient-to-tr from-blue-600 to-indigo-500" 
            subtitle="Học kỳ 1 (2026-2027)" 
            badgeText="Tích cực"
          />
          <BentoStatCard 
            title="Xếp Loại Học Lực" 
            value="Giỏi" 
            icon={GraduationCap} 
            gradient="bg-gradient-to-tr from-emerald-600 to-teal-500" 
            subtitle="Tốp đầu lớp học" 
            badgeText="Xuất sắc"
          />
          <BentoStatCard 
            title="Hạnh Kiểm & Kỷ Luật" 
            value="Tốt" 
            icon={ShieldCheck} 
            gradient="bg-gradient-to-tr from-indigo-600 to-violet-500" 
            subtitle="Chuyên cần 100%" 
            badgeText="Chuẩn mực"
          />
          <BentoStatCard 
            title="Học Phí Học Kỳ" 
            value={studentBills.some(b => b.status === 'unpaid') ? 'Cần nộp' : 'Đã nộp'} 
            icon={CreditCard} 
            gradient={studentBills.some(b => b.status === 'unpaid') ? 'bg-gradient-to-tr from-amber-500 to-orange-500' : 'bg-gradient-to-tr from-emerald-600 to-teal-500'} 
            subtitle="Học kỳ 1 2026-2027" 
            badgeText={studentBills.some(b => b.status === 'unpaid') ? 'Chờ thanh toán' : 'Hoàn thành'}
            badgeType={studentBills.some(b => b.status === 'unpaid') ? 'warning' : 'positive'}
          />
        </div>

        {/* Schedule & Announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Calendar size={18} className="text-blue-600 dark:text-blue-400" />
                Thời Khóa Biểu Trong Tuần
              </h3>
              <Link to="/student/schedule" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                Xem chi tiết <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { day: 'Thứ 2', subjects: 'Toán, Văn, Anh, Tin' },
                { day: 'Thứ 3', subjects: 'Vật lý, Hóa, Toán, Sử' },
                { day: 'Thứ 4', subjects: 'Văn, Địa, Sinh, GDCD' },
                { day: 'Thứ 5', subjects: 'Toán, Anh, Tin, Thể dục' },
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                  <h4 className="font-bold text-blue-600 dark:text-blue-400 text-xs mb-1">{item.day}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{item.subjects}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <BellRing size={18} className="text-amber-500" />
              Bảng Tin Nhà Trường
            </h3>
            <div className="space-y-3">
              {notifications.map((n, idx) => (
                <div key={n.id || idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{n.title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{n.content}</p>
                  <span className="text-[10px] text-slate-400 mt-1.5 block">
                    {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">Không có thông báo mới</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. ADMIN / BAN GIÁM HIỆU DASHBOARD VIEW
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Top Header Greeting & Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 tracking-wider">
              Năm học 2026 - 2027 • Học kỳ 1
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">•</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
              Ban Giám Hiệu THPT TTLN
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-tight mt-1.5">
            {getTimeGreeting()}, Quản Trị Viên!
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Báo cáo tổng quan tình hình đào tạo, phân bổ học sinh và tiến độ tài chính toàn trường
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link 
            to="/students" 
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 hover:shadow-lg transition-all"
          >
            <UserPlus size={15} />
            Quản lý học sinh
          </Link>

          <Link 
            to="/tuition" 
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all"
          >
            <CreditCard size={15} />
            Đợt thu học phí
          </Link>
        </div>
      </div>

      {/* Bento Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <BentoStatCard 
          title="Tổng Học Sinh" 
          value={adminStats.totalStudents} 
          icon={Users} 
          gradient="bg-gradient-to-tr from-blue-600 to-cyan-500" 
          subtitle="Đang theo học chính thức" 
          badgeText="+5.2%"
          delay={0.05}
        />
        <BentoStatCard 
          title="Tổng Giáo Viên" 
          value={adminStats.totalTeachers} 
          icon={GraduationCap} 
          gradient="bg-gradient-to-tr from-emerald-600 to-teal-500" 
          subtitle="Cán bộ, giáo viên cơ hữu" 
          badgeText="100% Đạt Chuẩn"
          delay={0.1}
        />
        <BentoStatCard 
          title="Tổng Lớp Học" 
          value={adminStats.totalClasses} 
          icon={School} 
          gradient="bg-gradient-to-tr from-indigo-600 to-violet-500" 
          subtitle="Khối 10, Khối 11, Khối 12" 
          badgeText="Đủ phòng học"
          delay={0.15}
        />
        <BentoStatCard 
          title="Tiến Độ Thu Học Phí" 
          value={adminStats.tuitionCompleted} 
          icon={CreditCard} 
          gradient="bg-gradient-to-tr from-amber-500 to-orange-500" 
          subtitle="Kỳ thu Học kỳ 1" 
          badgeText="Đang thu"
          badgeType="warning"
          delay={0.2}
        />
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart: Quy mô học sinh theo khối */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Layers size={18} className="text-blue-600 dark:text-blue-400" />
                Quy mô học sinh theo từng khối lớp
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Phân bổ số lượng học sinh thực tế tại từng khối</p>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button 
                onClick={() => setSelectedChartSemester('HK1')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  selectedChartSemester === 'HK1' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                Học kỳ 1
              </button>
              <button 
                onClick={() => setSelectedChartSemester('HK2')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  selectedChartSemester === 'HK2' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                Học kỳ 2
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-[260px] pb-2">
            <Bar 
              data={barChartData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: isDark ? '#0f172a' : '#1e293b',
                    padding: 10,
                    cornerRadius: 8,
                  }
                },
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: { color: isDark ? '#94a3b8' : '#64748b' }
                  },
                  y: {
                    grid: { color: isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.8)' },
                    ticks: { 
                      color: isDark ? '#94a3b8' : '#64748b',
                      stepSize: 1
                    }
                  }
                }
              }} 
            />
          </div>
        </div>

        {/* Donut Chart: Phân loại học lực */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Award size={18} className="text-emerald-500" />
              Phân loại học lực toàn trường
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Tỷ lệ đánh giá chất lượng học tập</p>
          </div>

          <div className="flex-1 flex items-center justify-center py-2">
            <div className="w-48 h-48 relative flex items-center justify-center">
              <Doughnut 
                data={doughnutData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '70%',
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: isDark ? '#0f172a' : '#1e293b',
                      padding: 10,
                      cornerRadius: 8,
                    }
                  }
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-800 dark:text-white">
                  {adminStats.totalStudents}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Học sinh
                </span>
              </div>
            </div>
          </div>

          {/* Custom Donut Legend */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="truncate">Giỏi: 45%</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="truncate">Khá: 38%</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="truncate">T.Bình: 14%</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="truncate">Yếu: 3%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Shortcuts & Live Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Shortcuts Grid */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Sparkles size={18} className="text-blue-600 dark:text-blue-400" />
              Thao Tác Nhanh (Quick Actions)
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Link 
              to="/students" 
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-slate-100 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col gap-1.5 group"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <UserPlus size={16} />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                Thêm học sinh
              </span>
              <span className="text-[10px] text-slate-400">Hồ sơ & nhập học</span>
            </Link>

            <Link 
              to="/tuition" 
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-100 dark:border-slate-700/60 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col gap-1.5 group"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CreditCard size={16} />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                Lập đợt thu
              </span>
              <span className="text-[10px] text-slate-400">Học phí & biểu phí</span>
            </Link>

            <Link 
              to="/schedule" 
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-100 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col gap-1.5 group"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CalendarCheck size={16} />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                Xếp thời khóa biểu
              </span>
              <span className="text-[10px] text-slate-400">Phân công tiết dạy</span>
            </Link>

            <Link 
              to="/notifications" 
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-100 dark:border-slate-700/60 hover:border-amber-300 dark:hover:border-amber-700 transition-all flex flex-col gap-1.5 group"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <BellRing size={16} />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                Đăng thông báo
              </span>
              <span className="text-[10px] text-slate-400">Gửi toàn trường</span>
            </Link>
          </div>
        </div>

        {/* School Notifications Section */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BellRing size={18} className="text-blue-600 dark:text-blue-400" />
              Thông Báo Mới Nhất Của Trường
            </h3>
            <Link 
              to="/notifications" 
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1"
            >
              Xem tất cả <ChevronRight size={14} />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                Chưa có thông báo nào được đăng tải
              </div>
            ) : (
              notifications.map((n, idx) => (
                <div 
                  key={n.id || idx} 
                  className="py-3.5 first:pt-1 last:pb-1 flex items-start justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <BellRing size={14} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">
                        {n.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {n.content}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0 mt-1">
                    {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
