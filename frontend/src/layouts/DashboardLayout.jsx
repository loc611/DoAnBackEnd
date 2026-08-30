import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  BookOpenCheck,
  GraduationCap, 
  Calendar, 
  CalendarDays,
  UserCheck,
  Bell, 
  Menu,
  X,
  UserCircle,
  LogOut,
  Settings,
  BellRing,
  Shield,
  LayoutList,
  CreditCard,
  School,
  Award
} from 'lucide-react';
import api from '../services/api';

const SidebarItem = ({ icon: Icon, label, path, active, expanded }) => (
  <Link 
    to={path} 
    className={`flex items-center py-3 px-3.5 rounded-xl mb-1.5 transition-all duration-200 ${
      active 
        ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30' 
        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
    }`}
  >
    <Icon size={19} className={expanded ? 'mr-3.5 shrink-0' : 'mx-auto shrink-0'} />
    {expanded && <span className="text-sm truncate">{label}</span>}
  </Link>
);

const DashboardLayout = () => {
  const [expanded, setExpanded] = useState(true);
  const location = useLocation();
  const userRole = localStorage.getItem('userRole') || 'student';
  const userDataStr = localStorage.getItem('userData');
  const [userData, setUserData] = useState(() => userDataStr ? JSON.parse(userDataStr) : null);

  useEffect(() => {
    // Refresh current user data
    api.get('/auth/me')
      .then(res => {
        if (res.data?.user) {
          setUserData(res.data.user);
          localStorage.setItem('userData', JSON.stringify(res.data.user));
        }
      })
      .catch(() => {});
  }, []);

  const getUserName = () => userData?.name || (userRole === 'admin' ? 'Ban Quản Trị' : userRole === 'teacher' ? 'Giáo viên' : 'Học sinh');
  const getUserEmail = () => userData?.email || `${userRole}@school.edu.vn`;
  const getRoleLabel = () => userRole === 'admin' ? 'Quản trị viên' : userRole === 'teacher' ? 'Giáo viên' : 'Học sinh';

  const menuConfig = {
    admin: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: Users, label: 'Quản lý học sinh', path: '/students' },
      { icon: GraduationCap, label: 'Quản lý giáo viên', path: '/teachers' },
      { icon: LayoutList, label: 'Quản lý lớp học', path: '/classes' },
      { icon: BookOpen, label: 'Quản lý môn học', path: '/subjects' },
      { icon: Calendar, label: 'Thời khóa biểu', path: '/schedule' },
      { icon: CalendarDays, label: 'Quản lý lịch thi', path: '/exams' },
      { icon: UserCheck, label: 'Quản lý điểm danh', path: '/attendance' },
      { icon: BookOpenCheck, label: 'Quản lý điểm số', path: '/grades' },
      { icon: CreditCard, label: 'Quản lý học phí', path: '/tuition' },
      { icon: Shield, label: 'Quản trị tài khoản', path: '/users' },
      { icon: BellRing, label: 'Trung tâm thông báo', path: '/notifications' },
      { icon: UserCircle, label: 'Hồ sơ cá nhân', path: '/profile' },
      { icon: Settings, label: 'Cài đặt hệ thống', path: '/settings' },
    ],
    teacher: [
      { icon: LayoutDashboard, label: 'Dashboard Giảng Dạy', path: '/' },
      { icon: School, label: 'Lớp Chủ Nhiệm', path: '/teacher/homeroom' },
      { icon: UserCheck, label: 'Điểm Danh Học Sinh', path: '/attendance' },
      { icon: BookOpenCheck, label: 'Sổ Nhập Điểm', path: '/grades' },
      { icon: Calendar, label: 'Lịch Giảng Dạy', path: '/schedule' },
      { icon: CalendarDays, label: 'Lịch Thi & Coi Thi', path: '/exams' },
      { icon: Users, label: 'Tra cứu Học sinh', path: '/students' },
      { icon: BellRing, label: 'Thông báo', path: '/notifications' },
      { icon: UserCircle, label: 'Hồ sơ & Mật khẩu', path: '/profile' },
    ],
    student: [
      { icon: LayoutDashboard, label: 'Trang Chủ Học Sinh', path: '/' },
      { icon: Award, label: 'Tra Cứu Bảng Điểm', path: '/student/grades' },
      { icon: Calendar, label: 'Thời Khóa Biểu', path: '/student/schedule' },
      { icon: CalendarDays, label: 'Lịch Thi & Phòng Thi', path: '/student/exams' },
      { icon: UserCheck, label: 'Chuyên Cần / Điểm Danh', path: '/student/attendance' },
      { icon: CreditCard, label: 'Học Phí & Hóa Đơn', path: '/student/tuition' },
      { icon: BellRing, label: 'Thông Báo Trường', path: '/notifications' },
      { icon: UserCircle, label: 'Hồ Sơ Cá Nhân', path: '/profile' },
    ]
  };

  const currentMenuItems = menuConfig[userRole] || menuConfig.student;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <motion.aside 
        animate={{ width: expanded ? 260 : 78 }}
        className="bg-slate-900 text-white flex flex-col transition-all duration-300 z-20 hidden md:flex relative shadow-2xl"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between p-4 h-16 border-b border-slate-800/80">
          {expanded && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-xs shadow-md shadow-blue-500/30">
                TTLN
              </div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent truncate">
                TTLN Edu
              </span>
            </div>
          )}
          <button 
            onClick={() => setExpanded(!expanded)} 
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <Menu size={18} />
          </button>
        </div>
        
        {/* Navigation list */}
        <div className="flex-1 py-4 px-3 overflow-y-auto custom-scrollbar">
          {currentMenuItems.map((item) => (
            <SidebarItem 
              key={item.path}
              icon={item.icon} 
              label={item.label} 
              path={item.path}
              active={location.pathname === item.path}
              expanded={expanded}
            />
          ))}
        </div>
        
        {/* User Footer Profile */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90">
          <Link to="/profile" className="flex items-center p-2 rounded-xl hover:bg-slate-800 transition-colors mb-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
              userRole === 'admin' ? 'bg-indigo-600 text-white' :
              userRole === 'teacher' ? 'bg-emerald-600 text-white' :
              'bg-blue-600 text-white'
            }`}>
              {userRole === 'admin' ? 'AD' : userRole === 'teacher' ? 'GV' : 'HS'}
            </div>
            {expanded && (
              <div className="ml-3 overflow-hidden text-left">
                <p className="text-xs font-bold text-white truncate">
                  {getUserName()}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {getRoleLabel()}
                </p>
              </div>
            )}
          </Link>

          <Link 
            to="/login" 
            onClick={() => { 
              localStorage.removeItem('userRole'); 
              localStorage.removeItem('token'); 
              localStorage.removeItem('userData'); 
            }} 
            className="flex items-center text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors w-full px-3 py-2 rounded-xl text-xs font-semibold"
          >
            <LogOut size={16} className="shrink-0" />
            {expanded && <span className="ml-3">Đăng xuất</span>}
          </Link>
        </div>
      </motion.aside>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header Navbar */}
        <header className="h-16 bg-white shadow-xs border-b border-slate-100 flex items-center justify-between px-6 z-10">
          <div className="flex items-center md:hidden">
            <button className="text-slate-500 hover:text-slate-700 p-2">
              <Menu size={22} />
            </button>
          </div>
          
          <div className="hidden md:flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
              userRole === 'admin' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
              userRole === 'teacher' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {getRoleLabel()} Portal
            </span>
            <span className="text-xs text-slate-400">•</span>
            <p className="text-xs font-semibold text-slate-500">Hệ Thống Quản Lý Giáo Dục Trường THPT TTLN</p>
          </div>

          <div className="flex items-center space-x-3">
            <Link to="/notifications" className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-xl hover:bg-slate-50">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
            </Link>
            
            <Link to="/profile" className="flex items-center space-x-2.5 p-1.5 px-2 hover:bg-slate-50 rounded-xl transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {getUserName().charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left text-xs">
                <p className="font-bold text-slate-700 truncate max-w-[120px]">{getUserName()}</p>
                <p className="text-slate-400 text-[10px]">{getRoleLabel()}</p>
              </div>
            </Link>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50/70 p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
