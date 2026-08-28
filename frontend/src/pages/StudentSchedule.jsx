import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, BookOpen, User, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';

const StudentSchedule = () => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState('HK1_2026');

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
    { key: 'friday', label: 'Thứ Sáu', dayNum: 5 }
  ];

  const currentDayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday...

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

      {/* Grid Timetable */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="py-4 px-4 w-48 text-sm font-semibold border-r border-slate-800">
                  Tiết / Giờ học
                </th>
                {daysOfWeek.map((d) => {
                  const isToday = currentDayIndex === d.dayNum;
                  return (
                    <th
                      key={d.key}
                      className={`py-4 px-4 text-sm font-semibold border-r border-slate-800 last:border-0 ${
                        isToday ? 'bg-blue-600 text-white' : ''
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {d.label}
                        {isToday && <span className="bg-white text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">HÔM NAY</span>}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                  <td className="py-5 px-4 font-semibold text-gray-700 text-sm bg-gray-50/50 border-r border-gray-100">
                    <div className="flex items-center justify-center gap-2">
                      <Clock size={16} className="text-blue-500" />
                      {row.period}
                    </div>
                  </td>
                  {daysOfWeek.map((d) => {
                    const subject = row[d.key];
                    const isOccupied = subject && subject !== '-';
                    const isToday = currentDayIndex === d.dayNum;
                    return (
                      <td
                        key={d.key}
                        className={`py-5 px-4 border-r border-gray-100 last:border-0 ${
                          isToday ? 'bg-blue-50/20' : ''
                        }`}
                      >
                        {isOccupied ? (
                          <div className={`p-3 rounded-xl font-bold text-sm border shadow-sm transition-all hover:scale-105 ${
                            isToday 
                              ? 'bg-blue-600 text-white border-blue-700 shadow-blue-500/20' 
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentSchedule;
