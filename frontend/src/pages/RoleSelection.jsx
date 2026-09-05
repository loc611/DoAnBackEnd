import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, BookOpen, GraduationCap, School, Sparkles, CheckCircle2 } from 'lucide-react';

const RoleSelection = () => {
  const roles = [
    {
      id: 'student',
      title: 'Học sinh & Phụ huynh',
      badge: 'Cổng Học Sinh',
      description: 'Tra cứu bảng điểm, xem thời khóa biểu, lịch thi và theo dõi các khoản học phí.',
      icon: GraduationCap,
      path: '/login/student',
      color: 'bg-indigo-600',
      lightBg: 'bg-indigo-50/70 dark:bg-indigo-950/30',
      borderColor: 'border-indigo-100 dark:border-indigo-900/50',
      tagColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
    },
    {
      id: 'teacher',
      title: 'Cán bộ Giáo viên',
      badge: 'Cổng Giảng Dạy',
      description: 'Quản lý lớp chủ nhiệm, nhập & công bố điểm số, điểm danh và quản lý môn học.',
      icon: BookOpen,
      path: '/login/teacher',
      color: 'bg-blue-600',
      lightBg: 'bg-blue-50/70 dark:bg-blue-950/30',
      borderColor: 'border-blue-100 dark:border-blue-900/50',
      tagColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
    },
    {
      id: 'admin',
      title: 'Quản trị & Quản khoa',
      badge: 'Trung Tâm Quản Trị',
      description: 'Cấp phát tài khoản, phân công giảng dạy, cấu hình năm học và điều hành toàn trường.',
      icon: ShieldCheck,
      path: '/login/admin',
      color: 'bg-slate-800 dark:bg-slate-700',
      lightBg: 'bg-slate-50 dark:bg-slate-900/50',
      borderColor: 'border-slate-200 dark:border-slate-800',
      tagColor: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-blue-50/30 dark:from-[#0b0f19] dark:via-[#0f172a] dark:to-[#0b0f19] flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <div className="max-w-5xl w-full">
        {/* Header Branding */}
        <div className="text-center mb-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold tracking-wide uppercase mb-4 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Cổng Thông Tin Điện Tử Nhà Trường
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex items-center justify-center gap-3 mb-3"
          >
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
              <School className="w-8 h-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Hệ Thống Quản Lý Học Sinh
            </h1>
          </motion.div>

          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto"
          >
            Vui lòng chọn cổng truy cập tương ứng với vai trò của bạn để đăng nhập hệ thống
          </motion.p>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role, index) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.1 }}
            >
              <Link 
                to={role.path}
                className={`block h-full ${role.lightBg} rounded-3xl p-8 border ${role.borderColor} transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5 group relative overflow-hidden`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className={`${role.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                    <role.icon size={28} />
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${role.tagColor}`}>
                    {role.badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {role.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed min-h-[50px]">
                  {role.description}
                </p>

                <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  <span>Đăng nhập cổng</span>
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Security Note Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center text-xs text-slate-500 dark:text-slate-500 flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Tài khoản được cấp độc quyền và phân quyền bảo mật bởi Ban Quản Trị Nhà Trường</span>
        </motion.div>
      </div>
    </div>
  );
};

export default RoleSelection;
