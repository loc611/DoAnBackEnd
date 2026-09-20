import { useState, useEffect, useMemo } from 'react';
import { 
  CalendarPlus, 
  Save, 
  Edit, 
  Sun, 
  Sunset, 
  Moon, 
  Layers, 
  Clock, 
  Printer, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  MapPin, 
  User, 
  GraduationCap, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ExternalLink, 
  Plus, 
  Users, 
  BookOpen,
  Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import MakeupProposalModal from '../components/MakeupProposalModal';
import '../styles/printSchedule.css';

const SESSIONS = [
  { id: 'all', label: 'Cả Ngày', time: '13 tiết', icon: Layers, color: 'text-indigo-600', activeBg: 'bg-indigo-600 text-white' },
  { id: 'morning', label: 'Buổi Sáng', time: '07:00 - 11:20', icon: Sun, color: 'text-amber-500', activeBg: 'bg-amber-500 text-white' },
  { id: 'afternoon', label: 'Buổi Chiều', time: '13:00 - 17:20', icon: Sunset, color: 'text-blue-500', activeBg: 'bg-blue-600 text-white' },
  { id: 'evening', label: 'Buổi Tối', time: '17:45 - 20:10', icon: Moon, color: 'text-purple-500', activeBg: 'bg-purple-600 text-white' }
];

const DAYS = [
  { key: 'monday', label: 'Thứ Hai', dayNum: 1, shortLabel: 'T2' },
  { key: 'tuesday', label: 'Thứ Ba', dayNum: 2, shortLabel: 'T3' },
  { key: 'wednesday', label: 'Thứ Tư', dayNum: 3, shortLabel: 'T4' },
  { key: 'thursday', label: 'Thứ Năm', dayNum: 4, shortLabel: 'T5' },
  { key: 'friday', label: 'Thứ Sáu', dayNum: 5, shortLabel: 'T6' },
  { key: 'saturday', label: 'Thứ Bảy', dayNum: 6, shortLabel: 'T7' }
];

const COMMON_ACTIVITIES = [
  'Chào cờ',
  'Sinh hoạt lớp',
  'Sinh Hoạt CLB',
  'Thể dục',
  'QPAN',
  'Hoạt Động Trải Nghiệm',
  'Kỹ Năng Sống',
  'Giáo Dục Địa Phương',
  'Tự Học Có Hướng Dẫn',
  'Ôn Thi Tốt Nghiệp'
];

const getPeriodSession = (period) => {
  const m = period.match(/Tiết\s+(\d+)/i);
  const num = m ? parseInt(m[1], 10) : 0;
  if (num >= 1 && num <= 5) return 'morning';
  if (num >= 6 && num <= 10) return 'afternoon';
  if (num >= 11) return 'evening';
  return 'morning';
};

// Phân loại màu sắc môn học theo nhóm chuyên môn chuẩn GDPT
const getSubjectStyle = (subjectName = '') => {
  const s = subjectName.toLowerCase();
  if (!s || s === '-') return null;

  // KHTN & Công nghệ: Xanh dương
  if (s.includes('toán') || s.includes('lý') || s.includes('hóa') || s.includes('sinh') || s.includes('tin')) {
    return {
      border: 'border-l-4 border-blue-600',
      badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
      pillBg: 'bg-blue-600 text-white',
      roomBg: 'bg-blue-100 text-blue-800',
      category: 'KHTN'
    };
  }
  // KHXH & Ngôn ngữ: Màu Cam / Hổ phách
  if (s.includes('văn') || s.includes('sử') || s.includes('địa') || s.includes('anh') || s.includes('ngoại ngữ') || s.includes('gdcd') || s.includes('kinh tế')) {
    return {
      border: 'border-l-4 border-amber-500',
      badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
      pillBg: 'bg-amber-500 text-white',
      roomBg: 'bg-amber-100 text-amber-900',
      category: 'KHXH'
    };
  }
  // Thể chất & Hoạt động tập thể: Màu Xanh lá
  if (s.includes('thể dục') || s.includes('gdtc') || s.includes('qpan') || s.includes('chào cờ') || s.includes('sinh hoạt') || s.includes('trải nghiệm')) {
    return {
      border: 'border-l-4 border-emerald-500',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      pillBg: 'bg-emerald-600 text-white',
      roomBg: 'bg-emerald-100 text-emerald-800',
      category: 'Rèn luyện'
    };
  }
  // Khác: Màu Tím
  return {
    border: 'border-l-4 border-purple-500',
    badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
    pillBg: 'bg-purple-600 text-white',
    roomBg: 'bg-purple-100 text-purple-800',
    category: 'Môn khác'
  };
};

const Schedule = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole') || 'student';
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  // Chế độ xem: 'teacher' (Lịch dạy cá nhân) hoặc 'class' (Lịch theo lớp)
  const [viewMode, setViewMode] = useState(userRole === 'teacher' ? 'teacher' : 'class');
  const [weekOffset, setWeekOffset] = useState(0); // 0 = tuần hiện tại

  const [schedule, setSchedule] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [teacherInfo, setTeacherInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeSession, setActiveSession] = useState('all');

  // Modal & Drawer
  const [isMakeupModalOpen, setIsMakeupModalOpen] = useState(false);
  const [makeupInitialData, setMakeupInitialData] = useState(null);
  const [selectedCellDetail, setSelectedCellDetail] = useState(null);

  const currentDayIndex = new Date().getDay(); // 1 = Mon, 6 = Sat

  // Tính toán thông tin Tuần học theo chuẩn Bộ GD&ĐT
  const weekInfo = useMemo(() => {
    const now = new Date();
    // Bắt đầu năm học giả định từ đầu tháng 9
    const yearStart = new Date(now.getFullYear(), 8, 1);
    const dayDiff = Math.floor((now - yearStart) / (24 * 60 * 60 * 1000));
    const baseWeekNumber = Math.max(1, Math.min(35, Math.ceil(dayDiff / 7)));
    const activeWeekNum = Math.max(1, Math.min(35, baseWeekNumber + weekOffset));

    // Tính ngày Thứ 2 và Thứ 7 của tuần đang xem
    const currMonday = new Date(now);
    const dayOfWeek = now.getDay() || 7; // 1 (Mon) -> 7 (Sun)
    currMonday.setDate(now.getDate() - dayOfWeek + 1 + (weekOffset * 7));
    
    const currSaturday = new Date(currMonday);
    currSaturday.setDate(currMonday.getDate() + 5);

    const formatDateStr = (d) => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}`;
    };

    return {
      weekNumber: activeWeekNum,
      isCurrent: weekOffset === 0,
      rangeText: `${formatDateStr(currMonday)} - ${formatDateStr(currSaturday)}/${currSaturday.getFullYear()}`,
      mondayDate: currMonday,
      getDateForDayNum: (dNum) => {
        const d = new Date(currMonday);
        d.setDate(currMonday.getDate() + (dNum - 1));
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    };
  }, [weekOffset]);

  // Tải danh sách môn học & danh sách lớp
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [subRes, clsRes] = await Promise.all([
          api.get('/subjects').catch(() => ({ data: [] })),
          api.get('/classes').catch(() => ({ data: [] }))
        ]);
        setSubjects(subRes.data || []);
        setClasses(clsRes.data || []);
        if (clsRes.data && clsRes.data.length > 0) {
          if (userRole === 'student' && userData.classId) {
            setSelectedClass(userData.classId);
          } else if (!selectedClass) {
            setSelectedClass(clsRes.data[0].id);
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách môn / lớp:', err);
      }
    };
    fetchInitialData();
  }, [userRole, userData.classId]);

  // Tải thời khóa biểu tương ứng theo chế độ xem
  useEffect(() => {
    const loadScheduleData = async () => {
      setLoading(true);
      try {
        if (viewMode === 'teacher') {
          // Lấy TKB cá nhân của giáo viên
          const res = await api.get('/schedule/teacher/me?semester=HK1_2026');
          setTeacherInfo(res.data.teacherInfo || null);
          setSchedule(res.data.schedules || []);
        } else {
          // Lấy TKB theo lớp
          const targetClassId = userRole === 'student' ? (userData.classId || selectedClass) : selectedClass;
          if (targetClassId) {
            const res = await api.get(`/schedule/class/${targetClassId}?semester=HK1_2026`);
            setSchedule(res.data || []);
          }
        }
      } catch (error) {
        console.error('Lỗi khi tải thời khóa biểu:', error);
      } finally {
        setLoading(false);
      }
    };

    loadScheduleData();
  }, [viewMode, selectedClass, userRole, userData.classId]);

  const handleChange = (period, day, value) => {
    setSchedule(prev => prev.map(row => 
      row.period === period ? { ...row, [day]: value || '-' } : row
    ));
  };

  const handleSave = async () => {
    try {
      await api.put(`/schedule/class/${selectedClass}`, {
        semester: 'HK1_2026',
        schedules: schedule
      });
      setIsEditing(false);
      alert('Đã lưu thời khóa biểu thành công!');
    } catch (error) {
      console.error('Failed to save schedule', error);
      alert('Lỗi khi lưu thời khóa biểu');
    }
  };

  // Mở modal đề xuất dạy bù từ ô trống hoặc từ tiết cụ thể
  const handleOpenMakeupFromCell = (period, dayKey, dayNum, existingDetail = null) => {
    const targetDate = weekInfo.getDateForDayNum(dayNum);
    
    if (existingDetail) {
      // Đang bấm vào một tiết học có sẵn -> Muốn báo nghỉ và xin dạy bù
      setMakeupInitialData({
        classId: existingDetail.classId || selectedClass,
        subject: existingDetail.subject || '',
        originalDate: targetDate,
        originalPeriod: period.split(' ')[0] + ' ' + period.split(' ')[1],
        proposedDate: '',
        proposedPeriod: '',
        contextNote: `Báo nghỉ và đề xuất dạy bù cho môn ${existingDetail.subject} (Lớp ${existingDetail.className || 'đang chọn'}) ngày ${targetDate}`
      });
    } else {
      // Bấm vào ô trống -> Muốn xin dạy bù vào khung giờ này
      setMakeupInitialData({
        classId: selectedClass || (classes[0]?.id || ''),
        subject: '',
        originalDate: '',
        originalPeriod: '',
        proposedDate: targetDate,
        proposedPeriod: period.split(' ')[0] + ' ' + period.split(' ')[1],
        contextNote: `Đăng ký dạy bù vào ô ${period.split(' (')[0]} - ${DAYS.find(d => d.key === dayKey)?.label} (${targetDate})`
      });
    }
    setIsMakeupModalOpen(true);
  };

  const handleMakeupSubmit = async (formData) => {
    try {
      await api.post('/makeup-proposals', { ...formData, status: 'Pending' });
      alert('Đề xuất dạy bù đã được gửi thành công và đang chờ ban giám hiệu duyệt!');
      setIsMakeupModalOpen(false);
      setMakeupInitialData(null);
    } catch (error) {
      console.error('Failed to submit makeup proposal:', error);
      alert('Gửi đề xuất thất bại. Vui lòng thử lại!');
    }
  };

  // Xuất file CSV / Excel với UTF-8 BOM
  const handleExportCSV = () => {
    if (!schedule || schedule.length === 0) {
      alert('Không có dữ liệu thời khóa biểu để xuất!');
      return;
    }

    const title = viewMode === 'teacher' 
      ? `TKB_GiaoVien_${teacherInfo?.fullName || 'CaNhan'}_Tuan${weekInfo.weekNumber}`
      : `TKB_Lop_${classes.find(c => c.id === selectedClass)?.className || 'Lop'}_Tuan${weekInfo.weekNumber}`;

    let csvContent = '\uFEFF'; // UTF-8 BOM để Excel hiển thị tiếng Việt không bị lỗi font
    csvContent += `THỜI KHÓA BIỂU GIẢNG DẠY - TRƯỜNG THPT TTLN\n`;
    csvContent += `Chế độ: ${viewMode === 'teacher' ? 'Lịch dạy cá nhân' : 'Lịch theo lớp'} | Tuần ${weekInfo.weekNumber} (${weekInfo.rangeText})\n\n`;
    csvContent += `Tiết học,Thứ Hai,Thứ Ba,Thứ Tư,Thứ Năm,Thứ Sáu,Thứ Bảy\n`;

    schedule.forEach(row => {
      const escape = (val) => `"${(val || '-').replace(/"/g, '""')}"`;
      csvContent += `${escape(row.period)},${escape(row.monday)},${escape(row.tuesday)},${escape(row.wednesday)},${escape(row.thursday)},${escape(row.friday)},${escape(row.saturday)}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // In ấn chuyên nghiệp chuẩn A4 ngang
  const handlePrint = () => {
    window.print();
  };

  // Lọc các tiết theo buổi được chọn
  const filteredSchedule = activeSession === 'all'
    ? schedule
    : schedule.filter(row => getPeriodSession(row.period) === activeSession);

  // Gợi ý môn học
  const subjectSuggestions = Array.from(new Set([
    ...subjects.map(s => s.name),
    ...COMMON_ACTIVITIES
  ]));

  const currentClassName = classes.find(c => c.id === selectedClass)?.className || 'Lớp học';

  return (
    <div className="space-y-6">
      {/* 1. Header & Bộ Điều Khiển Chính */}
      <div className="no-print bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Calendar size={22} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  Thời khóa biểu
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold">
                    HK1 2025-2026
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {viewMode === 'teacher' 
                    ? `Lịch giảng dạy phân công cá nhân: ${teacherInfo?.fullName || 'Giáo viên'} (${teacherInfo?.totalAssignedClasses || 0} lớp phụ trách)`
                    : `Lịch học toàn diện theo lớp: ${currentClassName}`}
                </p>
              </div>
            </div>
          </div>

          {/* Công cụ Chuyển Đổi View & Xuất bản */}
          <div className="flex items-center flex-wrap gap-2.5 w-full lg:w-auto">
            {/* Toggle Dual-View: Lịch dạy của tôi VS Lịch theo lớp */}
            {userRole !== 'student' && (
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold">
                <button
                  onClick={() => setViewMode('teacher')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    viewMode === 'teacher'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <User size={14} />
                  <span>Lịch dạy của tôi</span>
                </button>
                <button
                  onClick={() => setViewMode('class')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    viewMode === 'class'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Users size={14} />
                  <span>Lịch theo lớp</span>
                </button>
              </div>
            )}

            {/* Dropdown chọn lớp (Chỉ hiện khi ở Class View) */}
            {viewMode === 'class' && userRole !== 'student' && (
              <div className="flex items-center gap-1.5">
                <select 
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>Lớp {c.className}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Nút In ấn A4 & Xuất Excel */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-medium shadow-xs transition-colors"
              title="In bản A4 ngang chuẩn văn bản"
            >
              <Printer size={15} className="text-slate-500" />
              <span className="hidden sm:inline">In TKB</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-medium shadow-xs transition-colors"
              title="Xuất file Excel CSV"
            >
              <Download size={15} className="text-slate-500" />
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>

            {/* Chế độ Admin Edit TKB */}
            {userRole === 'admin' && viewMode === 'class' && (
              <>
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex items-center px-3 py-1.5 rounded-xl transition-all text-xs font-semibold shadow-xs ${
                    isEditing 
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  <Edit size={14} className="mr-1" />
                  {isEditing ? 'Hủy' : 'Chỉnh sửa'}
                </button>
                {isEditing && (
                  <button 
                    onClick={handleSave}
                    className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-xs font-semibold shadow-xs shadow-blue-500/30"
                  >
                    <Save size={14} className="mr-1" />
                    Lưu TKB
                  </button>
                )}
              </>
            )}

            {/* Nút Tạo đề xuất dạy bù nhanh */}
            {userRole === 'teacher' && (
              <button 
                onClick={() => {
                  setMakeupInitialData(null);
                  setIsMakeupModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-xs shadow-amber-500/30 transition-colors active:scale-95"
              >
                <CalendarPlus size={15} />
                <span>Đề xuất dạy bù</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Thanh Duyệt Tuần Học Chuẩn GDPT & Bộ Lọc Buổi */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Tuần học selector */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
            <button
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              title="Tuần trước"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-2 px-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Calendar size={14} className="text-blue-500" />
              <span>Tuần {weekInfo.weekNumber}:</span>
              <span className="font-mono text-slate-600 dark:text-slate-400 font-normal">
                {weekInfo.rangeText}
              </span>
              {weekInfo.isCurrent && (
                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                  Hiện tại
                </span>
              )}
            </div>

            <button
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              title="Tuần sau"
            >
              <ChevronRight size={16} />
            </button>

            {!weekInfo.isCurrent && (
              <button
                onClick={() => setWeekOffset(0)}
                className="ml-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Về tuần này
              </button>
            )}
          </div>

          {/* Lọc buổi: Cả ngày / Sáng / Chiều / Tối */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            {SESSIONS.map((sess) => {
              const Icon = sess.icon;
              const isActive = activeSession === sess.id;
              return (
                <button
                  key={sess.id}
                  onClick={() => setActiveSession(sess.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? `${sess.activeBg} shadow-xs font-semibold`
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon size={14} />
                  <span>{sess.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Datalist gợi ý môn học cho chế độ Edit */}
      <datalist id="subject-suggestions">
        {subjectSuggestions.map((item, idx) => (
          <option key={idx} value={item} />
        ))}
      </datalist>

      {/* 3. BẢNG THỜI KHÓA BIỂU HIỆN ĐẠI (GRID VIEW) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-slate-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
              <div className="text-sm font-medium">Đang đồng bộ thời khóa biểu giảng dạy...</div>
            </div>
          ) : filteredSchedule.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <Calendar className="mx-auto text-slate-300 dark:text-slate-600 mb-2" size={36} />
              <div className="text-sm font-medium">Chưa có lịch dạy trong khung thời gian này.</div>
            </div>
          ) : (
            <table className="w-full text-center text-sm border-collapse">
              {/* Header các Thứ */}
              <thead className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white font-semibold">
                <tr>
                  <th className="px-4 py-3.5 border-r border-blue-600/40 w-48 text-left pl-5">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-blue-200" />
                      <span className="text-xs uppercase tracking-wider font-bold">Tiết / Khung Giờ</span>
                    </div>
                  </th>
                  {DAYS.map((day) => {
                    const isToday = currentDayIndex === day.dayNum && weekInfo.isCurrent;
                    return (
                      <th 
                        key={day.key} 
                        className={`px-3 py-3 border-r border-blue-600/40 last:border-0 transition-colors ${
                          isToday ? 'bg-blue-900/90 text-amber-300 ring-2 ring-amber-400/50 inset-0' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-bold">{day.label}</span>
                            {isToday && (
                              <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase shadow-xs">
                                Hôm nay
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-normal text-blue-200/90">
                            {weekInfo.getDateForDayNum(day.dayNum).split('-').slice(1).reverse().join('/')}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Thân bảng lịch */}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                {filteredSchedule.map((row, idx) => {
                  const sessionType = getPeriodSession(row.period);
                  const isPeriod5 = row.period.includes('Tiết 5');
                  const isPeriod10 = row.period.includes('Tiết 10');

                  return (
                    <tr key={idx} className="hover:bg-blue-50/20 dark:hover:bg-slate-800/40 transition-colors group">
                      {/* Cột Tiết & Thời gian */}
                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-left pl-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            sessionType === 'morning' ? 'bg-amber-400' : sessionType === 'afternoon' ? 'bg-blue-500' : 'bg-purple-500'
                          }`} />
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100 leading-tight">{row.period.split(' (')[0]}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-normal">
                              {row.period.includes('(') ? row.period.substring(row.period.indexOf('(')) : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Các cột Thứ 2 -> Thứ 7 */}
                      {DAYS.map((day) => {
                        const isToday = currentDayIndex === day.dayNum && weekInfo.isCurrent;
                        const cellValue = row[day.key];
                        const cellDetail = row.details?.[day.key] || null;
                        const hasContent = cellValue && cellValue !== '-';

                        // Trích xuất tên môn & lớp
                        const subjectName = cellDetail?.subject || (hasContent ? cellValue.split(' - ')[0] : '');
                        const displayClass = cellDetail?.className || (hasContent && cellValue.includes(' - ') ? cellValue.split(' - ')[1] : '');
                        const displayTeacher = cellDetail?.teacherName || '';
                        const displayRoom = cellDetail?.room || (hasContent ? 'P.101' : '');
                        const style = getSubjectStyle(subjectName);

                        return (
                          <td 
                            key={day.key} 
                            className={`px-2 py-2 border-r border-slate-100 dark:border-slate-800 last:border-0 align-top transition-colors ${
                              isToday ? 'bg-blue-50/15 dark:bg-blue-900/10' : ''
                            }`}
                          >
                            {isEditing ? (
                              <div className="relative">
                                <input 
                                  type="text" 
                                  list="subject-suggestions"
                                  className="w-full px-2 py-1.5 text-center text-xs font-medium border border-blue-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-inner"
                                  value={cellValue === '-' ? '' : cellValue}
                                  onChange={(e) => handleChange(row.period, day.key, e.target.value)}
                                  placeholder="—"
                                />
                              </div>
                            ) : hasContent ? (
                              /* THẺ TIẾT HỌC 3 TẦNG (TIMETABLE CARD) */
                              <div 
                                onClick={() => setSelectedCellDetail({
                                  period: row.period,
                                  dayLabel: day.label,
                                  dayKey: day.key,
                                  dayNum: day.dayNum,
                                  subject: subjectName,
                                  className: displayClass || currentClassName,
                                  teacherName: displayTeacher || (teacherInfo?.fullName || 'Giáo viên'),
                                  room: displayRoom,
                                  detail: cellDetail
                                })}
                                className={`p-2.5 rounded-xl text-left cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                                  style?.border || 'border-l-4 border-slate-400'
                                } ${style?.badgeBg || 'bg-slate-50 text-slate-800 border-slate-200'} border shadow-xs`}
                              >
                                {/* Tầng 1: Tên môn + Badge Phòng học */}
                                <div className="flex items-start justify-between gap-1">
                                  <span className="font-bold text-xs truncate max-w-[120px] sm:max-w-full">
                                    {subjectName}
                                  </span>
                                  {displayRoom && (
                                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${style?.roomBg || 'bg-slate-200 text-slate-700'}`}>
                                      {displayRoom}
                                    </span>
                                  )}
                                </div>

                                {/* Tầng 2: Thông tin Lớp (Teacher View) hoặc Giáo viên (Class View) */}
                                <div className="mt-1 flex items-center justify-between text-[11px] opacity-85">
                                  {viewMode === 'teacher' ? (
                                    <span className="flex items-center gap-1 font-semibold">
                                      <Users size={12} className="shrink-0 text-slate-500" />
                                      <span>{displayClass || 'Lớp'}</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 font-medium truncate max-w-[110px]">
                                      <User size={12} className="shrink-0 text-slate-500" />
                                      <span className="truncate">{displayTeacher || 'GV Bộ Môn'}</span>
                                    </span>
                                  )}

                                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                    {style?.category || 'Môn'}
                                  </span>
                                </div>

                                {/* Tầng 3: Trạng thái tiết (Nếu là hôm nay) */}
                                {isToday && (
                                  <div className="mt-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                                    <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-300 font-semibold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
                                      Hôm nay
                                    </span>
                                    <span className="text-slate-400 hover:text-blue-600 font-medium">Chi tiết →</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              /* Ô TRỐNG (FREE PERIOD): Hover hiện nút đề xuất dạy bù */
                              <div 
                                onClick={() => userRole === 'teacher' && handleOpenMakeupFromCell(row.period, day.key, day.dayNum, null)}
                                className={`h-16 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-700 transition-all ${
                                  userRole === 'teacher' ? 'hover:border-amber-400 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 hover:text-amber-600 cursor-pointer group/cell' : ''
                                }`}
                                title={userRole === 'teacher' ? "Bấm vào ô trống để đăng ký dạy bù hoặc mượn phòng" : ""}
                              >
                                {userRole === 'teacher' ? (
                                  <div className="hidden group-hover/cell:flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                    <Plus size={13} />
                                    <span>Đăng ký bù</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-700 font-light">—</span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 4. MODAL DRAWER CHI TIẾT TIẾT HỌC & HÀNH ĐỘNG NGỮ CẢNH */}
      {selectedCellDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            {/* Header Drawer */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Chi tiết tiết giảng dạy
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedCellDetail.dayLabel} • {selectedCellDetail.period}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCellDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Nội dung chi tiết */}
            <div className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Môn học:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    {selectedCellDetail.subject}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Lớp học:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    Lớp {selectedCellDetail.className}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Phòng học:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    <MapPin size={12} className="inline mr-1 text-rose-500" />
                    {selectedCellDetail.room}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Giáo viên phụ trách:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {selectedCellDetail.teacherName}
                  </span>
                </div>
              </div>

              {/* Các thao tác sư phạm liên kết */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Nghiệp vụ liên kết
                </p>

                {userRole === 'teacher' && (
                  <button
                    onClick={() => {
                      const detail = selectedCellDetail;
                      setSelectedCellDetail(null);
                      handleOpenMakeupFromCell(detail.period, detail.dayKey, detail.dayNum, detail);
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 hover:bg-amber-100 transition-colors font-medium text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <CalendarPlus size={16} className="text-amber-600" />
                      <span>Báo nghỉ & Đề xuất dạy bù</span>
                    </div>
                    <span className="text-[11px] font-bold">Thao tác →</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedCellDetail(null);
                    navigate('/lesson-logs');
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors font-medium text-xs"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-blue-600" />
                    <span>Mở Sổ Đầu Bài điện tử</span>
                  </div>
                  <ExternalLink size={14} className="text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    setSelectedCellDetail(null);
                    navigate('/attendance');
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors font-medium text-xs"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Điểm danh học sinh tiết này</span>
                  </div>
                  <ExternalLink size={14} className="text-slate-400" />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-end">
              <button
                onClick={() => setSelectedCellDetail(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-300 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. GIAO DIỆN IN ẤN DÀNH RIÊNG CHO KHỔ A4 NGANG (PRINT ONLY) */}
      <div className="hidden print:block print-container font-serif text-black">
        {/* Tiêu ngữ & Tên Trường */}
        <div className="flex justify-between items-start border-b pb-3 mb-4">
          <div className="text-center">
            <p className="font-bold text-xs uppercase">SỞ GIÁO DỤC VÀ ĐÀO TẠO</p>
            <p className="font-extrabold text-sm uppercase">TRƯỜNG THPT TTLN</p>
            <p className="text-[10px] text-gray-600">Năm học 2025 - 2026</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-xs uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p className="text-xs font-bold underline">Độc lập - Tự do - Hạnh phúc</p>
          </div>
        </div>

        {/* Tiêu đề Bảng */}
        <div className="text-center my-3">
          <h1 className="text-lg font-black uppercase tracking-wider">
            {viewMode === 'teacher' ? 'THỜI KHÓA BIỂU GIẢNG DẠY CÁ NHÂN' : `THỜI KHÓA BIỂU LỚP ${currentClassName}`}
          </h1>
          <p className="text-xs italic mt-0.5">
            {viewMode === 'teacher' ? `Giáo viên: ${teacherInfo?.fullName || '................'}` : `Giáo viên chủ nhiệm: ${teacherInfo?.homeroomClass || '................'}`} 
            {' '} • Áp dụng: Tuần {weekInfo.weekNumber} ({weekInfo.rangeText})
          </p>
        </div>

        {/* Bảng in ấn A4 nét mảnh sắc nét */}
        <table className="w-full border-collapse border border-black text-[10.5pt] text-center my-3">
          <thead>
            <tr className="bg-gray-100 font-bold">
              <th className="border border-black px-2 py-2 w-28 text-left">Tiết học</th>
              {DAYS.map(d => (
                <th key={d.key} className="border border-black px-2 py-2">{d.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.map((row, idx) => (
              <tr key={idx}>
                <td className="border border-black px-2 py-1.5 font-bold text-left whitespace-nowrap bg-gray-50">
                  {row.period.split(' (')[0]}
                </td>
                {DAYS.map(d => {
                  const val = row[d.key];
                  const detail = row.details?.[d.key];
                  return (
                    <td key={d.key} className="border border-black px-1.5 py-1">
                      {val && val !== '-' ? (
                        <div className="leading-tight">
                          <p className="font-bold">{detail?.subject || val.split(' - ')[0]}</p>
                          <p className="text-[9pt] italic">
                            {viewMode === 'teacher' ? (detail?.className || '') : (detail?.teacherName || '')} 
                            {detail?.room ? ` - ${detail.room}` : ''}
                          </p>
                        </div>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Khung ký tên hành chính trường học */}
        <div className="flex justify-between items-start mt-8 pt-4 text-xs">
          <div className="text-center w-1/3">
            <p className="font-bold uppercase">NGƯỜI LẬP BIỂU</p>
            <p className="italic text-[10px] text-gray-500">(Ký và ghi rõ họ tên)</p>
            <div className="h-16"></div>
            <p className="font-semibold">{viewMode === 'teacher' ? (teacherInfo?.fullName || 'Giáo viên') : 'Cán bộ giáo vụ'}</p>
          </div>

          <div className="text-center w-1/3">
            <p className="font-bold uppercase">TỔ TRƯỞNG CHUYÊN MÔN</p>
            <p className="italic text-[10px] text-gray-500">(Ký duyệt)</p>
            <div className="h-16"></div>
          </div>

          <div className="text-center w-1/3">
            <p className="italic text-[10px]">Ngày ..... tháng ..... năm 2026</p>
            <p className="font-bold uppercase">HIỆU TRƯỞNG PHÊ DUYỆT</p>
            <p className="italic text-[10px] text-gray-500">(Ký tên và đóng dấu)</p>
            <div className="h-16"></div>
          </div>
        </div>
      </div>

      {/* 6. Modal Đề xuất dạy bù */}
      <MakeupProposalModal 
        isOpen={isMakeupModalOpen}
        onClose={() => {
          setIsMakeupModalOpen(false);
          setMakeupInitialData(null);
        }}
        onSubmit={handleMakeupSubmit}
        classes={classes}
        subjects={subjects}
        initialData={makeupInitialData}
      />
    </div>
  );
};

export default Schedule;
