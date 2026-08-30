import { useState, useEffect, useMemo } from 'react';
import { 
  CalendarDays, 
  Clock, 
  MapPin, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Printer, 
  Search, 
  Timer,
  FileSpreadsheet,
  Award
} from 'lucide-react';
import api from '../services/api';

const StudentExamSchedule = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const fetchMyExams = async () => {
      setLoading(true);
      try {
        const res = await api.get('/exams/my-exams');
        setData(res.data);
      } catch (err) {
        console.error('Lỗi tải lịch thi cá nhân:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyExams();
  }, []);

  const exams = data?.exams || [];

  // Filtered exams
  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const matchType = filterType === 'all' || exam.examType === filterType;
      const matchSearch = !searchTerm || 
        exam.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.room.toLowerCase().includes(searchTerm.toLowerCase());
      return matchType && matchSearch;
    });
  }, [exams, filterType, searchTerm]);

  // Find nearest upcoming exam
  const nearestExam = useMemo(() => {
    const now = new Date();
    const futureExams = exams
      .map(e => {
        const [hh, mm] = (e.startTime || '00:00').split(':').map(Number);
        const examDate = new Date(e.examDate);
        examDate.setHours(hh, mm, 0, 0);
        return { ...e, fullDateTime: examDate };
      })
      .filter(e => e.fullDateTime > now)
      .sort((a, b) => a.fullDateTime - b.fullDateTime);

    return futureExams.length > 0 ? futureExams[0] : null;
  }, [exams]);

  // Countdown timer effect
  useEffect(() => {
    if (!nearestExam) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(nearestExam.fullDateTime).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [nearestExam]);

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-600/15 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold backdrop-blur-md mb-2.5">
            <Award size={14} />
            <span>Kỳ Thi THPT Quốc Gia & Khảo Sát Học Kỳ</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Tra Cứu Lịch Thi Cá Nhân
          </h1>
          <p className="text-blue-100 text-sm mt-1 max-w-xl">
            {data?.student 
              ? `${data.student.fullName} • Lớp: ${data.student.className} • Khối: ${data.student.grade}` 
              : 'Xem chi tiết môn thi, thời gian, số báo danh và phòng thi'}
          </p>
        </div>

        <button 
          onClick={() => window.print()}
          className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 self-start md:self-auto"
        >
          <Printer size={16} />
          <span>In Phiếu Báo Thi</span>
        </button>
      </div>

      {/* Countdown Card to Next Exam */}
      {nearestExam ? (
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 text-white rounded-2xl p-6 shadow-xl border border-indigo-500/20 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
                <Timer size={14} className="animate-spin text-amber-400" />
                MÔN THI TIẾP THEO
              </div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <span>{nearestExam.subjectName}</span>
                <span className="text-sm font-normal text-slate-300">({nearestExam.examName})</span>
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <Clock size={14} />
                  <span>
                    {new Date(nearestExam.examDate).toLocaleDateString('vi-VN')} lúc {nearestExam.startTime} ({nearestExam.duration} phút)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-blue-300">
                  <MapPin size={14} />
                  <span>{nearestExam.room}</span>
                </div>
                <div className="px-2 py-0.5 rounded bg-indigo-800/60 font-semibold text-indigo-200">
                  Hình thức: {nearestExam.examFormat}
                </div>
              </div>
            </div>

            {/* Countdown Digits */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-center min-w-[64px]">
                <div className="text-2xl font-black text-white">{timeLeft.days}</div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Ngày</div>
              </div>
              <span className="text-xl font-bold text-slate-500">:</span>
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-center min-w-[64px]">
                <div className="text-2xl font-black text-amber-400">{timeLeft.hours}</div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Giờ</div>
              </div>
              <span className="text-xl font-bold text-slate-500">:</span>
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-center min-w-[64px]">
                <div className="text-2xl font-black text-indigo-400">{timeLeft.minutes}</div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Phút</div>
              </div>
              <span className="text-xl font-bold text-slate-500">:</span>
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-center min-w-[64px]">
                <div className="text-2xl font-black text-emerald-400">{timeLeft.seconds}</div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Giây</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-xs border border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-1">
            Đợt thi:
          </span>
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'Giữa kỳ', label: 'Giữa kỳ' },
            { key: 'Cuối kỳ', label: 'Cuối kỳ' },
            { key: 'Khảo sát', label: 'Khảo sát' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === tab.key
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Tìm theo môn, phòng thi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Exam Schedule Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
            <p className="text-sm font-semibold text-slate-500">Đang tải lịch thi cá nhân...</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileSpreadsheet size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-600">Hiện chưa có lịch thi nào được công bố</p>
            <p className="text-xs text-slate-400 mt-1">Nhà trường sẽ cập nhật lịch thi sớm nhất trên hệ thống</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">STT</th>
                  <th className="py-3.5 px-4">Môn Thi & Kỳ Thi</th>
                  <th className="py-3.5 px-4">Ngày Thi</th>
                  <th className="py-3.5 px-4">Giờ Thi</th>
                  <th className="py-3.5 px-4">Thời Lượng</th>
                  <th className="py-3.5 px-4">Phòng Thi</th>
                  <th className="py-3.5 px-4">Hình Thức</th>
                  <th className="py-3.5 px-4">Lưu Ý / Dặn Dò</th>
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
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {examDateFormatted}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-blue-600">
                        {exam.startTime}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 text-xs">
                        {exam.duration} phút
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
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
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {exam.notes ? (
                          <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded font-medium">
                            {exam.notes}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic">Không có ghi chú</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentExamSchedule;
