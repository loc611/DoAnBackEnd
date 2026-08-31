import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  CalendarDays, 
  ArrowRight,
  Sparkles,
  HelpCircle,
  X,
  Award,
  Trophy,
  PhoneCall,
  School
} from 'lucide-react';
import api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const navigate = useNavigate();

  // Handle saved email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('userRole', user.role);
      localStorage.setItem('userData', JSON.stringify(user));

      if (rememberMe) {
        localStorage.setItem('rememberEmail', email);
      } else {
        localStorage.removeItem('rememberEmail');
      }

      navigate('/');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email hoặc mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  // School news & events items
  const schoolNews = [
    {
      icon: CalendarDays,
      badge: 'Lịch thi',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      title: 'Lịch kiểm tra & Đánh giá năng lực HK2',
      desc: 'Cập nhật danh sách phòng thi, số báo danh các khối 10, 11, 12.'
    },
    {
      icon: Trophy,
      badge: 'Sự kiện',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      title: 'Hội thao & Tuần lễ văn hóa TTLN 2026',
      desc: 'Lễ khai mạc và thi đấu giao lưu bóng đá, cầu lông giữa các chi đoàn.'
    },
    {
      icon: Award,
      badge: 'Học bổng',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      title: 'Vinh danh & Trao học bổng Khuyến học',
      desc: 'Tuyên dương 45 học sinh có thành tích xuất sắc và rèn luyện gương mẫu.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950/5 relative flex items-center justify-center p-3 sm:p-6 lg:p-10 font-sans overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Dynamic Background Gradients & Mesh Accent */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-blue-400/15 blur-[120px]" />
        <div className="absolute top-[30%] -right-[15%] w-[50vw] h-[50vw] rounded-full bg-indigo-400/15 blur-[140px]" />
        <div className="absolute -bottom-[20%] left-[25%] w-[45vw] h-[45vw] rounded-full bg-sky-300/15 blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#64748b_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.12]" />
      </div>

      {/* Main Widescreen Card Container (Enlarged) */}
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[1520px] bg-white rounded-[32px] md:rounded-[40px] shadow-2xl shadow-blue-950/10 overflow-hidden border border-slate-200/80 grid grid-cols-1 lg:grid-cols-12 min-h-[760px] relative z-10"
      >
        {/* Left Column: School Identity, News & Events (5 Cols on large screen) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-900 p-8 sm:p-12 lg:p-14 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Ambient Lighting on Banner */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

          {/* Top Brand Header */}
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-lg shadow-blue-950/20">
                  <GraduationCap size={32} className="text-white" />
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black tracking-tight block leading-tight text-white">
                    School TTLN
                  </span>
                  <span className="text-xs sm:text-sm text-blue-200 font-semibold tracking-wider uppercase flex items-center gap-1.5 mt-0.5">
                    <School size={15} className="text-blue-300" />
                    Trường THPT TTLN
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/20 text-xs font-semibold text-blue-100 mb-4 backdrop-blur-md shadow-sm">
                <Sparkles size={14} className="text-amber-300" />
                Hệ thống Quản lý Học sinh
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-white tracking-tight leading-snug">
                Khơi nguồn tri thức, <br />
                kiến tạo tương lai.
              </h2>
              <p className="text-sm sm:text-base text-blue-100/85 mt-3 leading-relaxed max-w-lg">
                Nền tảng số hóa quản lý giáo dục toàn diện, kết nối mật thiết giữa Nhà trường, Giáo viên, Học sinh và Phụ huynh.
              </p>
            </div>
          </div>

          {/* Center: School News & Events Bulletin Board */}
          <div className="my-7 relative z-10">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Bản tin & Sự kiện THPT TTLN
              </h3>
              <span className="text-[11px] text-blue-200/70 font-medium">Hôm nay</span>
            </div>

            <div className="space-y-3">
              {schoolNews.map((item, idx) => (
                <motion.div 
                  key={idx}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 transition-all duration-200 border border-white/10 backdrop-blur-sm group cursor-pointer"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-white/15 text-blue-100 shrink-0 mt-0.5 group-hover:scale-105 group-hover:bg-white/25 transition-all">
                      <item.icon size={19} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-white leading-snug truncate">
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-xs sm:text-sm text-blue-100/75 line-clamp-2 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="relative z-10 grid grid-cols-3 gap-3 p-4 rounded-2xl bg-black/15 border border-white/10 backdrop-blur-md mb-4">
            <div className="text-center">
              <div className="text-xl lg:text-2xl font-extrabold text-white">1.500+</div>
              <div className="text-xs text-blue-200 font-medium mt-0.5">Học sinh</div>
            </div>
            <div className="text-center border-x border-white/10">
              <div className="text-xl lg:text-2xl font-extrabold text-white">120+</div>
              <div className="text-xs text-blue-200 font-medium mt-0.5">Cán bộ & GV</div>
            </div>
            <div className="text-center">
              <div className="text-xl lg:text-2xl font-extrabold text-white">100%</div>
              <div className="text-xs text-blue-200 font-medium mt-0.5">Số hóa hồ sơ</div>
            </div>
          </div>

          {/* Left Footer Badges */}
          <div className="pt-4 border-t border-white/15 relative z-10 flex items-center justify-between text-xs sm:text-sm text-blue-200/90">
            <span>Phiên bản số 2026</span>
            <span className="text-blue-100 font-medium">Trường THPT TTLN</span>
          </div>
        </div>

        {/* Right Column: Expanded Form & Interactive Auth (7 Cols on large screen) */}
        <div className="lg:col-span-7 p-8 sm:p-12 lg:p-16 flex flex-col justify-between bg-white relative">
          <div className="w-full max-w-xl mx-auto my-auto py-4">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Đăng nhập hệ thống
              </h1>
              <p className="text-sm sm:text-base text-slate-500 font-medium mt-2">
                Nhập thông tin tài khoản được Nhà trường cấp để truy cập hệ thống
              </p>
            </div>

            {/* Error Message Box */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-2xl font-medium flex items-center gap-3 overflow-hidden shadow-sm"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 animate-ping" />
                  <span className="flex-1">{errorMsg}</span>
                  <button 
                    type="button" 
                    onClick={() => setErrorMsg('')}
                    className="p-1 hover:bg-rose-100 rounded-lg transition-colors text-rose-500"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Password Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2.5">
                  Email hoặc Tài khoản trường học
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={22} />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-13 sm:pl-14 pr-4 py-4 sm:py-4.5 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-600/15 focus:border-blue-600 outline-none transition-all text-base bg-slate-50/70 hover:bg-white focus:bg-white text-slate-800 placeholder-slate-400 font-medium"
                    placeholder="Nhập email hoặc tên tài khoản (admin, gv001, hs001...)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2.5">
                  Mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={22} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="block w-full pl-13 sm:pl-14 pr-13 sm:pr-14 py-4 sm:py-4.5 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-600/15 focus:border-blue-600 outline-none transition-all text-base bg-slate-50/70 hover:bg-white focus:bg-white text-slate-800 placeholder-slate-400 font-medium"
                    placeholder="Nhập mật khẩu của bạn"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 sm:pr-5 flex items-center text-slate-400 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot Actions */}
              <div className="flex items-center justify-between text-sm sm:text-base pt-1">
                <label className="flex items-center cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4.5 h-4.5 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer transition-colors"
                  />
                  <span className="ml-2.5 text-slate-600 group-hover:text-slate-900 transition-colors font-medium">
                    Ghi nhớ đăng nhập
                  </span>
                </label>
                <button 
                  type="button" 
                  onClick={() => setShowForgotModal(true)}
                  className="text-blue-600 hover:text-blue-700 font-bold transition-colors hover:underline cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold rounded-2xl py-4 sm:py-4.5 px-6 transition-all duration-200 shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/40 flex items-center justify-center disabled:opacity-70 cursor-pointer text-base sm:text-lg group"
              >
                {loading ? (
                  <>
                    <Loader2 size={22} className="animate-spin mr-2.5" />
                    <span>Đang xác thực hệ thống...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng nhập hệ thống</span>
                    <ArrowRight size={21} className="ml-2 group-hover:translate-x-1.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Bottom Helpdesk & Copyright Bar */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-slate-400">
            <div className="flex items-center gap-4 text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <PhoneCall size={14} className="text-blue-600" />
                Hotline hỗ trợ: <strong className="text-slate-700">028.3838.8899</strong>
              </span>
            </div>

            <div>
              © {new Date().getFullYear()} THPT TTLN. Bảo lưu mọi quyền.
            </div>
          </div>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative"
            >
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <HelpCircle size={26} />
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Hỗ trợ Khôi phục Mật khẩu
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-5">
                Để đảm bảo an toàn thông tin học tập và dữ liệu cá nhân, mật khẩu được quản lý tập trung theo chính sách bảo mật của Nhà trường:
              </p>

              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-700 mb-6">
                <div className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                  <span><strong>Học sinh / Phụ huynh:</strong> Liên hệ Giáo viên Chủ nhiệm hoặc Phòng Giám thị để nhận mã kích hoạt mới.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                  <span><strong>Giáo viên / Cán bộ:</strong> Gửi yêu cầu qua email nội bộ đến bộ phận IT: <strong>admin@ttln.edu.vn</strong>.</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-full py-3 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all cursor-pointer"
              >
                Đã hiểu & Đóng
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;
