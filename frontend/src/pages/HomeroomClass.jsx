import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Phone, Mail, Award, Search, Filter, BookOpen, AlertCircle, CheckCircle, ArrowRight, UserPlus, UserMinus, X, Sparkles, GraduationCap, Download, Printer, FileSpreadsheet } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import StudentGradeReportCardModal from '../components/StudentGradeReportCardModal';

const AddStudentModal = ({ isOpen, onClose, classId, onSuccess }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchEligibleStudents();
      setSelectedIds([]);
      setSearchTerm('');
    }
  }, [isOpen]);

  const fetchEligibleStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/students');
      const allStudents = res.data || [];
      const eligible = allStudents
        .filter(s => s.classId !== classId)
        .map(s => ({
          id: s.id,
          studentCode: s.studentCode,
          fullName: s.fullName,
          gender: s.gender,
          phone: s.phone,
          currentClass: s.class?.className || 'Chưa xếp lớp'
        }));
      setStudents(eligible);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (studentId) => {
    setSelectedIds(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleAdd = async () => {
    if (selectedIds.length === 0) return;
    try {
      setLoading(true);
      await api.post(`/classes/${classId}/students`, { studentIds: selectedIds });
      Swal.fire('Thành công', `Đã thêm ${selectedIds.length} học sinh vào lớp chủ nhiệm`, 'success');
      onSuccess();
      onClose();
    } catch (error) {
      Swal.fire('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra khi thêm học sinh', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.studentCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200"
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Thêm Học Sinh Vào Lớp Chủ Nhiệm</h2>
              <p className="text-xs text-slate-500">Chọn học sinh từ danh sách toàn trường để đưa vào lớp</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-xl hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã học sinh, họ tên..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-slate-50 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[380px]">
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Đang tải danh sách học sinh...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Không tìm thấy học sinh phù hợp.</div>
          ) : (
            filteredStudents.map(student => {
              const isSelected = selectedIds.includes(student.id);
              return (
                <div 
                  key={student.id} 
                  onClick={() => handleToggleSelect(student.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected 
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => {}} 
                      className="w-4.5 h-4.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{student.fullName}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {student.studentCode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Lớp hiện tại: <strong className="text-slate-700">{student.currentClass}</strong> • {student.gender || 'Nam'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">
            Đã chọn: <strong className="text-emerald-700">{selectedIds.length}</strong> học sinh
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-sm font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedIds.length === 0 || loading}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            >
              <UserPlus size={16} /> Xác nhận thêm ({selectedIds.length})
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const HomeroomClass = () => {
  const [loading, setLoading] = useState(true);
  const [homeroomClass, setHomeroomClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    maleCount: 0,
    femaleCount: 0
  });

  const [isReportCardOpen, setIsReportCardOpen] = useState(false);
  const [classGrades, setClassGrades] = useState([]);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState(null);
  const [loadingGrades, setLoadingGrades] = useState(false);

  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  useEffect(() => {
    fetchHomeroomData();
  }, []);

  const fetchHomeroomData = async () => {
    try {
      setLoading(true);
      const userRes = await api.get('/auth/me');
      const currentUser = userRes.data?.user || userData;
      const myHomeroom = currentUser.homeroomClasses && currentUser.homeroomClasses.length > 0
        ? currentUser.homeroomClasses[0]
        : null;

      if (!myHomeroom) {
        const classesRes = await api.get('/classes');
        const found = classesRes.data.find(c => c.homeroomTeacher?.userId === currentUser.id || c.homeroomTeacherId === currentUser.profileId);
        if (found) {
          setHomeroomClass(found);
          await fetchStudentsForClass(found.id);
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
        femaleCount: female
      });
    } catch (err) {
      console.error('Failed to get students for homeroom class', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportStudentsList = () => {
    if (students.length === 0) {
      Swal.fire('Thông báo', 'Không có học sinh trong danh sách để xuất', 'info');
      return;
    }
    const headers = 'STT,Mã Học Sinh,Họ và Tên,Giới Tính,Ngày Sinh,Số Điện Thoại,Họ Tên Phụ Huynh,SĐT Phụ Huynh,Địa Chỉ,Lớp\n';
    const rows = students.map((s, idx) => {
      const dobFormatted = s.dob ? new Date(s.dob).toLocaleDateString('vi-VN') : '';
      return `"${idx + 1}","${s.studentCode || s.id}","${s.fullName || ''}","${s.gender || 'Nam'}","${dobFormatted}","${s.phone || ''}","${s.parentName || ''}","${s.parentPhone || ''}","${s.address || ''}","${homeroomClass?.className || ''}"`;
    }).join('\n');

    const csvContent = '\uFEFF' + headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Danh_Sach_Hoc_Sinh_Lop_${homeroomClass?.className || 'CN'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire('Thành công', `Đã xuất danh sách ${students.length} học sinh lớp ${homeroomClass?.className} ra file Excel!`, 'success');
  };

  const handleOpenClassReport = async (student = null) => {
    if (!homeroomClass) return;
    try {
      setLoadingGrades(true);
      const res = await api.get(`/grades/class/${homeroomClass.id}?semester=HK1_2026`);
      const list = Array.isArray(res.data) ? res.data : (res.data?.students || []);
      const formatted = list.map(item => {
        const math = item.scores?.math ?? 0;
        const lit = item.scores?.literature ?? 0;
        const eng = item.scores?.english ?? 0;
        const phy = item.scores?.physics ?? 0;
        const chem = item.scores?.chemistry ?? 0;
        const it = item.scores?.it ?? 0;
        const avg = ((math + lit + eng + phy + chem + it) / 6).toFixed(2);
        return {
          id: item.id,
          studentId: item.studentId,
          studentCode: item.studentCode || item.id,
          name: item.name,
          dob: item.dob,
          gender: item.gender,
          math,
          literature: lit,
          english: eng,
          physics: phy,
          chemistry: chem,
          it,
          average: avg,
          rank: avg >= 8.0 ? 'Giỏi' : avg >= 6.5 ? 'Khá' : avg >= 5.0 ? 'Trung bình' : 'Yếu',
          status: item.status || 'draft'
        };
      });

      setClassGrades(formatted);
      if (student) {
        const found = formatted.find(s => s.studentCode === student.studentCode || s.id === student.id || s.studentId === student.id);
        setSelectedStudentForReport(found || {
          studentCode: student.studentCode,
          name: student.fullName,
          gender: student.gender,
          dob: student.dob,
          math: 0,
          literature: 0,
          english: 0,
          physics: 0,
          chemistry: 0,
          it: 0,
          average: '0.00',
          rank: 'Chưa có điểm',
          status: 'draft'
        });
      } else {
        setSelectedStudentForReport(null);
      }
      setIsReportCardOpen(true);
    } catch (err) {
      console.error(err);
      Swal.fire('Lỗi', 'Không thể tải bảng điểm cho lớp này', 'error');
    } finally {
      setLoadingGrades(false);
    }
  };

  const handleRemoveStudent = async (student) => {
    const result = await Swal.fire({
      title: 'Xóa học sinh khỏi lớp?',
      text: `Bạn có chắc muốn xóa học sinh ${student.fullName} (${student.studentCode}) khỏi lớp chủ nhiệm này?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: 'Hủy',
      confirmButtonText: 'Đồng ý xóa'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/classes/${homeroomClass.id}/students/${student.id}`);
        Swal.fire('Thành công', 'Đã xóa học sinh khỏi lớp chủ nhiệm', 'success');
        fetchStudentsForClass(homeroomClass.id);
      } catch (error) {
        Swal.fire('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra khi xóa học sinh', 'error');
      }
    }
  };

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.phone && s.phone.includes(searchTerm)) ||
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
      <div className="bg-white rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm border border-slate-100 mt-8">
        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Chưa được phân công Lớp Chủ Nhiệm</h2>
        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
          Hiện tại tài khoản của bạn chưa được chỉ định làm Giáo viên chủ nhiệm cho lớp nào trong năm học này. Vui lòng liên hệ Ban Giám Hiệu hoặc Quản trị viên để được phân lớp.
        </p>
        <Link to="/grades" className="mt-6 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-md shadow-emerald-600/20">
          Chuyển sang Sổ Nhập Điểm <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-300" />
                Lớp Chủ Nhiệm
              </span>
              <span className="text-emerald-100 text-sm font-medium">Năm học: {homeroomClass.academicYear || '2026-2027'}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Lớp {homeroomClass.className}</h1>
            <p className="text-emerald-100 mt-1.5 text-sm font-medium">
              Giáo viên chủ nhiệm: <strong className="text-white font-bold">{userData.name}</strong> • Khối {homeroomClass.grade}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-white/15 p-4 rounded-2xl backdrop-blur-md border border-white/20 text-center min-w-[300px]">
            <div className="px-3 py-1">
              <p className="text-xs text-emerald-100 font-medium">Sĩ số</p>
              <p className="text-2xl font-black text-white">{stats.total}</p>
            </div>
            <div className="px-3 py-1 border-x border-white/20">
              <p className="text-xs text-emerald-100 font-medium">Nam / Nữ</p>
              <p className="text-lg font-bold text-white mt-1">{stats.maleCount} / {stats.femaleCount}</p>
            </div>
            <div className="px-3 py-1">
              <p className="text-xs text-emerald-100 font-medium">Trạng thái</p>
              <span className="inline-block text-xs font-bold bg-emerald-400/30 text-emerald-100 px-2.5 py-1 rounded-full mt-1">
                Đang học
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Roster Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative w-full lg:w-80">
            <Search size={18} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên học sinh, mã HS, SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            <button
              onClick={handleExportStudentsList}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer shadow-xs"
              title="Xuất danh sách học sinh ra file Excel (.csv chuẩn UTF-8)"
            >
              <Download size={16} className="text-emerald-600" /> Xuất Excel Lớp
            </button>

            <button
              onClick={() => handleOpenClassReport(null)}
              disabled={loadingGrades}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer shadow-xs"
              title="In phiếu báo điểm / học bạ cho lớp chủ nhiệm"
            >
              <Printer size={16} className="text-blue-600" /> {loadingGrades ? 'Đang tải...' : 'In Phiếu Điểm Cả Lớp'}
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <UserPlus size={16} /> Thêm HS
            </button>

            <Link
              to="/grades"
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white text-emerald-700 hover:bg-emerald-50 font-bold rounded-xl text-xs sm:text-sm transition-colors border border-emerald-200"
            >
              <BookOpen size={16} /> Sổ điểm
            </Link>
          </div>
        </div>

        {/* Student Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">STT</th>
                <th className="px-6 py-4">Mã Học Sinh</th>
                <th className="px-6 py-4">Họ và Tên</th>
                <th className="px-6 py-4">Giới tính</th>
                <th className="px-6 py-4">Số điện thoại</th>
                <th className="px-6 py-4">Phụ huynh & Liên hệ</th>
                <th className="px-6 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student, idx) => (
                <tr key={student.id} className="hover:bg-emerald-50/40 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-400">{idx + 1}</td>
                  <td className="px-6 py-4 font-bold text-emerald-700">
                    {student.studentCode}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        {student.fullName?.charAt(0) || 'H'}
                      </div>
                      <span>{student.fullName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      student.gender === 'Nữ' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {student.gender || 'Nam'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">
                    {student.phone || <span className="text-slate-400 italic">Chưa có</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-slate-800">{student.parentName || 'Chưa cập nhật'}</p>
                      {student.parentPhone && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone size={12} className="text-emerald-600" /> {student.parentPhone}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Link
                        to={`/students/${student.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                        title="Xem chi tiết hồ sơ"
                      >
                        Hồ sơ
                      </Link>
                      <button
                        onClick={() => handleOpenClassReport(student)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title={`In phiếu báo điểm cho ${student.fullName}`}
                      >
                        <Printer size={16} />
                      </button>
                      <button
                        onClick={() => handleRemoveStudent(student)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa học sinh khỏi lớp chủ nhiệm"
                      >
                        <UserMinus size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    Không tìm thấy học sinh nào trong danh sách.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isAddModalOpen && (
          <AddStudentModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            classId={homeroomClass.id}
            onSuccess={() => fetchStudentsForClass(homeroomClass.id)}
          />
        )}
      </AnimatePresence>

      {/* Printable Report Card Modal */}
      {homeroomClass && (
        <StudentGradeReportCardModal
          isOpen={isReportCardOpen}
          onClose={() => setIsReportCardOpen(false)}
          studentData={selectedStudentForReport}
          classData={{
            className: homeroomClass.className,
            grade: homeroomClass.grade,
            homeroomTeacherName: userData.name || 'ThS. Nguyễn Văn Quản Khoa'
          }}
          studentsList={classGrades}
          semester="HK1_2026"
        />
      )}
    </div>
  );
};

export default HomeroomClass;
