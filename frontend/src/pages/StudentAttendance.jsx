import { useState, useEffect, useMemo } from 'react';
import { 
  UserCheck, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Clock3, 
  Sparkles, 
  Search, 
  Filter, 
  Award,
  CalendarDays
} from 'lucide-react';
import api from '../services/api';

const StudentAttendance = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchMyAttendance = async () => {
      setLoading(true);
      try {
        const res = await api.get('/attendance/student/me');
        setData(res.data);
      } catch (err) {
        console.error('Lỗi tải thông tin chuyên cần:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyAttendance();
  }, []);

  const historyList = useMemo(() => {
    if (!data?.history) return [];
    return data.history.filter(item => {
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchSearch = !searchTerm || item.date.includes(searchTerm) || (item.note && item.note.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [data, statusFilter, searchTerm]);

  const stats = data?.stats || {
    totalSessions: 0,
    presentCount: 0,
    lateCount: 0,
    excusedCount: 0,
    unexcusedCount: 0,
    attendanceRate: 100
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={13} />
            Có mặt
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock3 size={13} />
            Đi muộn
          </span>
        );
      case 'excused':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <AlertCircle size={13} />
            Vắng có phép
          </span>
        );
      case 'unexcused':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={13} />
            Vắng không phép
          </span>
        );
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-600/15 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold backdrop-blur-md mb-2.5">
            <Award size={14} />
            <span>Sổ Theo Dõi Chuyên Cần Cá Nhân</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Lịch Sử Điểm Danh & Chuyên Cần
          </h1>
          <p className="text-blue-100 text-sm mt-1 max-w-xl">
            {data?.student ? `${data.student.fullName} • Lớp: ${data.student.className} • Mã HS: ${data.student.studentCode}` : 'Học sinh THPT TTLN'}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex items-center gap-4 shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center font-black text-2xl">
            {stats.attendanceRate}%
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-100 uppercase tracking-wider">Tỷ Lệ Chuyên Cần</p>
            <p className="text-sm font-bold mt-0.5">
              {stats.attendanceRate >= 90 ? '🌟 Xuất sắc' : stats.attendanceRate >= 80 ? '👍 Tốt' : '⚠️ Cần cải thiện'}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Buổi Học</div>
          <div className="text-2xl font-black text-slate-800 mt-2">{stats.totalSessions}</div>
          <div className="text-[11px] text-slate-400 mt-1">Đã được ghi nhận</div>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 shadow-xs">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
            <span>Có Mặt</span>
            <CheckCircle2 size={16} />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">{stats.presentCount}</div>
          <div className="text-[11px] text-emerald-600 mt-1">Tham gia đầy đủ</div>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-100 shadow-xs">
          <div className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center justify-between">
            <span>Đi Muộn</span>
            <Clock3 size={16} />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">{stats.lateCount}</div>
          <div className="text-[11px] text-amber-600 mt-1">Đến lớp trễ giờ</div>
        </div>

        <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100 shadow-xs">
          <div className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center justify-between">
            <span>Vắng Có Phép</span>
            <AlertCircle size={16} />
          </div>
          <div className="text-2xl font-black text-blue-700 mt-2">{stats.excusedCount}</div>
          <div className="text-[11px] text-blue-600 mt-1">Được phê duyệt</div>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-100 shadow-xs">
          <div className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center justify-between">
            <span>Vắng K.Phép</span>
            <XCircle size={16} />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2">{stats.unexcusedCount}</div>
          <div className="text-[11px] text-rose-600 mt-1">Cần giải trình</div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-xs border border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-1">
            Lọc trạng thái:
          </span>
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'present', label: 'Có mặt' },
            { key: 'late', label: 'Đi muộn' },
            { key: 'excused', label: 'Có phép' },
            { key: 'unexcused', label: 'Không phép' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === tab.key
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
            placeholder="Tìm theo ngày (YYYY-MM-DD)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
            <p className="text-sm font-semibold text-slate-500">Đang tải dữ liệu điểm danh...</p>
          </div>
        ) : historyList.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <CalendarDays size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-600">Chưa có bản ghi điểm danh nào phù hợp</p>
            <p className="text-xs text-slate-400 mt-1">Dữ liệu sẽ hiển thị khi giáo viên thực hiện điểm danh</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">STT</th>
                  <th className="py-3.5 px-4">Ngày Học</th>
                  <th className="py-3.5 px-4">Buổi Học</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4">Ghi Chú & Lý Do</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyList.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-400 text-xs">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {item.date}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium text-xs">
                      {item.session}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs">
                      {item.note || <span className="text-slate-300 italic">Không có ghi chú</span>}
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

export default StudentAttendance;
