import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
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
  Award,
  Sun,
  Moon,
  Search,
  ChevronRight,
  Sparkles,
  ExternalLink,
  HelpCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const SidebarItem = ({ icon: Icon, label, path, active, expanded, badge }) => (
  <Link 
    to={path} 
    className={`group relative flex items-center py-2.5 px-3 rounded-xl mb-1 transition-all duration-200 ${
      active 
        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-600/25 dark:shadow-blue-900/40' 
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
    }`}
  >
    <div className={`shrink-0 transition-transform duration-200 ${active ? 'scale-110 text-white' : 'text-slate-400 group-hover:text-slate-200 group-hover:scale-105'}`}>
      <Icon size={19} className={expanded ? 'mr-3' : 'mx-auto'} />
    </div>
    
    {expanded && (
      <div className="flex-1 flex items-center justify-between overflow-hidden">
        <span className="text-xs font-medium truncate">{label}</span>
        {badge && (
          <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
            {badge}
          </span>
        )}
      </div>
    )}

    {/* Tooltip when collapsed */}
    {!expanded && (
      <div className="absolute left-full ml-3.5 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 shadow-xl border border-slate-800">
        {label}
      </div>
    )}
  </Link>
);

const DashboardLayout = () => {
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [notificationsList, setNotificationsList] = useState([]);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  
  const userRole = localStorage.getItem('userRole') || 'student';
  const userDataStr = localStorage.getItem('userData');
  const [userData, setUserData] = useState(() => userDataStr ? JSON.parse(userDataStr) : null);
  
  const userMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

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

    // Fetch notifications
    api.get('/notifications')
      .then(res => {
        setNotificationsList(res.data?.slice(0, 5) || []);
      })
      .catch(() => {});
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) {
        setShowNotificationMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const getUserName = () => userData?.name || (userRole === 'admin' ? 'Super Admin' : userRole === 'teacher' ? 'Giáo viên' : 'Học sinh');
  const getUserEmail = () => userData?.email || `${userRole}@school.edu.vn`;
  const getRoleLabel = () => userRole === 'admin' ? 'Quản trị viên' : userRole === 'teacher' ? 'Giáo viên' : 'Học sinh';

  const menuSections = {
    admin: [
      {
        title: 'TỔNG QUAN',
        items: [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        ]
      },
      {
        title: 'QUẢN LÝ ĐÀO TẠO',
        items: [
          { icon: Users, label: 'Quản lý học sinh', path: '/students' },
          { icon: GraduationCap, label: 'Quản lý giáo viên', path: '/teachers' },
          { icon: LayoutList, label: 'Quản lý lớp học', path: '/classes' },
          { icon: BookOpen, label: 'Quản lý môn học', path: '/subjects' },
          { icon: Calendar, label: 'Thời khóa biểu', path: '/schedule' },
          { icon: CalendarDays, label: 'Lịch thi học kỳ', path: '/exams' },
          { icon: UserCheck, label: 'Điểm danh chuyên cần', path: '/attendance' },
          { icon: BookOpenCheck, label: 'Sổ điểm học sinh', path: '/grades' },
        ]
      },
      {
        title: 'TÀI CHÍNH & QUẢN TRỊ',
        items: [
          { icon: CreditCard, label: 'Quản lý học phí', path: '/tuition' },
          { icon: Shield, label: 'Quản trị tài khoản', path: '/users' },
          { icon: BellRing, label: 'Trung tâm thông báo', path: '/notifications' },
          { icon: Settings, label: 'Cài đặt hệ thống', path: '/settings' },
        ]
      }
    ],
    teacher: [
      {
        title: 'TỔNG QUAN',
        items: [
          { icon: LayoutDashboard, label: 'Dashboard Giảng Dạy', path: '/' },
        ]
      },
      {
        title: 'NGHIỆP VỤ SƯ PHẠM',
        items: [
          { icon: School, label: 'Lớp Chủ Nhiệm', path: '/teacher/homeroom' },
          { icon: UserCheck, label: 'Điểm Danh Học Sinh', path: '/attendance' },
          { icon: BookOpenCheck, label: 'Sổ Nhập Điểm', path: '/grades' },
          { icon: Calendar, label: 'Lịch Giảng Dạy', path: '/schedule' },
          { icon: CalendarDays, label: 'Lịch Thi & Coi Thi', path: '/exams' },
          { icon: Users, label: 'Tra Cứu Học Sinh', path: '/students' },
        ]
      },
      {
        title: 'CÁ NHÂN',
        items: [
          { icon: BellRing, label: 'Thông Báo', path: '/notifications' },
          { icon: UserCircle, label: 'Hồ Sơ Giáo Viên', path: '/profile' },
        ]
      }
    ],
    student: [
      {
        title: 'TỔNG QUAN',
        items: [
          { icon: LayoutDashboard, label: 'Trang Chủ Học Sinh', path: '/' },
        ]
      },
      {
        title: 'HỌC TẬP & ĐÀO TẠO',
        items: [
          { icon: Award, label: 'Tra Cứu Bảng Điểm', path: '/student/grades' },
          { icon: Calendar, label: 'Thời Khóa Biểu', path: '/student/schedule' },
          { icon: CalendarDays, label: 'Lịch Thi Phòng Thi', path: '/student/exams' },
          { icon: UserCheck, label: 'Chuyên Cần Điểm Danh', path: '/student/attendance' },
        ]
      },
      {
        title: 'TÀI CHÍNH & THÔNG TIN',
        items: [
          { icon: CreditCard, label: 'Học Phí & Hóa Đơn', path: '/student/tuition' },
          { icon: BellRing, label: 'Thông Báo Nhà Trường', path: '/notifications' },
          { icon: UserCircle, label: 'Hồ Sơ Cá Nhân', path: '/profile' },
        ]
      }
    ]
  };

  const sections = menuSections[userRole] || menuSections.student;

  // Search filter
  const allNavItems = sections.flatMap(s => s.items);
  const searchResults = searchQuery.trim() === '' 
    ? allNavItems 
    : allNavItems.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleLogout = () => {
    localStorage.removeItem('userRole'); 
    localStorage.removeItem('token'); 
    localStorage.removeItem('userData');
    navigate('/login');
  };

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-slate-900 text-white select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800/80 shrink-0">
        <Link to="/" className="flex items-center gap-3 overflow-hidden group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center font-black text-white text-xs shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform duration-200">
            <Sparkles size={18} className="text-white animate-pulse" />
          </div>
          {(expanded || isMobile) && (
            <div className="flex flex-col truncate">
              <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-white via-slate-200 to-blue-200 bg-clip-text text-transparent">
                THPT TTLN
              </span>
              <span className="text-[10px] font-medium text-slate-400 tracking-wide uppercase">
                EdTech Portal
              </span>
            </div>
          )}
        </Link>
        {!isMobile && (
          <button 
            onClick={() => setExpanded(!expanded)} 
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title={expanded ? "Thu gọn sidebar" : "Mở rộng sidebar"}
          >
            <Menu size={18} />
          </button>
        )}
      </div>

      {/* Role Badge Indicator */}
      {(expanded || isMobile) && (
        <div className="px-4 pt-3.5 pb-1">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                userRole === 'admin' ? 'bg-indigo-400 animate-ping' :
                userRole === 'teacher' ? 'bg-emerald-400' : 'bg-blue-400'
              }`} />
              <span className="text-[11px] font-semibold text-slate-300">
                {getRoleLabel()} Portal
              </span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-700 text-slate-300 font-mono font-medium">
              v2.5
            </span>
          </div>
        </div>
      )}

      {/* Navigation Sections */}
      <div className="flex-1 py-3 px-3 overflow-y-auto space-y-4 custom-scrollbar">
        {sections.map((sec, idx) => (
          <div key={idx}>
            {(expanded || isMobile) && (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                {sec.title}
              </p>
            )}
            <div className="space-y-0.5">
              {sec.items.map(item => (
                <SidebarItem
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  path={item.path}
                  active={location.pathname === item.path}
                  expanded={expanded || isMobile}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/95 shrink-0">
        <Link 
          to="/profile" 
          className="flex items-center p-2 rounded-xl hover:bg-slate-800/80 transition-colors group mb-1.5"
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-md ${
            userRole === 'admin' ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white' :
            userRole === 'teacher' ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white' :
            'bg-gradient-to-tr from-blue-600 to-cyan-600 text-white'
          }`}>
            {getUserName().charAt(0).toUpperCase()}
          </div>
          {(expanded || isMobile) && (
            <div className="ml-2.5 overflow-hidden text-left flex-1">
              <p className="text-xs font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                {getUserName()}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {getUserEmail()}
              </p>
            </div>
          )}
        </Link>

        <button 
          onClick={handleLogout}
          className="flex items-center text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 transition-colors w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold"
        >
          <LogOut size={15} className="shrink-0" />
          {(expanded || isMobile) && <span className="ml-2.5">Đăng xuất</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      {/* Desktop Sidebar */}
      <motion.aside 
        animate={{ width: expanded ? 260 : 76 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="z-30 hidden md:flex flex-col h-full shadow-2xl border-r border-slate-800/60 shrink-0"
      >
        {renderSidebarContent(false)}
      </motion.aside>

      {/* Mobile Drawer Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside 
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 z-50 md:hidden shadow-2xl"
            >
              {renderSidebarContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Modern Topbar */}
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between px-4 md:px-6 z-20 transition-colors duration-200">
          {/* Left: Mobile Toggle & Page Title / Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden transition-colors"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb / Title */}
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <School size={15} />
                THPT TTLN
              </span>
              <ChevronRight size={14} className="text-slate-400" />
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {userRole === 'admin' ? 'Quản Trị Ban Giám Hiệu' : userRole === 'teacher' ? 'Cổng Giáo Viên' : 'Cổng Học Sinh'}
              </span>
            </div>
          </div>

          {/* Center: Quick Search Trigger */}
          <div className="flex-1 max-w-md mx-4 hidden lg:block">
            <button
              onClick={() => setShowSearchModal(true)}
              className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 text-slate-400 dark:text-slate-400 text-xs hover:border-blue-400 dark:hover:border-blue-500 hover:text-slate-600 dark:hover:text-slate-200 transition-all shadow-xs"
            >
              <div className="flex items-center gap-2 truncate">
                <Search size={15} />
                <span>Tìm kiếm nhanh chức năng, học sinh, lớp học...</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-500 dark:text-slate-400">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right Action Icons: Search Icon (Mobile), Theme Switcher, Notifications, User Profile */}
          <div className="flex items-center space-x-2 md:space-x-3">
            {/* Search Button for Mobile */}
            <button 
              onClick={() => setShowSearchModal(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition-colors"
              title="Tìm kiếm"
            >
              <Search size={18} />
            </button>

            {/* Dark / Light Mode Switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={theme === 'dark' ? "Chuyển sang chế độ Sáng" : "Chuyển sang chế độ Tối"}
            >
              {theme === 'dark' ? (
                <Sun size={19} className="text-amber-400 hover:rotate-45 transition-transform duration-300" />
              ) : (
                <Moon size={19} className="text-slate-600 hover:-rotate-12 transition-transform duration-300" />
              )}
            </button>

            {/* Notification Bell with Popup */}
            <div className="relative" ref={notifMenuRef}>
              <button 
                onClick={() => setShowNotificationMenu(!showNotificationMenu)}
                className="relative p-2 rounded-xl text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Thông báo"
              >
                <Bell size={19} />
                {notificationsList.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
                )}
              </button>

              {/* Notification Dropdown */}
              <AnimatePresence>
                {showNotificationMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-3 z-50 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Bell size={16} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Thông báo mới nhất</span>
                      </div>
                      <Link 
                        to="/notifications" 
                        onClick={() => setShowNotificationMenu(false)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Xem tất cả
                      </Link>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 custom-scrollbar">
                      {notificationsList.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs">
                          Không có thông báo mới nào
                        </div>
                      ) : (
                        notificationsList.map((notif, idx) => (
                          <Link
                            key={notif.id || idx}
                            to="/notifications"
                            onClick={() => setShowNotificationMenu(false)}
                            className="block p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">
                                <BellRing size={14} />
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                                  {notif.title || notif.tieuDe || 'Thông báo từ nhà trường'}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                                  {notif.content || notif.noiDung || 'Nhấn để xem chi tiết thông báo...'}
                                </p>
                                <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                  <Clock size={10} />
                                  {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString('vi-VN') : 'Gần đây'}
                                </span>
                              </div>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Profile Pill & Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 transition-all duration-200"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-xs ${
                  userRole === 'admin' ? 'bg-gradient-to-tr from-indigo-600 to-purple-600' :
                  userRole === 'teacher' ? 'bg-gradient-to-tr from-emerald-600 to-teal-600' :
                  'bg-gradient-to-tr from-blue-600 to-cyan-600'
                }`}>
                  {getUserName().charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight truncate max-w-[110px]">
                    {getUserName()}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400 leading-none">
                    {getRoleLabel()}
                  </p>
                </div>
              </button>

              {/* User Menu Dropdown */}
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{getUserName()}</p>
                      <p className="text-[11px] text-slate-400 truncate">{getUserEmail()}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <UserCircle size={16} className="text-slate-400" />
                        Hồ sơ & Mật khẩu
                      </Link>

                      {userRole === 'admin' && (
                        <Link
                          to="/settings"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Settings size={16} className="text-slate-400" />
                          Cài đặt hệ thống
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      >
                        <LogOut size={16} />
                        Đăng xuất
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50/70 dark:bg-[#0b0f19] p-4 sm:p-6 lg:p-8 transition-colors duration-200 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Global Spotlight Search Modal (Ctrl+K) */}
      <AnimatePresence>
        {showSearchModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSearchModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4"
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              >
                {/* Search Bar Input */}
                <div className="flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                  <Search size={18} className="text-slate-400 shrink-0 mr-3" />
                  <input 
                    type="text"
                    autoFocus
                    placeholder="Gõ tên chức năng cần điều hướng nhanh..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none"
                  />
                  <button 
                    onClick={() => setShowSearchModal(false)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Quick Results List */}
                <div className="max-h-80 overflow-y-auto p-2 custom-scrollbar">
                  {searchResults.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Không tìm thấy chức năng phù hợp với từ khóa "{searchQuery}"
                    </div>
                  ) : (
                    searchResults.map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            navigate(item.path);
                            setShowSearchModal(false);
                            setSearchQuery('');
                          }}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <Icon size={16} />
                            </div>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              {item.label}
                            </span>
                          </div>
                          <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Shortcut Footer */}
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Điều hướng bằng bàn phím</span>
                  <span className="font-mono text-[10px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    ESC để đóng
                  </span>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardLayout;
