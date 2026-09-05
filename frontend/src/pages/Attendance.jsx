import { useState, useEffect, useMemo } from 'react';
import { 
  UserCheck, 
  Calendar, 
  Clock, 
  Users, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Clock3, 
  Search, 
  Filter, 
  RefreshCw,
  Phone,
  Printer,
  Sparkles,
  BookOpen,
  Check,
  CalendarX,
  GraduationCap
} from 'lucide-react';
import api from '../services/api';

const Attendance = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Timetable periods state
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [timetableInfo, setTimetableInfo] = useState({ periods: [], dayName: '' });
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  // Attendance records state
  const [attendanceData, setAttendanceData] = useState(null);
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Fetch classes list
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/classes');
        setClasses(res.data);
        if (res.data.length > 0 && !selectedClass) {
          setSelectedClass(res.data[0].id);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách lớp:', err);
      }
    };
    fetchClasses();
  }, []);

  // Fetch timetable periods for selected class & date
  useEffect(() => {
    const fetchTimetablePeriods = async () => {
      if (!selectedClass || !selectedDate) return;
      setPeriodsLoading(true);
      try {
        const res = await api.get(`/attendance/periods-by-date?classId=${selectedClass}&date=${selectedDate}`);
        setTimetableInfo(res.data);
        
        // Auto-select first period if available, or keep current if still valid
        if (res.data.periods && res.data.periods.length > 0) {
          const currentValid = res.data.periods.some(p => p.periodNumber === selectedPeriod);
          if (!currentValid) {
            setSelectedPeriod(res.data.periods[0].periodNumber);
          }
        } else {
          setSelectedPeriod(null);
        }
      } catch (err) {
        console.error('Lỗi tải thời khóa biểu:', err);
      } finally {
        setPeriodsLoading(false);
      }
    };

    fetchTimetablePeriods();
  }, [selectedClass, selectedDate]);

  // Fetch attendance records when class, date or period changes
  const fetchAttendance = async () => {
    if (!selectedClass || selectedPeriod === null) {
      setAttendanceData(null);
      setRecords([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(
        `/attendance/class/${selectedClass}?date=${selectedDate}&periodNumber=${selectedPeriod}`
      );
      setAttendanceData(res.data);
      setRecords(res.data.records || []);
    } catch (err) {
      console.error('Lỗi tải điểm danh:', err);
      setNotification({ type: 'error', message: 'Không thể tải dữ liệu điểm danh' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPeriod !== null) {
      fetchAttendance();
    }
  }, [selectedClass, selectedDate, selectedPeriod]);

  // Find currently active period details
  const activePeriod = useMemo(() => {
    if (!timetableInfo.periods || selectedPeriod === null) return null;
    return timetableInfo.periods.find(p => p.periodNumber === selectedPeriod) || null;
  }, [timetableInfo.periods, selectedPeriod]);

  // Handle single student status change
  const handleStatusChange = (studentId, newStatus) => {
    setRecords(prev => prev.map(r => 
      r.studentId === studentId ? { ...r, status: newStatus } : r
    ));
  };

  // Handle single student note change
  const handleNoteChange = (studentId, note) => {
    setRecords(prev => prev.map(r => 
      r.studentId === studentId ? { ...r, note } : r
    ));
  };

  // Bulk mark all
  const handleMarkAll = (status) => {
    setRecords(prev => prev.map(r => ({ ...r, status })));
    setNotification({
      type: 'success',
      message: `Đã đánh dấu tất cả học sinh: ${
        status === 'present' ? 'Có mặt' : status === 'late' ? 'Đi muộn' : status === 'excused' ? 'Vắng có phép' : 'Vắng không phép'
      }`
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Save attendance
  const handleSave = async () => {
    if (!selectedClass || selectedPeriod === null || records.length === 0) return;
    setSaving(true);
    try {
      await api.post('/attendance/batch', {
        classId: selectedClass,
        date: selectedDate,
        periodNumber: selectedPeriod,
        periodName: activePeriod?.periodName || `Tiết ${selectedPeriod}`,
        subjectName: activePeriod?.subjectName || '',
        subjectId: activePeriod?.subjectId || null,
        records: records.map(r => ({
          studentId: r.studentId,
          status: r.status,
          note: r.note
        }))
      });
      setNotification({ 
        type: 'success', 
        message: `Lưu điểm danh thành công: ${activePeriod?.periodName || 'Tiết ' + selectedPeriod} - Môn ${activePeriod?.subjectName || ''}` 
      });

      // Update marked state in current timetable list
      setTimetableInfo(prev => ({
        ...prev,
        periods: prev.periods.map(p => 
          p.periodNumber === selectedPeriod ? { ...p, isMarked: true } : p
        )
      }));

      fetchAttendance();
    } catch (err) {
      console.error('Lỗi lưu điểm danh:', err);
      setNotification({ type: 'error', message: 'Lỗi khi lưu điểm danh. Vui lòng thử lại.' });
    } finally {
      setSaving(false);
      setTimeout(() => setNotification(null), 3500);
    }
  };

  // Filtered records by search
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const term = searchTerm.toLowerCase();
    return records.filter(r => 
      r.fullName.toLowerCase().includes(term) || 
      r.studentCode.toLowerCase().includes(term)
    );
  }, [records, searchTerm]);

  // Current statistics
  const stats = useMemo(() => {
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const late = records.filter(r => r.status === 'late').length;
    const excused = records.filter(r => r.status === 'excused').length;
    const unexcused = records.filter(r => r.status === 'unexcused').length;
    const rate = total > 0 ? Math.round(((present + late * 0.8) / total) * 100) : 0;
    return { total, present, late, excused, unexcused, rate };
  }, [records]);

  const currentClassName = classes.find(c => c.id === selectedClass)?.className || '';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <UserCheck size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                Điểm Danh Theo Thời Khóa Biểu
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Phân Tiết Học
                </span>
              </h1>
              <p className="text-sm text-slate-500">
                Tự động đồng bộ theo tiết học thực tế - Chỉ mở điểm danh khi có tiết trên thời khóa biểu
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
          >
            <Printer size={16} />
            <span>In sổ điểm danh</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading || selectedPeriod === null || records.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save size={16} />
            <span>{saving ? 'Đang lưu...' : 'Lưu Điểm Danh Tiết Này'}</span>
          </button>
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

      {/* Filter & Selector Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-white p-4 rounded-2xl shadow-xs border border-slate-100">
        {/* Class Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Lớp Học
          </label>
          <select 
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.className} (Khối {c.grade})
              </option>
            ))}
          </select>
        </div>

        {/* Date Picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Ngày Điểm Danh ({timetableInfo.dayName || 'Hôm nay'})
          </label>
          <div className="relative">
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Search Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Tìm Kiếm Học Sinh
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Tên hoặc mã học sinh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* 📅 TIMETABLE PERIODS SELECTOR (Thanh chọn Tiết Học Theo TKB) */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Lịch Học Theo Thời Khóa Biểu: {timetableInfo.dayName || 'Trong ngày'}
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {periodsLoading ? 'Đang tải TKB...' : `${timetableInfo.periods?.length || 0} tiết có lịch`}
          </span>
        </div>

        {periodsLoading ? (
          <div className="py-6 text-center text-slate-400 text-sm">
            <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent mb-2"></div>
            <div>Đang tải danh sách tiết học theo thời khóa biểu...</div>
          </div>
        ) : (!timetableInfo.periods || timetableInfo.periods.length === 0) ? (
          <div className="py-8 px-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
            <CalendarX size={36} className="mx-auto text-slate-400 mb-2" />
            <div className="font-semibold text-slate-700 text-sm">Không có tiết học nào theo thời khóa biểu</div>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Ngày {selectedDate} ({timetableInfo.dayName}) không có môn học nào được phân công cho lớp {currentClassName}. 
              Chỉ những ngày có tiết học trên TKB mới được mở điểm danh.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {timetableInfo.periods.map((p) => {
              const isSelected = selectedPeriod === p.periodNumber;
              return (
                <button
                  key={p.periodNumber}
                  type="button"
                  onClick={() => setSelectedPeriod(p.periodNumber)}
                  className={`p-3.5 rounded-xl text-left border transition-all relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 ring-2 ring-blue-600/30'
                      : 'bg-slate-50/80 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-xs font-black tracking-tight ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                      {p.periodName}
                    </span>
                    {p.isMarked ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        <Check size={10} /> Đã điểm
                      </span>
                    ) : (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                      }`}>
                        Chưa điểm
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5">
                    <div className={`text-base font-extrabold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                      {p.subjectName}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className={`font-medium ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        GV: {p.teacherName}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        p.subjectType === 'Tự chọn'
                          ? (isSelected ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-700')
                          : (isSelected ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600')
                      }`}>
                        {p.subjectType}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Selected Period Banner / Info */}
        {activePeriod && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">Đang chọn:</span>
              <span className="font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                {activePeriod.periodName} - Môn {activePeriod.subjectName}
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600">Giáo viên: <strong>{activePeriod.teacherName}</strong></span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600">
                Phạm vi: <strong>{activePeriod.subjectType === 'Tự chọn' ? 'Học sinh đăng ký môn' : 'Toàn bộ học sinh lớp'}</strong>
              </span>
            </div>
            <div className="text-slate-500">
              Sĩ số tham gia: <strong className="text-slate-800 font-bold">{records.length} học sinh</strong>
            </div>
          </div>
        )}
      </div>

      {/* Stats KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Sĩ Số Tiết</span>
            <Users size={16} className="text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-800">{stats.total}</div>
          <span className="text-[11px] text-slate-400 font-medium truncate">Lớp {currentClassName}</span>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-semibold">Có Mặt</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">{stats.present}</div>
          <span className="text-[11px] text-emerald-600 font-medium">
            {stats.total ? Math.round((stats.present / stats.total) * 100) : 0}% sĩ số
          </span>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-semibold">Đi Muộn</span>
            <Clock3 size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700">{stats.late}</div>
          <span className="text-[11px] text-amber-600 font-medium">Đến trễ</span>
        </div>

        <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-xs font-semibold">Vắng Có Phép</span>
            <AlertCircle size={16} className="text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-700">{stats.excused}</div>
          <span className="text-[11px] text-blue-600 font-medium">Có đơn</span>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-semibold">Vắng K.Phép</span>
            <XCircle size={16} className="text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700">{stats.unexcused}</div>
          <span className="text-[11px] text-rose-600 font-medium">Không phép</span>
        </div>

        <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-xs font-semibold">Chuyên Cần</span>
            <Sparkles size={16} className="text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-700">{stats.rate}%</div>
          <span className="text-[11px] text-indigo-600 font-medium">Tỷ lệ tiết này</span>
        </div>
      </div>

      {/* Quick Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-1">
            Gán Nhanh:
          </span>
          <button
            onClick={() => handleMarkAll('present')}
            disabled={records.length === 0}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 size={14} />
            Tất cả Có mặt
          </button>
          <button
            onClick={() => handleMarkAll('excused')}
            disabled={records.length === 0}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <AlertCircle size={14} />
            Tất cả Nghỉ phép
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAttendance}
            disabled={loading || selectedPeriod === null}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Tải lại</span>
          </button>
        </div>
      </div>

      {/* Student Attendance Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
            <p className="text-sm font-semibold text-slate-500">Đang tải danh sách học sinh theo tiết học...</p>
          </div>
        ) : selectedPeriod === null ? (
          <div className="py-16 text-center text-slate-400">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-600">Vui lòng chọn một tiết học phía trên để tiến hành điểm danh</p>
            <p className="text-xs text-slate-400 mt-1">Hệ thống chỉ hiển thị học sinh có lịch học trong tiết này</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Users size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-600">Không tìm thấy học sinh nào trong tiết học này</p>
            <p className="text-xs text-slate-400 mt-1">
              {activePeriod?.subjectType === 'Tự chọn'
                ? 'Môn tự chọn này hiện chưa có học sinh nào đăng ký tham gia.'
                : 'Vui lòng kiểm tra lại danh sách học sinh của lớp.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">STT</th>
                  <th className="py-3.5 px-4 w-28">Mã HS</th>
                  <th className="py-3.5 px-4">Họ và Tên</th>
                  <th className="py-3.5 px-4 text-center w-80">Trạng Thái Điểm Danh</th>
                  <th className="py-3.5 px-4">Ghi Chú / Lý Do</th>
                  <th className="py-3.5 px-4 text-slate-400 text-xs w-36">Liên Hệ PH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((student, idx) => (
                  <tr key={student.studentId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-400 text-xs">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 text-xs">
                      {student.studentCode}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      <div>{student.fullName}</div>
                      <div className="text-[11px] font-normal text-slate-400">{student.gender || 'Chưa cập nhật'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Có mặt */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.studentId, 'present')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            student.status === 'present'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          <CheckCircle2 size={13} />
                          Có mặt
                        </button>

                        {/* Đi muộn */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.studentId, 'late')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            student.status === 'late'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-700'
                          }`}
                        >
                          <Clock3 size={13} />
                          Muộn
                        </button>

                        {/* Vắng có phép */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.studentId, 'excused')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            student.status === 'excused'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-700'
                          }`}
                        >
                          <AlertCircle size={13} />
                          Có phép
                        </button>

                        {/* Vắng không phép */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.studentId, 'unexcused')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            student.status === 'unexcused'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-700'
                          }`}
                        >
                          <XCircle size={13} />
                          K.Phép
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <input 
                        type="text"
                        placeholder="Thêm ghi chú..."
                        value={student.note || ''}
                        onChange={(e) => handleNoteChange(student.studentId, e.target.value)}
                        className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-transparent focus:border-blue-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none transition-colors"
                      />
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-500">
                      {student.parentPhone || student.phone ? (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Phone size={12} className="text-slate-400" />
                          <span>{student.parentPhone || student.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic">Chưa có SĐT</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
