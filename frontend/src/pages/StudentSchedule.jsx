import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, AlertCircle, Sun, Sunset, Moon, Layers } from 'lucide-react';
import api from '../services/api';

const SESSIONS = [
  { id: 'morning', label: 'Buổi Sáng', time: '07:00 - 11:20', icon: Sun, color: 'text-amber-500', activeBg: 'bg-amber-500 text-white' },
  { id: 'afternoon', label: 'Buổi Chiều', time: '13:00 - 17:20', icon: Sunset, color: 'text-blue-500', activeBg: 'bg-blue-600 text-white' },
  { id: 'evening', label: 'Buổi Tối', time: '17:45 - 20:10', icon: Moon, color: 'text-purple-500', activeBg: 'bg-purple-600 text-white' },
  { id: 'all', label: 'Tất Cả Buổi', time: '13 tiết', icon: Layers, color: 'text-gray-500', activeBg: 'bg-slate-800 text-white' }
];

const getPeriodSession = (period) => {
  const m = period.match(/Tiết\s+(\d+)/i);
  const num = m ? parseInt(m[1], 10) : 0;
  if (num >= 1 && num <= 5) return 'morning';
  if (num >= 6 && num <= 10) return 'afternoon';
  if (num >= 11) return 'evening';
  return 'morning';
};

const StudentSchedule = () => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState('HK1_2026');
  const [activeSession, setActiveSession] = useState('morning');

  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  useEffect(() => {
    fetchSchedule();
  }, [semester, userData.classId]);

  const fetchSchedule = async () => {
    if (!userData.classId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.get(`/schedule/class/${userData.classId}?semester=${semester}`);
      setSchedule(res.data || []);
    } catch (err) {
      console.error('Error fetching schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const daysOfWeek = [
    { key: 'monday', label: 'Thứ Hai', dayNum: 1 },
    { key: 'tuesday', label: 'Thứ Ba', dayNum: 2 },
    { key: 'wednesday', label: 'Thứ Tư', dayNum: 3 },
    { key: 'thursday', label: 'Thứ Năm', dayNum: 4 },
    { key: 'friday', label: 'Thứ Sáu', dayNum: 5 },
    { key: 'saturday', label: 'Thứ Bảy', dayNum: 6 }
  ];

  const currentDayIndex = new Date().getDay(); // 0 is Sun, 1 is Mon... 6 is Sat

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!userData.classId) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center max-w-lg mx-auto shadow-sm border border-gray-100 mt-8">
        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Chưa được xếp vào lớp học</h2>
        <p className="text-gray-500 text-sm mt-2">
          Bạn chưa được ban giám hiệu phân vào lớp học cụ thể, do đó chưa có thời khóa biểu.
        </p>
      </div>
    );
  }

  const filteredSchedule = activeSession === 'all'
    ? schedule
    : schedule.filter(row => getPeriodSession(row.period) === activeSession);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 rounded-3xl p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            Lịch Học & Thời Khóa Biểu
          </span>
          <h1 className="text-3xl font-extrabold mt-2">Thời Khóa Biểu Lớp {userData.className}</h1>
          <p className="text-blue-100 text-sm mt-1">
            GVCN: <strong>{userData.homeroomTeacher || 'Chưa cập nhật'}</strong> • Năm học: <strong>2026-2027</strong>
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 flex items-center gap-2">
          <Calendar size={18} className="text-blue-200 ml-2" />
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="bg-transparent text-white font-medium py-1 px-3 outline-none cursor-pointer text-sm"
          >
            <option value="HK1_2026" className="text-gray-800">Học kỳ 1 (2026-2027)</option>
            <option value="HK2_2026" className="text-gray-800">Học kỳ 2 (2026-2027)</option>
          </select>
        </div>
      </div>

      {/* Tabs Chuyển Buổi Học (Sáng / Chiều / Tối / Tất Cả) */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200/60 max-w-fit shadow-xs">
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

      {/* Grid Timetable */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {filteredSchedule.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              Chưa có lịch học trong buổi này.
            </div>
          ) : (
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-4 px-4 w-48 text-sm font-semibold border-r border-slate-800 text-left pl-6">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-blue-400" />
                      <span>Tiết / Giờ học</span>
                    </div>
                  </th>
                  {daysOfWeek.map((d) => {
                    const isToday = currentDayIndex === d.dayNum;
                    return (
                      <th
                        key={d.key}
                        className={`py-4 px-3 text-sm font-semibold border-r border-slate-800 last:border-0 ${
                          isToday ? 'bg-blue-600 text-white' : ''
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {d.label}
                          {isToday && (
                            <span className="bg-white text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                              HÔM NAY
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredSchedule.map((row, idx) => {
                  const sessionType = getPeriodSession(row.period);
                  return (
                    <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                      <td className="py-4 px-4 font-semibold text-gray-700 text-xs sm:text-sm bg-gray-50/50 border-r border-gray-100 text-left pl-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            sessionType === 'morning' ? 'bg-amber-400' : sessionType === 'afternoon' ? 'bg-blue-500' : 'bg-purple-500'
                          }`} />
                          <span>{row.period}</span>
                        </div>
                      </td>
                      {daysOfWeek.map((d) => {
                        const subject = row[d.key];
                        const isOccupied = subject && subject !== '-';
                        const isToday = currentDayIndex === d.dayNum;
                        return (
                          <td
                            key={d.key}
                            className={`py-4 px-3 border-r border-gray-100 last:border-0 ${
                              isToday ? 'bg-blue-50/20' : ''
                            }`}
                          >
                            {isOccupied ? (
                              <div className={`p-2.5 sm:p-3 rounded-xl font-bold text-xs sm:text-sm border shadow-xs transition-all hover:scale-105 ${
                                isToday 
                                  ? 'bg-blue-600 text-white border-blue-700 shadow-blue-500/20' 
                                  : sessionType === 'evening'
                                    ? 'bg-purple-50 text-purple-800 border-purple-100'
                                    : sessionType === 'afternoon'
                                      ? 'bg-sky-50 text-sky-800 border-sky-100'
                                      : 'bg-blue-50 text-blue-800 border-blue-100'
                              }`}>
                                {subject}
                              </div>
                            ) : (
                              <span className="text-gray-300 font-bold">—</span>
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

export default StudentSchedule;
