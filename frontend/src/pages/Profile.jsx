import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Lock, Calendar, BookOpen, School, Shield, Save, CheckCircle } from 'lucide-react';
import api from '../services/api';
import Swal from 'sweetalert2';

const Profile = () => {
  const [userData, setUserData] = useState(() => {
    const saved = localStorage.getItem('userData');
    return saved ? JSON.parse(saved) : {};
  });
  const userRole = localStorage.getItem('userRole') || 'student';
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    const fetchLatestProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data?.user) {
          setUserData(res.data.user);
          localStorage.setItem('userData', JSON.stringify(res.data.user));
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };
    fetchLatestProfile();
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Swal.fire('Lỗi', 'Mật khẩu mới và xác nhận mật khẩu không khớp!', 'warning');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      Swal.fire('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự!', 'warning');
      return;
    }

    try {
      setUpdatingPassword(true);
      await api.patch(`/users/${userData.id}/reset-password`, {
        newPassword: passwordForm.newPassword
      });
      Swal.fire('Thành công', 'Đổi mật khẩu thành công!', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error(err);
      Swal.fire('Lỗi', err.response?.data?.message || 'Không thể đổi mật khẩu', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const getRoleBadge = () => {
    if (userRole === 'admin') return <span className="bg-indigo-100 text-indigo-700 font-semibold px-3 py-1 rounded-full text-xs">Quản trị viên</span>;
    if (userRole === 'teacher') return <span className="bg-emerald-100 text-emerald-700 font-semibold px-3 py-1 rounded-full text-xs">Giáo viên</span>;
    return <span className="bg-blue-100 text-blue-700 font-semibold px-3 py-1 rounded-full text-xs">Học sinh</span>;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Profile Card */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 translate-x-12 -translate-y-12">
          <School size={300} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-4xl font-extrabold shadow-md">
            {userData.name ? userData.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <h1 className="text-3xl font-bold">{userData.name || 'Người dùng'}</h1>
              {getRoleBadge()}
            </div>
            <p className="text-blue-100 mt-1 flex items-center justify-center md:justify-start gap-2">
              <Mail size={16} /> {userData.email}
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4 text-sm text-blue-50">
              {userData.studentCode && (
                <div className="bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-white/10">
                  <span className="opacity-80">Mã học sinh:</span> <strong>{userData.studentCode}</strong>
                </div>
              )}
              {userData.className && (
                <div className="bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-white/10">
                  <span className="opacity-80">Lớp học:</span> <strong>{userData.className}</strong>
                </div>
              )}
              {userData.teacherCode && (
                <div className="bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-white/10">
                  <span className="opacity-80">Mã GV:</span> <strong>{userData.teacherCode}</strong>
                </div>
              )}
              {userData.specialization && (
                <div className="bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-white/10">
                  <span className="opacity-80">Chuyên môn:</span> <strong>{userData.specialization}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Personal Information */}
        <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-4">
            <User size={20} className="text-blue-600" />
            Thông tin chi tiết tài khoản
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <label className="text-xs text-gray-500 font-medium">Tên đăng nhập</label>
              <p className="text-base font-semibold text-gray-800 mt-1">{userData.username}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <label className="text-xs text-gray-500 font-medium">Email chính</label>
              <p className="text-base font-semibold text-gray-800 mt-1">{userData.email}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <label className="text-xs text-gray-500 font-medium">Số điện thoại</label>
              <p className="text-base font-semibold text-gray-800 mt-1">{userData.phone || 'Chưa cập nhật'}</p>
            </div>

            {userRole === 'student' && (
              <>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <label className="text-xs text-gray-500 font-medium">Giáo viên chủ nhiệm</label>
                  <p className="text-base font-semibold text-gray-800 mt-1">{userData.homeroomTeacher || 'Chưa phân công'}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <label className="text-xs text-gray-500 font-medium">Họ tên Phụ huynh</label>
                  <p className="text-base font-semibold text-gray-800 mt-1">{userData.parentName || 'Chưa cập nhật'}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <label className="text-xs text-gray-500 font-medium">SĐT Phụ huynh</label>
                  <p className="text-base font-semibold text-gray-800 mt-1">{userData.parentPhone || 'Chưa cập nhật'}</p>
                </div>
              </>
            )}

            {userRole === 'teacher' && userData.homeroomClasses?.length > 0 && (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 sm:col-span-2">
                <label className="text-xs text-emerald-600 font-medium">Lớp chủ nhiệm</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {userData.homeroomClasses.map(c => (
                    <span key={c.id} className="bg-emerald-600 text-white text-sm font-semibold px-3 py-1 rounded-lg">
                      Lớp {c.className} (Khối {c.grade})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Change Password */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-4 mb-4">
              <Lock size={20} className="text-indigo-600" />
              Đổi mật khẩu
            </h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Xác nhận mật khẩu</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={updatingPassword}
                className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20"
              >
                <Save size={16} />
                {updatingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-1.5">
            <Shield size={14} className="text-emerald-500" />
            Bảo mật tài khoản với phiên đăng nhập mã hóa JWT.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
