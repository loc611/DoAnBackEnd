import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, BookOpen, GraduationCap } from 'lucide-react';

const RoleSelection = () => {
  const roles = [
    {
      id: 'student',
      title: 'Học sinh',
      description: 'Tra cứu điểm số, thời khóa biểu và thông báo từ nhà trường.',
      icon: GraduationCap,
      path: '/login/student',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      lightBg: 'bg-blue-50'
    },
    {
      id: 'teacher',
      title: 'Giáo viên',
      description: 'Quản lý lớp học, nhập điểm và theo dõi tình hình học sinh.',
      icon: BookOpen,
      path: '/login/teacher',
      color: 'bg-emerald-500',
      hoverColor: 'hover:bg-emerald-600',
      lightBg: 'bg-emerald-50'
    },
    {
      id: 'admin',
      title: 'Quản trị viên',
      description: 'Quản lý toàn bộ hệ thống, phân quyền và thống kê dữ liệu.',
      icon: ShieldCheck,
      path: '/login/admin',
      color: 'bg-slate-800',
      hoverColor: 'hover:bg-slate-900',
      lightBg: 'bg-slate-100'
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-gray-900 mb-4"
          >
            Hệ thống Quản lý School TTLN
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600"
          >
            Vui lòng chọn vai trò của bạn để tiếp tục đăng nhập
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role, index) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Link 
                to={role.path}
                className={`block h-full ${role.lightBg} rounded-3xl p-8 border border-transparent hover:border-gray-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group`}
              >
                <div className={`${role.color} w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <role.icon size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{role.title}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {role.description}
                </p>
                <div className="mt-8 flex items-center text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  Đăng nhập ngay
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
