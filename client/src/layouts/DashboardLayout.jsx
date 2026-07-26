import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  BookOpenCheck,
  GraduationCap, 
  Calendar, 
  Bell, 
  Menu,
  X,
  UserCircle,
  LogOut
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const SidebarItem = ({ icon: Icon, label, path, active, expanded }) => (
  <Link to={path} className={`flex items-center py-3 px-4 rounded-lg mb-2 transition-colors duration-200 ${active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
    <Icon size={20} className={expanded ? 'mr-4' : 'mx-auto'} />
    {expanded && <span>{label}</span>}
  </Link>
);

const DashboardLayout = () => {
  const [expanded, setExpanded] = useState(true);
  const location = useLocation();
  const userRole = localStorage.getItem('userRole') || 'student';
  const userDataStr = localStorage.getItem('userData');
  const userData = userDataStr ? JSON.parse(userDataStr) : null;
  
  const getUserName = () => userData?.name || (userRole === 'admin' ? 'Admin User' : userRole === 'teacher' ? 'Giáo viên' : 'Học sinh');
  const getUserEmail = () => userData?.email || `${userRole}@school.edu.vn`;
  const getRoleLabel = () => userRole === 'admin' ? 'Quản trị viên' : userRole === 'teacher' ? 'Giáo viên' : 'Học sinh';

  const allMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['admin', 'teacher', 'student'] },
    { icon: Users, label: 'Học sinh', path: '/students', roles: ['admin', 'teacher'] },
    { icon: GraduationCap, label: 'Giáo viên', path: '/teachers', roles: ['admin', 'teacher'] },
    { icon: BookOpen, label: 'Môn học', path: '/subjects', roles: ['admin'] },
    { icon: Calendar, label: 'Thời khóa biểu', path: '/schedule', roles: ['admin', 'teacher', 'student'] },
    { icon: BookOpenCheck, label: 'Quản lý điểm', path: '/grades', roles: ['admin', 'teacher', 'student'] },
  ];

  // Lọc menu theo quyền
  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-poppins">
      {/* Sidebar */}
      <motion.aside 
        animate={{ width: expanded ? 250 : 80 }}
        className="bg-gray-900 text-white flex flex-col transition-all duration-300 z-20 hidden md:flex relative"
      >
        <div className="flex items-center justify-between p-4 h-16 border-b border-gray-800">
          {expanded && <span className="font-bold text-xl tracking-wider text-blue-400">School Văn Lang</span>}
          <button onClick={() => setExpanded(!expanded)} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400">
            <Menu size={20} />
          </button>
        </div>
        
        <div className="flex-1 py-6 px-3 overflow-y-auto">
          {menuItems.map((item) => (
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
        
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-800 bg-gray-900">
            <div className="flex items-center mb-4 text-gray-300">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold mr-3 shrink-0">
                    {userRole === 'admin' ? 'AD' : userRole === 'teacher' ? 'GV' : 'HS'}
                </div>
                {expanded && (
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium text-white truncate">
                           {getUserName()}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                           {getUserEmail()}
                        </p>
                    </div>
                )}
            </div>
            <Link to="/login" onClick={() => { localStorage.removeItem('userRole'); localStorage.removeItem('token'); localStorage.removeItem('userData'); }} className="flex items-center text-red-400 hover:text-red-300 transition-colors w-full px-2 py-2 rounded-lg hover:bg-gray-800">
                <LogOut size={20} className="min-w-[20px]" />
                {expanded && <span className="ml-3 text-sm font-medium">Đăng xuất</span>}
            </Link>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Navbar */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 z-10">
            <div className="flex items-center md:hidden">
                <button className="text-gray-500 hover:text-gray-700">
                    <Menu size={24} />
                </button>
            </div>
            
            <div className="hidden md:block">
                <h2 className="text-xl font-semibold text-gray-800">Hệ thống Quản lý Học sinh</h2>
            </div>

            <div className="flex items-center space-x-4">
                <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <Bell size={20} />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                <div className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-gray-50 rounded-lg">
                    <UserCircle size={32} className="text-gray-600" />
                    <div className="hidden md:block text-sm">
                        <p className="font-semibold text-gray-700">{getUserName()}</p>
                        <p className="text-gray-500 text-xs">{getRoleLabel()}</p>
                    </div>
                </div>
            </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            <AnimatePresence mode="wait">
                <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
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
