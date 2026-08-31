import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, X, Search, BookOpen, RotateCcw, GraduationCap, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import Swal from 'sweetalert2';

const SubjectModal = ({ isOpen, onClose, teachersList, onSuccess }) => {
  const [formData, setFormData] = useState({
    subjectCode: '',
    name: '',
    grade: 0, // 0: Toàn trường, 10, 11, 12
    periodsPerWeek: 2,
    type: 'Bắt buộc',
    teacherId: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        subjectCode: '',
        name: '',
        grade: 0,
        periodsPerWeek: 2,
        type: 'Bắt buộc',
        teacherId: ''
      });
      setError('');
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'subjectCode') {
      const upperValue = value.toUpperCase().replace(/\s+/g, '');
      setFormData(prev => ({ ...prev, [name]: upperValue }));
      if (upperValue && !/^[A-Z0-9_-]{2,20}$/.test(upperValue)) {
        setError('Mã môn học chỉ gồm 2-20 ký tự chữ và số (VD: TOAN10, MH01)');
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
    if (!/^[A-Z0-9_-]{2,20}$/.test(formData.subjectCode.trim())) {
      setError('Mã môn học không hợp lệ (chỉ gồm 2-20 ký tự chữ/số, không khoảng trắng)');
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

      await api.post('/subjects', payload);
      Swal.fire('Thành công', 'Thêm môn học thành công', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi tạo môn học');
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
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="text-blue-600" size={22} />
            Thêm Môn học Mới
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
            <X size={22} />
          </button>
        </div>

        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-100 flex items-center gap-1.5">
              <span>⚠️</span> {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mã Môn học *</label>
            <input 
              type="text" 
              name="subjectCode" 
              value={formData.subjectCode} 
              onChange={handleChange} 
              placeholder="VD: TOAN10, TIN11, MH01" 
              maxLength={20}
              required
              className="w-full px-4 py-2 font-mono uppercase rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="text-[11px] text-gray-400 mt-1 block">Tự động viết hoa, không dấu và không khoảng trắng</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên Môn học *</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              placeholder="VD: Toán học, Ngữ văn, Vật lý 10..." 
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Khối áp dụng</label>
              <select 
                name="grade" 
                value={formData.grade} 
                onChange={handleChange} 
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="0">Toàn trường (10, 11, 12)</option>
                <option value="10">Khối 10</option>
                <option value="11">Khối 11</option>
                <option value="12">Khối 12</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Số tiết / tuần</label>
              <input 
                type="number" 
                name="periodsPerWeek" 
                min="1" 
                max="10" 
                value={formData.periodsPerWeek} 
                onChange={handleChange} 
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Loại hình</label>
              <select 
                name="type" 
                value={formData.type} 
                onChange={handleChange} 
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Bắt buộc">Bắt buộc</option>
                <option value="Tự chọn">Tự chọn</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Giáo viên phụ trách</label>
            <select 
              name="teacherId" 
              value={formData.teacherId} 
              onChange={handleChange} 
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">-- Chọn giáo viên (Tùy chọn) --</option>
              {teachersList.map(t => (
                <option key={t.id || t.profile?.id} value={t.profile?.id || t.id}>
                  {t.profile?.fullName || t.username} ({t.profile?.teacherCode || 'GV'})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              disabled={submitting} 
              className="btn-primary px-5 py-2 disabled:opacity-50"
            >
              {submitting ? 'Đang lưu...' : 'Tạo Môn học'}
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

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchSubjects = async () => {
    try {
      const [resSub, resTeach] = await Promise.all([
        api.get('/subjects'),
        api.get('/users?role=teacher').catch(() => ({ data: [] }))
      ]);
      setSubjects(resSub.data || []);
      const teacherUsers = (resTeach.data || []).filter(u => u.role === 'teacher');
      setTeachers(teacherUsers);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const term = searchTerm.toLowerCase().trim();
      const codeMatch = subject.subjectCode?.toLowerCase().includes(term);
      const nameMatch = subject.name?.toLowerCase().includes(term);
      const teacherName = subject.teacherId?.fullName?.toLowerCase() || '';
      const teacherCode = subject.teacherId?.teacherCode?.toLowerCase() || '';
      const teacherMatch = teacherName.includes(term) || teacherCode.includes(term);

      const matchSearch = !term || codeMatch || nameMatch || teacherMatch;
      
      const subGrade = subject.grade !== undefined && subject.grade !== null ? String(subject.grade) : '0';
      const matchGrade = !gradeFilter || subGrade === gradeFilter;

      const matchType = !typeFilter || subject.type === typeFilter;

      return matchSearch && matchGrade && matchType;
    });
  }, [subjects, searchTerm, gradeFilter, typeFilter]);

  const handleResetFilter = () => {
    setSearchTerm('');
    setGradeFilter('');
    setTypeFilter('');
  };

  const handleDelete = async (id, name) => {
    const result = await Swal.fire({
      title: 'Xóa môn học?',
      text: `Bạn có chắc muốn xóa môn "${name}" không?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: 'Hủy',
      confirmButtonText: 'Xóa môn học'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/subjects/${id}`);
        Swal.fire('Đã xóa', 'Môn học đã được xóa thành công', 'success');
        fetchSubjects();
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Không thể xóa môn học', 'error');
      }
    }
  };

  const getGradeBadge = (grade) => {
    if (grade === 10) {
      return <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Khối 10</span>;
    }
    if (grade === 11) {
      return <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">Khối 11</span>;
    }
    if (grade === 12) {
      return <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Khối 12</span>;
    }
    return <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">Toàn trường (10-12)</span>;
  };

  if (loading) return <div className="p-6">Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-6 font-poppins">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="text-blue-600" size={26} />
            Quản lý Môn học THPT
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Danh mục các môn học theo Khối lớp và phân bổ số tiết học</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center shadow-sm">
          <Plus size={20} className="mr-2" />
          Thêm Môn học
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row gap-4 items-center justify-between bg-gray-50/50">
          <div className="relative w-full lg:w-80">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Tìm mã môn, tên môn, giáo viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 py-2.5 w-full bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all shadow-sm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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
              className="px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none text-sm bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 shadow-sm"
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
              className="px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none text-sm bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <option value="">Tất cả Loại hình</option>
              <option value="Bắt buộc">Bắt buộc</option>
              <option value="Tự chọn">Tự chọn</option>
            </select>

            <span className="text-xs font-semibold px-3 py-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 whitespace-nowrap shadow-sm">
              {filteredSubjects.length} / {subjects.length} môn
            </span>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Mã MH</th>
                <th className="px-6 py-4">Tên môn học</th>
                <th className="px-6 py-4">Khối áp dụng</th>
                <th className="px-6 py-4 text-center">Số tiết / tuần</th>
                <th className="px-6 py-4">Loại hình</th>
                <th className="px-6 py-4">Giáo viên phụ trách</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <BookOpen size={40} className="text-gray-300" />
                      <p className="text-gray-500 font-medium">Chưa có môn học nào trong hệ thống</p>
                      <p className="text-xs text-gray-400">Nhấn "Thêm Môn học" để tạo môn học mới.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search size={36} className="text-gray-300" />
                      <p className="text-gray-600 font-medium">Không tìm thấy môn học phù hợp</p>
                      <p className="text-xs text-gray-400">
                        Không có môn học nào khớp với bộ lọc hiện tại.
                      </p>
                      <button
                        onClick={handleResetFilter}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
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
                    <tr key={subject.id} className="hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-0">
                      <td className="px-6 py-4 font-mono font-semibold text-blue-600">{subject.subjectCode}</td>
                      <td className="px-6 py-4 font-semibold text-gray-800">{subject.name}</td>
                      <td className="px-6 py-4">{getGradeBadge(subject.grade)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 font-medium text-gray-700 text-xs">
                          <Clock size={13} className="text-gray-500" />
                          {periods} tiết/tuần
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                          subject.type === 'Bắt buộc' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-pink-50 text-pink-700 border border-pink-200'
                        }`}>
                          {subject.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {subject.teacherId ? (
                          <div className="flex items-center gap-1.5 font-medium text-gray-700">
                            <span>{subject.teacherId.fullName || subject.teacherId.teacherCode}</span>
                            {subject.teacherId.teacherCode && (
                              <span className="text-[11px] text-gray-400">({subject.teacherId.teacherCode})</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Chưa phân công</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end space-x-2">
                          <button 
                            onClick={() => handleDelete(subject.id, subject.name)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa môn học"
                          >
                            <Trash2 size={18} />
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

      <SubjectModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        teachersList={teachers}
        onSuccess={fetchSubjects}
      />
    </div>
  );
};

export default Subjects;
