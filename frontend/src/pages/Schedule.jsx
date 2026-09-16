import { useState, useEffect } from 'react';
import { CalendarPlus, Save, Edit, Sun, Sunset, Moon, Layers, Clock } from 'lucide-react';
import api from '../services/api';

const SESSIONS = [
  { id: 'morning', label: 'Buổi Sáng', time: '07:00 - 11:20', icon: Sun, color: 'text-amber-500', activeBg: 'bg-amber-500 text-white' },
  { id: 'afternoon', label: 'Buổi Chiều', time: '13:00 - 17:20', icon: Sunset, color: 'text-blue-500', activeBg: 'bg-blue-600 text-white' },
  { id: 'evening', label: 'Buổi Tối', time: '17:45 - 20:10', icon: Moon, color: 'text-purple-500', activeBg: 'bg-purple-600 text-white' },
  { id: 'all', label: 'Tất Cả', time: '13 tiết', icon: Layers, color: 'text-gray-500', activeBg: 'bg-gray-800 text-white' }
];

const DAYS = [
  { key: 'monday', label: 'Thứ Hai', dayNum: 1 },
  { key: 'tuesday', label: 'Thứ Ba', dayNum: 2 },
  { key: 'wednesday', label: 'Thứ Tư', dayNum: 3 },
  { key: 'thursday', label: 'Thứ Năm', dayNum: 4 },
  { key: 'friday', label: 'Thứ Sáu', dayNum: 5 },
  { key: 'saturday', label: 'Thứ Bảy', dayNum: 6 }
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
  'Ôn Thi Tốt Nghiệp',
  'Giải Đáp Thắc Mắc',
  'Học Nhóm'
];

const getPeriodSession = (period) => {
  const m = period.match(/Tiết\s+(\d+)/i);
  const num = m ? parseInt(m[1], 10) : 0;
  if (num >= 1 && num <= 5) return 'morning';
  if (num >= 6 && num <= 10) return 'afternoon';
  if (num >= 11) return 'evening';
  return 'morning';
};

const Schedule = () => {
  const [schedule, setSchedule] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeSession, setActiveSession] = useState('morning');

  const userRole = localStorage.getItem('userRole') || 'student';
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const currentDayIndex = new Date().getDay(); // 1 = Mon, 6 = Sat

  // Tải danh sách môn học để gợi ý khi chỉnh sửa
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get('/subjects');
        setSubjects(res.data || []);
      } catch (err) {
        console.error('Failed to fetch subjects:', err);
      }
    };
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (userRole !== 'student') {
      const fetchClasses = async () => {
        try {
          const res = await api.get('/classes');
          setClasses(res.data);
          if (res.data.length > 0) {
            setSelectedClass(res.data[0].id);
          }
        } catch (error) {
          console.error("Failed to fetch classes", error);
        }
      };
      fetchClasses();
    } else {
      if (userData.classId) {
        setSelectedClass(userData.classId);
      }
    }
  }, [userRole, userData.classId]);

  useEffect(() => {
    if (!selectedClass) return;
    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/schedule/class/${selectedClass}?semester=HK1_2026`);
        setSchedule(res.data || []);
      } catch (error) {
        console.error("Failed to fetch schedule", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [selectedClass]);

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

  // Lọc các tiết theo buổi được chọn
  const filteredSchedule = activeSession === 'all'
    ? schedule
    : schedule.filter(row => getPeriodSession(row.period) === activeSession);

  // Danh sách gợi ý tổng hợp môn học & hoạt động
  const subjectSuggestions = Array.from(new Set([
    ...subjects.map(s => s.name),
    ...COMMON_ACTIVITIES
  ]));

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Thời khóa biểu</h2>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý và theo dõi lịch học Buổi Sáng, Buổi Chiều và Buổi Tối theo tuần
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3 w-full sm:w-auto">
          {userRole === 'student' ? (
             <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-medium border border-blue-100">
               Lớp của bạn: {userData.className || 'Chưa phân lớp'}
             </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Lớp:</span>
              <select 
                className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white font-medium shadow-sm"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.className}</option>
                ))}
              </select>
            </div>
          )}
          
          {userRole === 'admin' && (
             <>
               <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex items-center px-4 py-2 rounded-xl transition-all text-sm font-medium shadow-sm ${
                    isEditing 
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
               >
                 <Edit size={16} className="mr-1.5" />
                 {isEditing ? 'Hủy sửa' : 'Chỉnh sửa'}
               </button>
               {isEditing && (
                 <button 
                    onClick={handleSave}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm font-medium shadow-sm shadow-blue-500/30"
                 >
                   <Save size={16} className="mr-1.5" />
                   Lưu TKB
                 </button>
               )}
             </>
          )}
          
          {userRole === 'teacher' && (
            <button className="flex items-center px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors text-sm font-medium whitespace-nowrap shadow-sm shadow-amber-500/30">
              <CalendarPlus size={16} className="mr-1.5" />
              Đề xuất dạy bù
            </button>
          )}
        </div>
      </div>

      {/* Datalist gợi ý môn học cho chế độ Edit */}
      <datalist id="subject-suggestions">
        {subjectSuggestions.map((item, idx) => (
          <option key={idx} value={item} />
        ))}
      </datalist>

      {/* Thanh chuyển đổi Buổi (Tabs) */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-gray-100/80 rounded-2xl border border-gray-200/60 max-w-fit">
        {SESSIONS.map((sess) => {
          const Icon = sess.icon;
          const isActive = activeSession === sess.id;
          return (
            <button
              key={sess.id}
              onClick={() => setActiveSession(sess.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? `${sess.activeBg} shadow-sm scale-[1.02]`
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-white' : sess.color} />
              <span>{sess.label}</span>
              <span className={`text-[11px] font-normal px-2 py-0.5 rounded-full ${
                isActive ? 'bg-white/20 text-white' : 'bg-gray-200/70 text-gray-600'
              }`}>
                {sess.time}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bảng Thời khóa biểu */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <div>Đang tải thời khóa biểu...</div>
            </div>
          ) : filteredSchedule.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              Chưa có tiết học nào trong buổi này.
            </div>
          ) : (
            <table className="w-full text-center text-sm text-gray-600">
              <thead className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white font-semibold">
                <tr>
                  <th className="px-4 py-4 border-r border-blue-600/50 w-48 text-left pl-6">
                    <div className="flex items-center gap-1.5">
                      <Clock size={16} className="text-blue-200" />
                      <span>Tiết / Giờ học</span>
                    </div>
                  </th>
                  {DAYS.map((day) => {
                    const isToday = currentDayIndex === day.dayNum;
                    return (
                      <th 
                        key={day.key} 
                        className={`px-3 py-4 border-r border-blue-600/50 last:border-0 ${
                          isToday ? 'bg-blue-800/80 text-amber-300' : ''
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{day.label}</span>
                          {isToday && (
                            <span className="text-[10px] bg-amber-400 text-slate-900 font-extrabold px-1.5 py-0.5 rounded-md">
                              Hôm nay
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSchedule.map((row, idx) => {
                  const sessionType = getPeriodSession(row.period);
                  return (
                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-4 font-semibold text-gray-700 border-r border-gray-100 bg-gray-50/60 text-left pl-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            sessionType === 'morning' ? 'bg-amber-400' : sessionType === 'afternoon' ? 'bg-blue-500' : 'bg-purple-500'
                          }`} />
                          <span className="text-xs sm:text-sm">{row.period}</span>
                        </div>
                      </td>
                      
                      {DAYS.map((day) => {
                        const isToday = currentDayIndex === day.dayNum;
                        return (
                          <td 
                            key={day.key} 
                            className={`px-3 py-4 border-r border-gray-100 last:border-0 ${
                              isToday ? 'bg-blue-50/20' : ''
                            }`}
                          >
                            {isEditing ? (
                              <div className="relative">
                                <input 
                                  type="text" 
                                  list="subject-suggestions"
                                  className="w-full px-2 py-1.5 text-center text-xs sm:text-sm font-medium border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-inner"
                                  value={row[day.key] === '-' ? '' : row[day.key]}
                                  onChange={(e) => handleChange(row.period, day.key, e.target.value)}
                                  placeholder="—"
                                />
                              </div>
                            ) : (
                              row[day.key] && row[day.key] !== '-' ? (
                                <div className={`inline-block px-3 py-2 rounded-xl font-semibold text-xs sm:text-sm border shadow-xs transition-transform hover:scale-105 cursor-pointer max-w-full truncate ${
                                  isToday
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20'
                                    : sessionType === 'evening'
                                      ? 'bg-purple-50 text-purple-700 border-purple-100'
                                      : sessionType === 'afternoon'
                                        ? 'bg-sky-50 text-sky-800 border-sky-100'
                                        : 'bg-blue-50 text-blue-700 border-blue-100'
                                }`}>
                                  {row[day.key]}
                                </div>
                              ) : (
                                <span className="text-gray-300 font-medium">—</span>
                              )
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
    </div>
  );
};

export default Schedule;
