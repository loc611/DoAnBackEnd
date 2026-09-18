import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle, Calendar, Users, Award, Edit3, X, AlertCircle, Sparkles } from 'lucide-react';
import api from '../services/api';

const PERIODS = [1, 2, 3, 4, 5];
const DAYS = [
  { key: 1, name: 'Thứ Hai' },
  { key: 2, name: 'Thứ Ba' },
  { key: 3, name: 'Thứ Tư' },
  { key: 4, name: 'Thứ Năm' },
  { key: 5, name: 'Thứ Sáu' },
  { key: 6, name: 'Thứ Bảy' }
];

const LessonLogbook = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedWeekDate, setSelectedWeekDate] = useState(() => {
    const d = new Date();
    // Quay về thứ 2 của tuần hiện tại
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().slice(0, 10);
  });

  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [lessonLogs, setLessonLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal ghi bài
  const [selectedSlot, setSelectedSlot] = useState(null); // { date, periodNumber, log }
  const [formData, setFormData] = useState({
    subjectId: '',
    lessonTitle: '',
    periodInPlan: '',
    totalStudents: 0,
    presentCount: 0,
    absentStudentIds: [],
    disciplineRating: 'Tốt',
    teacherRemark: '',
    isSigned: true
  });

  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchClassDetails();
      fetchLogs();
    }
  }, [selectedClass, selectedWeekDate]);

  const fetchInitialData = async () => {
    try {
      const [classRes, subjRes] = await Promise.all([
        api.get('/classes'),
        api.get('/subjects')
      ]);
      const classList = classRes.data?.data || classRes.data || [];
      setClasses(classList);
      if (classList.length > 0 && !selectedClass) {
        setSelectedClass(classList[0].id);
      }
      setSubjects(subjRes.data?.data || subjRes.data || []);
    } catch (e) {
      console.error('Lỗi lấy danh sách lớp/môn:', e);
    }
  };

  const fetchClassDetails = async () => {
    try {
      const res = await api.get(`/classes/${selectedClass}/students`);
      const stList = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.students || []);
      setStudents(stList);
    } catch (e) {
      console.error('Lỗi lấy học sinh lớp:', e);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      // Tính thứ 2 đến thứ 7 của tuần được chọn
      const monday = new Date(selectedWeekDate);
      const saturday = new Date(monday);
      saturday.setDate(saturday.getDate() + 5);

      const res = await api.get(`/lesson-logs/class/${selectedClass}`, {
        params: {
          fromDate: monday.toISOString().slice(0, 10),
          toDate: saturday.toISOString().slice(0, 10)
        }
      });
      setLessonLogs(res.data?.data || []);
    } catch (e) {
      console.error('Lỗi lấy sổ đầu bài:', e);
    } finally {
      setLoading(false);
    }
  };

  // Tính ngày cụ thể cho từng thứ trong tuần (Thứ 2 = offset 0, Thứ 7 = offset 5)
  const getDateForDay = (dayOffset) => {
    const d = new Date(selectedWeekDate);
    d.setDate(d.getDate() + dayOffset);
    return d;
  };

  const findLog = (dateObj, period) => {
    const dateStr = dateObj.toISOString().slice(0, 10);
    return lessonLogs.find(l => {
      const lDate = new Date(l.date).toISOString().slice(0, 10);
      return lDate === dateStr && l.periodNumber === period;
    });
  };

  const handleOpenSlot = (dateObj, period, existingLog) => {
    setSelectedSlot({ date: dateObj, periodNumber: period, log: existingLog });
    if (existingLog) {
      setFormData({
        subjectId: existingLog.subjectId || '',
        lessonTitle: existingLog.lessonTitle || '',
        periodInPlan: existingLog.periodInPlan || '',
        totalStudents: existingLog.totalStudents || students.length,
        presentCount: existingLog.presentCount || students.length,
        absentStudentIds: existingLog.absentStudentIds || [],
        disciplineRating: existingLog.disciplineRating || 'Tốt',
        teacherRemark: existingLog.teacherRemark || '',
        isSigned: existingLog.isSigned ?? true
      });
    } else {
      setFormData({
        subjectId: subjects[0]?.id || '',
        lessonTitle: '',
        periodInPlan: '',
        totalStudents: students.length,
        presentCount: students.length,
        absentStudentIds: [],
        disciplineRating: 'Tốt',
        teacherRemark: '',
        isSigned: true
      });
    }
  };

  const handleToggleAbsentStudent = (stId) => {
    setFormData(prev => {
      const exists = prev.absentStudentIds.includes(stId);
      const nextAbsent = exists 
        ? prev.absentStudentIds.filter(id => id !== stId) 
        : [...prev.absentStudentIds, stId];
      const nextPresent = Math.max(0, (Number(prev.totalStudents) || students.length) - nextAbsent.length);
      return {
        ...prev,
        absentStudentIds: nextAbsent,
        presentCount: nextPresent
      };
    });
  };

  const handleSaveLog = async (e) => {
    e.preventDefault();
    if (!formData.subjectId || !formData.lessonTitle) {
      alert('Vui lòng chọn môn học và nhập tên bài dạy');
      return;
    }

    try {
      setSaving(true);
      await api.post('/lesson-logs', {
        classId: selectedClass,
        date: selectedSlot.date.toISOString().slice(0, 10),
        periodNumber: selectedSlot.periodNumber,
        session: 'morning',
        ...formData
      });

      setSelectedSlot(null);
      fetchLogs();
    } catch (err) {
      alert('Lỗi lưu sổ đầu bài: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-3xl p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            Nghiệp Vụ Sư Phạm Điện Tử
          </span>
          <h1 className="text-3xl font-extrabold mt-2 flex items-center gap-3">
            <BookOpen size={32} /> Sổ Đầu Bài Điện Tử
          </h1>
          <p className="text-emerald-100 text-sm mt-1">
            Ghi nhận tiến độ phân phối chương trình, đánh giá giờ dạy và tự động đồng bộ chuyên cần
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20">
          <div>
            <label className="text-[11px] text-emerald-100 font-semibold uppercase block">Chọn lớp</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-white text-gray-800 font-bold text-xs px-3 py-2 rounded-xl outline-none shadow-sm mt-0.5"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.className}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-emerald-100 font-semibold uppercase block">Tuần bắt đầu từ thứ 2</label>
            <input
              type="date"
              value={selectedWeekDate}
              onChange={(e) => setSelectedWeekDate(e.target.value)}
              className="bg-white text-gray-800 font-bold text-xs px-3 py-2 rounded-xl outline-none shadow-sm mt-0.5"
            />
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
            <Calendar size={18} className="text-emerald-600" />
            Lịch giảng dạy & Ký sổ tuần
          </h3>
          <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Đã ký xác nhận</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span> Chưa ghi bài</span>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
            Đang tải dữ liệu sổ đầu bài tuần...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs font-bold uppercase border-b border-gray-100">
                  <th className="p-4 w-20 text-center">Tiết</th>
                  {DAYS.map((day, dIdx) => {
                    const dDate = getDateForDay(dIdx);
                    return (
                      <th key={day.key} className="p-4 text-center">
                        <span className="block text-gray-800 text-sm">{day.name}</span>
                        <span className="text-[11px] text-gray-400 font-normal">
                          {dDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {PERIODS.map(period => (
                  <tr key={period} className="hover:bg-gray-50/40 transition-colors">
                    <td className="p-4 text-center font-black text-gray-400 bg-gray-50/30">
                      Tiết {period}
                    </td>

                    {DAYS.map((day, dIdx) => {
                      const dDate = getDateForDay(dIdx);
                      const log = findLog(dDate, period);
                      const isSigned = log?.isSigned;

                      return (
                        <td 
                          key={day.key} 
                          className="p-3 align-top border-l border-gray-100"
                        >
                          <div
                            onClick={() => handleOpenSlot(dDate, period, log)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer h-28 flex flex-col justify-between ${
                              isSigned
                                ? 'bg-emerald-50/60 border-emerald-200/80 hover:border-emerald-400 hover:shadow-md'
                                : 'bg-gray-50/60 border-dashed border-gray-200 hover:bg-emerald-50/20 hover:border-emerald-300'
                            }`}
                          >
                            {isSigned ? (
                              <>
                                <div>
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="font-bold text-emerald-800 text-xs truncate">
                                      {log.subject?.name}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-200/60 text-emerald-800 text-[10px] font-black">
                                      T.{log.periodInPlan || '?'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-gray-700 font-medium line-clamp-2" title={log.lessonTitle}>
                                    {log.lessonTitle}
                                  </p>
                                </div>

                                <div className="pt-1 border-t border-emerald-100/80 flex items-center justify-between text-[10px] text-gray-500">
                                  <span>Vắng: <strong className={log.absentStudentIds?.length > 0 ? 'text-red-600' : 'text-emerald-700'}>{log.absentStudentIds?.length || 0}</strong></span>
                                  <span className="px-1.5 py-0.5 rounded bg-white font-bold text-emerald-700 shadow-xs">
                                    {log.disciplineRating}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center text-gray-400 hover:text-emerald-600">
                                <Edit3 size={16} className="mb-1 opacity-60" />
                                <span className="text-[10px] font-medium">+ Ghi bài</span>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Ký & Ghi Sổ Đầu Bài */}
      <AnimatePresence>
        {selectedSlot && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded">
                    {selectedSlot.date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })} • Tiết {selectedSlot.periodNumber}
                  </span>
                  <h3 className="font-bold text-lg mt-1">Ký Sổ Đầu Bài Giảng Dạy</h3>
                </div>
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveLog} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Môn học *</label>
                    <select
                      value={formData.subjectId}
                      onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                      required
                      className="w-full text-xs font-semibold p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"
                    >
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.subjectCode})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Tiết PPCT thứ</label>
                    <input
                      type="number"
                      placeholder="VD: 12"
                      value={formData.periodInPlan}
                      onChange={(e) => setFormData({ ...formData, periodInPlan: e.target.value })}
                      className="w-full text-xs font-semibold p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Tên bài dạy / Nội dung công việc *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Bài 5: Khảo sát và vẽ đồ thị hàm số (Tiết 1)"
                    value={formData.lessonTitle}
                    onChange={(e) => setFormData({ ...formData, lessonTitle: e.target.value })}
                    className="w-full text-xs font-semibold p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Xếp loại giờ dạy</label>
                    <select
                      value={formData.disciplineRating}
                      onChange={(e) => setFormData({ ...formData, disciplineRating: e.target.value })}
                      className="w-full text-xs font-semibold p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"
                    >
                      <option value="Tốt">Loại A - Tốt</option>
                      <option value="Khá">Loại B - Khá</option>
                      <option value="Trung bình">Loại C - Trung bình</option>
                      <option value="Yếu">Loại D - Yếu / Kém</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Sĩ số hiện diện</label>
                    <div className="text-xs font-bold p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl">
                      {formData.presentCount} / {formData.totalStudents || students.length} (Vắng: {formData.absentStudentIds.length})
                    </div>
                  </div>
                </div>

                {/* Điểm danh học sinh vắng trong tiết */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5 flex items-center justify-between">
                    <span>Chọn học sinh vắng mặt tiết này:</span>
                    <span className="text-[10px] text-emerald-600 font-normal">Tự động đồng bộ sang Sổ chuyên cần</span>
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-xl p-2 divide-y divide-gray-100 bg-gray-50/50">
                    {students.map(st => {
                      const isAbsent = formData.absentStudentIds.includes(st.id);
                      return (
                        <div
                          key={st.id}
                          onClick={() => handleToggleAbsentStudent(st.id)}
                          className={`p-1.5 flex items-center justify-between rounded-lg cursor-pointer text-xs ${
                            isAbsent ? 'bg-red-100 text-red-800 font-bold' : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <span>{st.fullName} ({st.studentCode})</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${isAbsent ? 'bg-red-200 text-red-800 font-bold' : 'text-gray-400'}`}>
                            {isAbsent ? 'Vắng' : 'Có mặt'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Nhận xét của giáo viên</label>
                  <textarea
                    rows={2}
                    placeholder="Lớp học trật tự, phát biểu sôi nổi, hoàn thành mục tiêu bài học..."
                    value={formData.teacherRemark}
                    onChange={(e) => setFormData({ ...formData, teacherRemark: e.target.value })}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedSlot(null)}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2"
                  >
                    {saving ? 'Đang lưu...' : '✓ Xác Nhận & Ký Sổ'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LessonLogbook;
