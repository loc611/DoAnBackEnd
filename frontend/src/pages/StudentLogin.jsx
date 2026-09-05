import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Mail, Lock, ArrowLeft } from 'lucide-react';
import api from '../services/api';

const StudentLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      if (user.role !== 'student') {
         setErrorMsg('Tài khoản này không có quyền Học sinh!');
         return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('userRole', user.role);
      localStorage.setItem('userData', JSON.stringify(user));
      navigate('/');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Lỗi kết nối máy chủ');
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Link to="/login" className="absolute top-6 left-6 flex items-center text-gray-600 hover:text-blue-600 transition-colors font-medium">
        <ArrowLeft size={20} className="mr-2" />
        Quay lại
      </Link>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden"
      >
        <div className="bg-white p-8 pb-0 text-center relative overflow-hidden">
           <GraduationCap size={48} className="mx-auto mb-4 text-blue-600" />
           <h2 className="text-2xl font-bold text-gray-800">Cổng Học Sinh</h2>
           <p className="text-gray-500 mt-2 text-sm">Đăng nhập để xem điểm và lịch học</p>
        </div>

        <div className="p-8">
            {errorMsg && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl text-center font-medium">
                    {errorMsg}
                </div>
            )}
            <form onSubmit={handleLogin} className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Mã Học sinh, Email hoặc Tên đăng nhập</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Mail size={18} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3.5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm bg-gray-50 font-medium"
                            placeholder="student, HS123456 hoặc hs@school.edu.vn"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock size={20} className="text-gray-400" />
                        </div>
                        <input
                            type="password"
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all sm:text-sm bg-gray-50"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                        <label className="ml-2 block text-sm text-gray-700">Ghi nhớ</label>
                    </div>
                    <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">Quên mật khẩu?</a>
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white font-medium rounded-xl py-3 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30">
                    Đăng nhập
                </button>
            </form>
        </div>
      </motion.div>
    </div>
  );
};

export default StudentLogin;
