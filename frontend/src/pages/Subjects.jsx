import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, X, Search, BookOpen, RotateCcw, GraduationCap, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import Swal from 'sweetalert2';

const SubjectModal = ({ isOpen, onClose, teachersList, subjectData, onSuccess }) => {
  const [formData, setFormData] = useState({
    subjectCode: '',
    name: '',
    grade: 0,
    periodsPerWeek: 2,
    type: 'Bắt buộc',
    teacherId: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (subjectData) {
        setFormData({
          subjectCode: subjectData.subjectCode || '',
          name: subjectData.name || '',
          grade: subjectData.grade !== undefined ? subjectData.grade : 0,
          periodsPerWeek: subjectData.periodsPerWeek || subjectData.credits || 2,
          type: subjectData.type || 'Bắt buộc',
          teacherId: subjectData.teacherId?.id || subjectData.teacherId || ''
        });
      } else {
        setFormData({
          subjectCode: '',
          name: '',
          grade: 0,
          periodsPerWeek: 2,
          type: 'Bắt buộc',
          teacherId: ''
        });
      }
      setError('');
    }
  }, [isOpen, subjectData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'subjectCode') {
      const upperValue = value.toUpperCase().replace(/\s+/g, '');
      setFormData(prev => ({ ...prev, [name]: upperValue }));
      if (upperValue && !/^[A-Z0-9_-]{2,20}$/.test(upperValue)) {
        setError('Mã môn học chỉ gồm 2-20 ký tự chữ và số');
      } else {
        setError('');
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subjectCode.trim()) {
      setError('Vui lòng nhập mã môn học');
      return;
    }
    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên môn học');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        grade: parseInt(formData.grade, 10) || 0,
        periodsPerWeek: parseInt(formData.periodsPerWeek, 10) || 2,
        teacherId: formData.teacherId || null
      };

      if (subjectData) {
        await api.put(`/subjects/${subjectData.id}`, payload);
        Swal.fire('Thành công', 'Cập nhật môn học thành công', 'success');
      } else {
        await api.post('/subjects', payload);
        Swal.fire('Thành công', 'Thêm môn học thành công', 'success');
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi lưu môn học');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/70">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="text-indigo-600" size={22} />
            {subjectData ? 'Chỉnh sửa Môn học' : 'Thêm Môn học Mới'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form className="p-6 space-y-4 font-sans" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-medium border border-rose-100 flex items-center gap-1.5">
              <span>⚠️</span> {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mã Môn học *</label>
            <input 
              type="text" 
              name="subjectCode" 
              value={formData.subjectCode} 
              onChange={handleChange} 
              placeholder="VD: TOAN10, TIN11, MH01" 
              maxLength={20}
              readOnly={!!subjectData}
              required
              className={`w-full px-4 py-2.5 font-mono uppercase rounded-xl border border-slate-200 text-sm font-bold ${
                subjectData ? 'bg-slate-100 text-indigo-700 cursor-not-allowed' : 'focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800'
              }`}
            />
            {!subjectData && (
              <span className="text-[11px] text-slate-400 mt-1 block">Tự động viết hoa, không dấu và không khoảng trắng</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tên Môn học *</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              placeholder="VD: Toán học, Ngữ văn 10, Vật lý..." 
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Khối áp dụng</label>
              <select 
                name="grade" 
                value={formData.grade} 
                onChange={handleChange} 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium text-slate-700"
              >
                <option value="0">Toàn trường (10-12)</option>
                <option value="10">Khối 10</option>
                <option value="11">Khối 11</option>
                <option value="12">Khối 12</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Số tiết / tuần</label>
              <input 
                type="number" 
                name="periodsPerWeek" 
                value={formData.periodsPerWeek} 
                onChange={handleChange} 
                min={1} 
                max={15}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Loại hình môn học</label>
            <select 
              name="type" 
              value={formData.type} 
              onChange={handleChange} 
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium text-slate-700"
            >
              <option value="Bắt buộc">Bắt buộc</option>
              <option value="Tự chọn">Tự chọn</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phân công Giáo viên phụ trách</label>
            <select 
              name="teacherId" 
              value={formData.teacherId} 
              onChange={handleChange} 
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium text-slate-700"
            >
              <option value="">-- Chưa phân công --</option>
              {teachersList.map(t => (
                <option key={t.id} value={t.id}>
                  {t.fullName} ({t.teacherCode || 'GV'}) {t.specialization ? `• ${t.specialization}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-semibold"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              {submitting ? 'Đang lưu...' : (subjectData ? 'Lưu thay đổi' : 'Tạo môn học')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetchSubjects();
    fetchTeachers();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/subjects');
      setSubjects(res.data || []);
    } catch (err) {
      console.error(err);
      Swal.fire('Lỗi', 'Không thể tải danh sách môn học', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/users');
      const teacherUsers = (res.data || [])
        .filter(u => u.role === 'teacher' && u.profile)
        .map(u => u.profile);
      setTeachers(teacherUsers);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdd = () => {
    setSelectedSubject(null);
    setIsModalOpen(true);
  };

  const handleEdit = (subject) => {
    setSelectedSubject(subject);
    setIsModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    const result = await Swal.fire({
      title: 'Xóa môn học?',
      text: `Bạn có chắc muốn xóa môn "${name}" khỏi hệ thống?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: 'Hủy',
      confirmButtonText: 'Xóa ngay'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/subjects/${id}`);
        Swal.fire('Thành công', 'Đã xóa môn học', 'success');
        fetchSubjects();
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Có lỗi khi xóa môn học', 'error');
      }
    }
  };

  const handleResetFilter = () => {
    setSearchTerm('');
    setGradeFilter('');
    setTypeFilter('');
  };

  const filteredSubjects = useMemo(() => {
    return subjects.filter(subject => {
      const matchSearch = 
        subject.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subject.subjectCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (subject.teacherId?.fullName && subject.teacherId.fullName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchGrade = gradeFilter !== '' ? subject.grade === parseInt(gradeFilter, 10) : true;
      const matchType = typeFilter !== '' ? subject.type === typeFilter : true;

      return matchSearch && matchGrade && matchType;
    });
  }, [subjects, searchTerm, gradeFilter, typeFilter]);

  const getGradeBadge = (grade) => {
    if (grade === 10) {
      return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">Khối 10</span>;
    }
    if (grade === 11) {
      return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">Khối 11</span>;
    }
    if (grade === 12) {
      return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Khối 12</span>;
    }
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Toàn trường (10-12)</span>;
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-sans">Đang tải danh mục môn học...</div>;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <BookOpen className="text-indigo-600" size={28} />
            Quản lý Môn học THPT
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">Danh mục môn học theo Khối lớp, số tiết giảng dạy và phân công bộ môn</p>
        </div>
        <button onClick={handleAdd} className="btn-primary flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer">
          <Plus size={18} className="mr-2" />
          Thêm Môn học
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative w-full lg:w-80">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Tìm mã môn, tên môn, giáo viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 py-2.5 w-full bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all shadow-sm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                title="Xóa tìm kiếm"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 shadow-sm"
            >
              <option value="">Tất cả Khối lớp</option>
              <option value="0">Toàn trường (10-12)</option>
              <option value="10">Khối 10</option>
              <option value="11">Khối 11</option>
              <option value="12">Khối 12</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 shadow-sm"
            >
              <option value="">Tất cả Loại hình</option>
              <option value="Bắt buộc">Bắt buộc</option>
              <option value="Tự chọn">Tự chọn</option>
            </select>

            <span className="text-xs font-bold px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 whitespace-nowrap shadow-sm">
              {filteredSubjects.length} / {subjects.length} môn
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
            <thead className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Mã Môn</th>
                <th className="px-6 py-4 min-w-[180px]">Tên Môn Học</th>
                <th className="px-6 py-4">Khối áp dụng</th>
                <th className="px-6 py-4 text-center">Thời lượng</th>
                <th className="px-6 py-4">Loại hình</th>
                <th className="px-6 py-4 min-w-[200px]">Giáo viên phụ trách</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <BookOpen size={40} className="text-slate-300" />
                      <p className="text-slate-600 font-bold">Chưa có môn học nào trong hệ thống</p>
                      <p className="text-xs text-slate-400">Nhấn "Thêm Môn học" để tạo môn học mới.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search size={36} className="text-slate-300" />
                      <p className="text-slate-600 font-bold">Không tìm thấy môn học phù hợp</p>
                      <button
                        onClick={handleResetFilter}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        <RotateCcw size={14} /> Xóa bộ lọc
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((subject) => {
                  const periods = subject.periodsPerWeek || subject.credits || 2;
                  return (
                    <tr key={subject.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-indigo-600 text-sm">{subject.subjectCode}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 text-sm">{subject.name}</td>
                      <td className="px-6 py-4">{getGradeBadge(subject.grade)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 font-semibold text-slate-700 text-xs">
                          <Clock size={13} className="text-slate-500" />
                          {periods} tiết/tuần
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`whitespace-nowrap inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                          subject.type === 'Bắt buộc' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-pink-50 text-pink-700 border-pink-200'
                        }`}>
                          {subject.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {subject.teacherId ? (
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <span>{subject.teacherId.fullName || subject.teacherId.teacherCode}</span>
                            {subject.teacherId.teacherCode && (
                              <span className="text-[11px] text-slate-400 font-mono">({subject.teacherId.teacherCode})</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Chưa phân công</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center space-x-1.5">
                          <button 
                            onClick={() => handleEdit(subject)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-105 transition-all cursor-pointer"
                            title="Sửa môn học"
                          >
                            <Edit size={15} />
                          </button>
                          <button 
                            onClick={() => handleDelete(subject.id, subject.name)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-100 hover:scale-105 transition-all cursor-pointer"
                            title="Xóa môn học"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <SubjectModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            teachersList={teachers}
            subjectData={selectedSubject}
            onSuccess={fetchSubjects}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Subjects;
