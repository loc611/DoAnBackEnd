import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Phone, Mail, Award, Search, Filter, BookOpen, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';

const HomeroomClass = () => {
  const [loading, setLoading] = useState(true);
  const [homeroomClass, setHomeroomClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    maleCount: 0,
    femaleCount: 0,
    avgScore: 0
  });

  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  useEffect(() => {
    fetchHomeroomData();
  }, []);

  const fetchHomeroomData = async () => {
    try {
      setLoading(true);
      // 1. Fetch user's profile to get homeroom class
      const userRes = await api.get('/auth/me');
      const currentUser = userRes.data?.user || userData;
      const myHomeroom = currentUser.homeroomClasses && currentUser.homeroomClasses.length > 0
        ? currentUser.homeroomClasses[0]
        : null;

      if (!myHomeroom) {
        // Try to fetch all classes and find where homeroomTeacher matches
        const classesRes = await api.get('/classes');
        const found = classesRes.data.find(c => c.homeroomTeacher?.userId === currentUser.id || c.homeroomTeacherId === currentUser.profileId);
        if (found) {
          setHomeroomClass(found);
          fetchStudentsForClass(found.id);
        } else {
          setHomeroomClass(null);
          setLoading(false);
        }
        return;
      }

      setHomeroomClass(myHomeroom);
      await fetchStudentsForClass(myHomeroom.id);
    } catch (err) {
      console.error('Error loading homeroom class:', err);
      setLoading(false);
    }
  };

  const fetchStudentsForClass = async (classId) => {
    try {
      const res = await api.get(`/classes/${classId}/students`);
      const studentList = res.data || [];
      setStudents(studentList);

      const male = studentList.filter(s => s.gender === 'Nam').length;
      const female = studentList.filter(s => s.gender === 'Nữ').length;
      setStats({
        total: studentList.length,
        maleCount: male,
        femaleCount: female,
        avgScore: 8.2
      });
    } catch (err) {
      console.error('Failed to get students for homeroom class', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.parentPhone && s.parentPhone.includes(searchTerm))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!homeroomClass) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center max-w-xl mx-auto shadow-sm border border-gray-100 mt-8">
        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Chưa được phân công Lớp Chủ Nhiệm</h2>
        <p className="text-gray-500 text-sm mt-2">
          Hiện tại bạn chưa được phân công làm giáo viên chủ nhiệm cho lớp nào trong năm học này. Vui lòng liên hệ Admin nếu cần hỗ trợ.
        </p>
        <Link to="/grades" className="mt-6 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm shadow-emerald-600/20">
          Chuyển sang Sổ Nhập Điểm <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                Lớp Chủ Nhiệm
              </span>
              <span className="text-emerald-100 text-sm">Năm học: {homeroomClass.academicYear || '2026-2027'}</span>
            </div>
            <h1 className="text-3xl font-extrabold">Lớp {homeroomClass.className}</h1>
            <p className="text-emerald-50 mt-1 text-sm">
              Giáo viên chủ nhiệm: <strong>{userData.name}</strong> • Khối {homeroomClass.grade}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/10 text-center">
            <div className="px-3 py-1">
              <p className="text-xs text-emerald-100">Sĩ số</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="px-3 py-1 border-x border-white/20">
              <p className="text-xs text-emerald-100">Nam / Nữ</p>
              <p className="text-lg font-bold">{stats.maleCount} / {stats.femaleCount}</p>
            </div>
            <div className="px-3 py-1">
              <p className="text-xs text-emerald-100">Trạng thái</p>
              <p className="text-sm font-bold text-emerald-200 mt-1">Đang học</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Roster Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50">
          <div className="relative w-full sm:w-80">
            <Search size={18} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên học sinh, mã HS, SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              to="/grades"
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium rounded-xl text-sm transition-colors border border-emerald-200"
            >
              <BookOpen size={16} /> Nhập điểm lớp này
            </Link>
          </div>
        </div>

        {/* Student Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">STT</th>
                <th className="px-6 py-4">Mã HS</th>
                <th className="px-6 py-4">Họ và Tên</th>
                <th className="px-6 py-4">Giới tính</th>
                <th className="px-6 py-4">Số điện thoại</th>
                <th className="px-6 py-4">Phụ huynh & Liên hệ</th>
                <th className="px-6 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.map((student, idx) => (
                <tr key={student.id} className="hover:bg-emerald-50/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-400">{idx + 1}</td>
                  <td className="px-6 py-4 font-semibold text-emerald-700">
                    {student.studentCode}
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        {student.fullName.charAt(0)}
                      </div>
                      <span>{student.fullName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      student.gender === 'Nữ' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {student.gender || 'Chưa rõ'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-700">
                    {student.phone || <span className="text-gray-400 italic">Chưa có</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-800">{student.parentName || 'Chưa cập nhật'}</p>
                      {student.parentPhone && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Phone size={12} className="text-emerald-600" /> {student.parentPhone}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link
                      to={`/students/${student.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-medium text-gray-700 transition-colors"
                    >
                      Hồ sơ <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                    Không tìm thấy học sinh nào trong danh sách.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HomeroomClass;
