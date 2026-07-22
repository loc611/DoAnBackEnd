import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, Lock, ArrowLeft } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Simulate real authentication
    if (email === 'admin@school.edu.vn' && password === 'admin123') {
      localStorage.setItem('userRole', 'admin');
      navigate('/');
    } else {
      alert('Tài khoản hoặc mật khẩu không chính xác! (Gợi ý: admin@school.edu.vn / admin123)');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Link to="/login" className="absolute top-6 left-6 flex items-center text-gray-600 hover:text-slate-800 transition-colors font-medium">
        <ArrowLeft size={20} className="mr-2" />
        Quay lại
      </Link>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200"
      >
        <div className="bg-slate-800 p-8 text-center text-white relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
           <ShieldCheck size={64} className="mx-auto mb-4 relative z-10 text-slate-300" />
           <h2 className="text-2xl font-bold relative z-10">Cổng Quản Trị Viên</h2>
           <p className="text-slate-300 mt-2 text-sm relative z-10">Đăng nhập để quản lý toàn bộ hệ thống</p>
        </div>

        <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email quản trị</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail size={20} className="text-slate-400" />
                        </div>
                        <input
                            type="email"
                            className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all sm:text-sm bg-slate-50"
                            placeholder="admin@school.edu.vn"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Mật khẩu</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock size={20} className="text-slate-400" />
                        </div>
                        <input
                            type="password"
                            className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all sm:text-sm bg-slate-50"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <input type="checkbox" className="h-4 w-4 text-slate-800 focus:ring-slate-800 border-slate-300 rounded" />
                        <label className="ml-2 block text-sm text-slate-700">Ghi nhớ</label>
                    </div>
                    <a href="#" className="text-sm font-medium text-slate-600 hover:text-slate-900">Khôi phục quyền truy cập</a>
                </div>

                <button type="submit" className="w-full bg-slate-800 text-white font-medium rounded-xl py-3 hover:bg-slate-900 transition-colors shadow-lg shadow-slate-800/30">
                    Đăng nhập Hệ thống
                </button>
            </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
