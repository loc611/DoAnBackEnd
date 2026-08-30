import { useState, useEffect, useMemo } from 'react';
import { 
  CalendarDays, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  MapPin, 
  BookOpen, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Printer, 
  Sparkles,
  Layers
} from 'lucide-react';
import api from '../services/api';

const ExamSchedule = () => {
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [notification, setNotification] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const userRole = localStorage.getItem('userRole') || 'student';
  const isAdmin = userRole === 'admin';

  // Form State
  const initialForm = {
    examName: 'Thi Giữa Học Kỳ 1 - 2026',
    examType: 'Giữa kỳ',
    subjectName: 'Toán Học',
    grade: 10,
    classId: '',
    examDate: new Date().toISOString().split('T')[0],
    startTime: '07:30',
    duration: 90,
    room: 'Phòng A1-101',
    examFormat: 'Trắc nghiệm',
    semester: 'HK1_2026',
    academicYear: '2026-2027',
    notes: ''
  };
  const [formData, setFormData] = useState(initialForm);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/classes');
        setClasses(res.data);
      } catch (err) {
        console.error('Lỗi tải danh sách lớp:', err);
      }
    };
    fetchClasses();
  }, []);

  // Fetch exams
  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await api.get('/exams');
      setExams(res.data);
    } catch (err) {
      console.error('Lỗi tải lịch thi:', err);
      setNotification({ type: 'error', message: 'Không thể tải danh sách lịch thi' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  // Handle Form Submit (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingExam) {
        await api.put(`/exams/${editingExam.id}`, formData);
        setNotification({ type: 'success', message: 'Cập nhật lịch thi thành công!' });
      } else {
        await api.post('/exams', formData);
        setNotification({ type: 'success', message: 'Tạo lịch thi mới thành công!' });
      }
      setIsModalOpen(false);
      setEditingExam(null);
      setFormData(initialForm);
      fetchExams();
    } catch (err) {
      console.error('Lỗi lưu lịch thi:', err);
      setNotification({ type: 'error', message: err.response?.data?.message || 'Có lỗi xảy ra khi lưu lịch thi' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setNotification(null), 3500);
    }
  };

  // Open Edit Modal
  const handleEdit = (exam) => {
    setEditingExam(exam);
    setFormData({
      examName: exam.examName,
      examType: exam.examType,
      subjectName: exam.subjectName,
      grade: exam.grade,
      classId: exam.classId || '',
      examDate: exam.examDate ? new Date(exam.examDate).toISOString().split('T')[0] : '',
      startTime: exam.startTime,
      duration: exam.duration,
      room: exam.room,
      examFormat: exam.examFormat,
      semester: exam.semester,
      academicYear: exam.academicYear,
      notes: exam.notes || ''
    });
    setIsModalOpen(true);
  };

  // Delete Exam
  const handleDelete = async (id, subjectName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa lịch thi môn ${subjectName}?`)) return;
    try {
      await api.delete(`/exams/${id}`);
      setNotification({ type: 'success', message: 'Đã xóa lịch thi thành công' });
      fetchExams();
    } catch (err) {
      console.error('Lỗi xóa lịch thi:', err);
      setNotification({ type: 'error', message: 'Không thể xóa lịch thi' });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Filtered Exams
  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const matchSearch = !searchTerm || 
        exam.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.room.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.examName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchType = filterType === 'all' || exam.examType === filterType;
      const matchGrade = filterGrade === 'all' || exam.grade.toString() === filterGrade || exam.grade === 0;

      return matchSearch && matchType && matchGrade;
    });
  }, [exams, searchTerm, filterType, filterGrade]);

  const getExamStatus = (examDateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(examDateStr);
    examDate.setHours(0, 0, 0, 0);

    if (examDate.getTime() === today.getTime()) {
      return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">🔥 Diễn ra hôm nay</span>;
    } else if (examDate > today) {
      return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">⏳ Sắp diễn ra</span>;
    } else {
      return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">Đã kết thúc</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
            <CalendarDays size={26} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
              Quản Lý Lịch Thi & Khảo Sát
            </h1>
            <p className="text-sm text-slate-500">
              Lên lịch, phân bổ phòng thi và theo dõi các kỳ thi toàn trường
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
          >
            <Printer size={16} />
            <span>In lịch thi</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setEditingExam(null);
                setFormData(initialForm);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-600/20 transition-all"
            >
              <Plus size={16} />
              <span>Thêm Môn Thi Mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium transition-all ${
          notification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-4 rounded-2xl shadow-xs border border-slate-100">
        {/* Search */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Tìm Kiếm
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Tên môn thi, phòng thi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Filter Type */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Kỳ Thi / Đợt Thi
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          >
            <option value="all">Tất cả đợt thi</option>
            <option value="Giữa kỳ">Thi Giữa kỳ</option>
            <option value="Cuối kỳ">Thi Cuối kỳ</option>
            <option value="Khảo sát">Khảo sát chất lượng</option>
          </select>
        </div>

        {/* Filter Grade */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Khối Lớp
          </label>
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          >
            <option value="all">Tất cả khối lớp</option>
            <option value="10">Khối 10</option>
            <option value="11">Khối 11</option>
            <option value="12">Khối 12</option>
          </select>
        </div>

        {/* Quick Summary */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/60">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Tổng số môn thi</div>
            <div className="text-xl font-bold text-slate-800">{filteredExams.length} môn</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
            <BookOpen size={18} />
          </div>
        </div>
      </div>

      {/* Exam Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
            <p className="text-sm font-semibold text-slate-500">Đang tải lịch thi...</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <CalendarDays size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-600">Chưa có lịch thi nào phù hợp</p>
            <p className="text-xs text-slate-400 mt-1">Hãy tạo lịch thi mới bằng nút bên trên</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">STT</th>
                  <th className="py-3.5 px-4">Môn Thi & Kỳ Thi</th>
                  <th className="py-3.5 px-4">Khối / Lớp</th>
                  <th className="py-3.5 px-4">Ngày & Giờ Thi</th>
                  <th className="py-3.5 px-4">Thời Lượng</th>
                  <th className="py-3.5 px-4">Phòng Thi</th>
                  <th className="py-3.5 px-4">Hình Thức</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  {isAdmin && <th className="py-3.5 px-4 text-right">Thao Tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExams.map((exam, idx) => {
                  const examDateFormatted = new Date(exam.examDate).toLocaleDateString('vi-VN', {
                    weekday: 'short',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  });

                  return (
                    <tr key={exam.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-400 text-xs">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 text-sm">{exam.subjectName}</div>
                        <div className="text-xs text-slate-400 font-medium">{exam.examName}</div>
                        {exam.notes && (
                          <div className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded mt-1 inline-block">
                            📌 {exam.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                          {exam.class ? exam.class.className : (exam.grade ? `Khối ${exam.grade}` : 'Toàn trường')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        <div className="font-bold text-slate-900">{examDateFormatted}</div>
                        <div className="text-xs text-blue-600 font-bold flex items-center gap-1 mt-0.5">
                          <Clock size={12} />
                          {exam.startTime}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-bold text-xs">
                        {exam.duration} phút
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <MapPin size={14} className="text-rose-500 shrink-0" />
                          <span>{exam.room}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                          exam.examFormat === 'Trắc nghiệm' 
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : exam.examFormat === 'Tự luận'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-teal-50 text-teal-700 border border-teal-200'
                        }`}>
                          {exam.examFormat}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {getExamStatus(exam.examDate)}
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(exam)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(exam.id, exam.subjectName)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Xóa môn thi"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Create / Edit Exam */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h2 className="text-lg font-bold text-slate-800">
                {editingExam ? '✏️ Chỉnh Sửa Môn Thi' : '➕ Tạo Lịch Thi Mới'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tên kỳ thi */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tên Kỳ Thi *</label>
                  <input
                    type="text"
                    required
                    value={formData.examName}
                    onChange={(e) => setFormData({ ...formData, examName: e.target.value })}
                    placeholder="VD: Thi Giữa Học Kỳ 1 - 2026"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Loại kỳ thi */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Đợt Thi *</label>
                  <select
                    value={formData.examType}
                    onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Giữa kỳ">Giữa kỳ</option>
                    <option value="Cuối kỳ">Cuối kỳ</option>
                    <option value="Khảo sát">Khảo sát chất lượng</option>
                  </select>
                </div>

                {/* Môn thi */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Môn Thi *</label>
                  <input
                    type="text"
                    required
                    value={formData.subjectName}
                    onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                    placeholder="VD: Toán Học, Ngữ Văn..."
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Khối lớp */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Khối Lớp *</label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: parseInt(e.target.value, 10) })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value={0}>Tất cả các khối</option>
                    <option value={10}>Khối 10</option>
                    <option value={11}>Khối 11</option>
                    <option value={12}>Khối 12</option>
                  </select>
                </div>

                {/* Lớp cụ thể */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Lớp Học Cụ Thể (Tùy chọn)</label>
                  <select
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Áp dụng cho cả khối</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.className}</option>
                    ))}
                  </select>
                </div>

                {/* Ngày thi */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ngày Thi *</label>
                  <input
                    type="date"
                    required
                    value={formData.examDate}
                    onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Giờ bắt đầu */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Giờ Bắt Đầu (HH:MM) *</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Thời lượng */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Thời Lượng (Phút) *</label>
                  <input
                    type="number"
                    required
                    min="15"
                    max="180"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value, 10) })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Phòng thi */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Phòng Thi *</label>
                  <input
                    type="text"
                    required
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    placeholder="VD: Phòng A1-101"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Hình thức thi */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Hình Thức Thi</label>
                  <select
                    value={formData.examFormat}
                    onChange={(e) => setFormData({ ...formData, examFormat: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Trắc nghiệm">Trắc nghiệm</option>
                    <option value="Tự luận">Tự luận</option>
                    <option value="Trắc nghiệm + Tự luận">Trắc nghiệm + Tự luận</option>
                    <option value="Thực hành">Thực hành trên máy</option>
                  </select>
                </div>

                {/* Ghi chú */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ghi Chú & Dặn Dò Thí Sinh</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="VD: Được dùng máy tính bỏ túi, chuẩn bị bút chì 2B..."
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : (editingExam ? 'Cập Nhật' : 'Tạo Môn Thi')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamSchedule;
