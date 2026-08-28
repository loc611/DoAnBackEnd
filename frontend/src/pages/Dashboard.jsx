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
  CheckCircle, 
  AlertCircle,
  QrCode,
  ShieldCheck
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
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import api from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between"
  >
    <div className="space-y-1">
      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
      <h4 className="text-2xl font-black text-gray-800">{value}</h4>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
    </div>
    <div className={`p-4 rounded-2xl ${colorClass} shadow-md`}>
      <Icon size={24} className="text-white" />
    </div>
  </motion.div>
);

const Dashboard = () => {
  const userRole = localStorage.getItem('userRole') || 'student';
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  const [loading, setLoading] = useState(true);
  const [adminStats, setAdminStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalSubjects: 0,
    tuitionCompleted: '85%'
  });
  const [notifications, setNotifications] = useState([]);
  const [studentGrades, setStudentGrades] = useState(null);
  const [studentBills, setStudentBills] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Common: notifications
        const notifRes = await api.get('/notifications').catch(() => ({ data: [] }));
        setNotifications(notifRes.data?.slice(0, 4) || []);

        if (userRole === 'admin') {
          const [studentsRes, classesRes, usersRes, subjectsRes] = await Promise.all([
            api.get('/students').catch(() => ({ data: [] })),
            api.get('/classes').catch(() => ({ data: [] })),
            api.get('/users').catch(() => ({ data: [] })),
            api.get('/subjects').catch(() => ({ data: [] }))
          ]);

          const teachers = usersRes.data.filter(u => u.role === 'teacher');
          setAdminStats({
            totalStudents: studentsRes.data?.length || 0,
            totalTeachers: teachers.length || 0,
            totalClasses: classesRes.data?.length || 0,
            totalSubjects: subjectsRes.data?.length || 0,
            tuitionCompleted: '92%'
          });
        } else if (userRole === 'teacher') {
          // Fetch teaching info
          if (userData.classId || (userData.homeroomClasses && userData.homeroomClasses[0]?.id)) {
            const classId = userData.homeroomClasses ? userData.homeroomClasses[0]?.id : userData.classId;
            const schedRes = await api.get(`/schedule/class/${classId}?semester=HK1_2026`).catch(() => ({ data: [] }));
            setTodaySchedule(schedRes.data || []);
          }
        } else if (userRole === 'student') {
          // Fetch student specific grades and tuition
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

  // Chart Data cho Admin
  const barChartData = {
    labels: ['Khối 10', 'Khối 11', 'Khối 12'],
    datasets: [
      {
        label: 'Số học sinh',
        data: [420, 390, 350],
        backgroundColor: 'rgba(59, 130, 246, 0.85)',
        borderRadius: 8,
      },
    ],
  };

  const doughnutData = {
    labels: ['Giỏi', 'Khá', 'Trung bình', 'Yếu'],
    datasets: [
      {
        data: [40, 45, 12, 3],
        backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
        borderWidth: 0,
      },
    ],
  };

  // ==========================================
  // 1. TEACHER DASHBOARD VIEW
  // ==========================================
  if (userRole === 'teacher') {
    const homeroom = userData.homeroomClasses && userData.homeroomClasses.length > 0 ? userData.homeroomClasses[0] : null;

    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-3xl p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="bg-white/20 px-3.5 py-1 rounded-full text-xs font-semibold tracking-wider uppercase backdrop-blur-sm">
              Cổng Giảng Dạy & Giáo Viên
            </span>
            <h1 className="text-3xl font-extrabold mt-2">Xin chào, Thầy/Cô {userData.name}!</h1>
            <p className="text-emerald-50 text-sm mt-1">
              Môn phụ trách: <strong>{userData.specialization || 'Toán học'}</strong> • Mã GV: <strong>{userData.teacherCode || 'GV001'}</strong>
            </p>
          </div>

          <div className="flex gap-3">
            {homeroom && (
              <Link 
                to="/teacher/homeroom"
                className="bg-white text-emerald-800 font-bold px-5 py-3 rounded-2xl text-sm shadow-md hover:bg-emerald-50 transition-all flex items-center gap-2"
              >
                <Users size={18} /> Lớp CN: {homeroom.className}
              </Link>
            )}
            <Link
              to="/grades"
              className="bg-emerald-800 text-white font-bold px-5 py-3 rounded-2xl text-sm shadow-md hover:bg-emerald-900 transition-all flex items-center gap-2"
            >
              <BookOpen size={18} /> Nhập Điểm
            </Link>
          </div>
        </div>

        {/* Quick KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Lớp Chủ Nhiệm" value={homeroom ? homeroom.className : 'Chưa có'} icon={School} colorClass="bg-emerald-500" subtitle={homeroom ? `Khối ${homeroom.grade}` : 'Liên hệ Admin'} />
          <StatCard title="Môn Giảng Dạy" value={userData.specialization || 'Toán học'} icon={BookOpen} colorClass="bg-blue-500" subtitle="Bộ môn chính" />
          <StatCard title="Lịch Dạy Tuần Này" value="18 tiết" icon={Calendar} colorClass="bg-indigo-500" subtitle="Thời khóa biểu HK1" />
          <StatCard title="Thông Báo Mới" value={notifications.length} icon={BellRing} colorClass="bg-amber-500" subtitle="Từ Ban Giám Hiệu" />
        </div>

        {/* Two Columns: Schedule & Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Teaching Schedule */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Clock size={20} className="text-emerald-600" />
                Lịch dạy hôm nay & Tuần học
              </h3>
              <Link to="/schedule" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                Xem toàn bộ TKB <ArrowRight size={14} />
              </Link>
            </div>

            <div className="space-y-3">
              {[
                { period: 'Tiết 1 (07:00 - 07:45)', subject: 'Toán Đại số', class: homeroom ? homeroom.className : '10A1', room: 'Phòng 204' },
                { period: 'Tiết 2 (07:50 - 08:35)', subject: 'Toán Hình học', class: homeroom ? homeroom.className : '10A1', room: 'Phòng 204' },
                { period: 'Tiết 4 (09:45 - 10:30)', subject: 'Toán Đại số', class: '10A2', room: 'Phòng 205' },
              ].map((item, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100 hover:border-emerald-200 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                      P{idx + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">{item.subject}</h4>
                      <p className="text-xs text-gray-500">{item.period}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-1 rounded-lg">
                      Lớp {item.class}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{item.room}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* School Notices */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
              <BellRing size={20} className="text-amber-500" />
              Thông báo nhà trường
            </h3>
            <div className="space-y-3">
              {notifications.map((n, idx) => (
                <div key={n.id || idx} className="p-3.5 bg-gray-50 rounded-xl hover:bg-emerald-50/40 transition-colors">
                  <h4 className="font-semibold text-gray-800 text-sm">{n.title}</h4>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.content}</p>
                  <span className="text-[10px] text-gray-400 mt-2 block">
                    {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">Không có thông báo mới</p>
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
        {/* Student Profile Identity Card */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-3xl p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-3xl font-extrabold">
              {userData.name?.charAt(0) || 'H'}
            </div>
            <div>
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                Cổng Học Sinh
              </span>
              <h1 className="text-3xl font-extrabold mt-1">{userData.name || 'Học sinh'}</h1>
              <p className="text-blue-100 text-sm mt-1">
                Mã HS: <strong>{userData.studentCode || 'HS001'}</strong> • Lớp: <strong>{userData.className || '10A1'}</strong> • GVCN: <strong>{userData.homeroomTeacher || 'Thầy Nguyễn Văn A'}</strong>
              </p>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <Link
              to="/student/grades"
              className="bg-white text-blue-800 font-bold px-5 py-3 rounded-2xl text-sm shadow-md hover:bg-blue-50 transition-all flex items-center gap-2"
            >
              <Award size={18} /> Xem Điểm Cá Nhân
            </Link>
            <Link
              to="/student/schedule"
              className="bg-blue-800 text-white font-bold px-5 py-3 rounded-2xl text-sm shadow-md hover:bg-blue-900 transition-all flex items-center gap-2"
            >
              <Calendar size={18} /> Thời Khóa Biểu
            </Link>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Điểm Trung Bình (GPA)" value={avgScore} icon={Award} colorClass="bg-blue-500" subtitle="Học kỳ 1 (2026-2027)" />
          <StatCard title="Xếp Loại Học Lực" value="Giỏi" icon={GraduationCap} colorClass="bg-emerald-500" subtitle="Tốp đầu lớp học" />
          <StatCard title="Hạnh Kiểm" value="Tốt" icon={ShieldCheck} colorClass="bg-indigo-500" subtitle="Chuyên cần 100%" />
          <StatCard title="Học Phí" value={studentBills.some(b => b.status === 'unpaid') ? 'Cần nộp' : 'Đã hoàn tất'} icon={CreditCard} colorClass={studentBills.some(b => b.status === 'unpaid') ? 'bg-amber-500' : 'bg-emerald-500'} subtitle="Xem biên lai" />
        </div>

        {/* Schedule & Announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Calendar size={20} className="text-blue-600" />
                Lịch học trong tuần
              </h3>
              <Link to="/student/schedule" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
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
                <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-200 transition-colors">
                  <h4 className="font-bold text-blue-600 text-sm mb-1">{item.day}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.subjects}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
              <BellRing size={20} className="text-amber-500" />
              Bảng tin nhà trường
            </h3>
            <div className="space-y-3">
              {notifications.map((n, idx) => (
                <div key={n.id || idx} className="p-3.5 bg-gray-50 rounded-xl hover:bg-blue-50/40 transition-colors">
                  <h4 className="font-semibold text-gray-800 text-sm">{n.title}</h4>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.content}</p>
                  <span className="text-[10px] text-gray-400 mt-2 block">
                    {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">Không có thông báo mới</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. ADMIN DASHBOARD VIEW
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Tổng Quan Ban Giám Hiệu</h1>
          <p className="text-xs text-gray-500 mt-0.5">Báo cáo tình hình hoạt động đào tạo và học phí toàn trường</p>
        </div>
        <div className="flex gap-2">
          <Link to="/students" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm">
            Quản lý học sinh
          </Link>
          <Link to="/tuition" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm">
            Đợt thu học phí
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Tổng Học Sinh" value={adminStats.totalStudents} icon={Users} colorClass="bg-blue-500" subtitle="Đang theo học" />
        <StatCard title="Tổng Giáo Viên" value={adminStats.totalTeachers} icon={GraduationCap} colorClass="bg-emerald-500" subtitle="Cán bộ giảng dạy" />
        <StatCard title="Tổng Lớp Học" value={adminStats.totalClasses} icon={School} colorClass="bg-purple-500" subtitle="Khối 10, 11, 12" />
        <StatCard title="Thu Học Phí" value={adminStats.tuitionCompleted} icon={CreditCard} colorClass="bg-amber-500" subtitle="Tiến độ thu HK1" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96 flex flex-col">
          <h3 className="text-base font-bold text-gray-800 mb-4">Quy mô học sinh theo từng khối lớp</h3>
          <div className="flex-1 pb-4">
            <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96 flex flex-col">
          <h3 className="text-base font-bold text-gray-800 mb-4">Phân loại học lực toàn trường</h3>
          <div className="flex-1 flex items-center justify-center pb-4">
            <div className="w-48 h-48">
              <Doughnut data={doughnutData} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Notifications Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <BellRing size={18} className="text-blue-600" />
            Thông báo gần nhất của nhà trường
          </h3>
          <Link to="/notifications" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
            Xem tất cả
          </Link>
        </div>

        <div className="divide-y divide-gray-100">
          {notifications.map((n, idx) => (
            <div key={n.id || idx} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
              <div>
                <h4 className="font-semibold text-gray-800 text-sm">{n.title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{n.content}</p>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(n.createdAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
