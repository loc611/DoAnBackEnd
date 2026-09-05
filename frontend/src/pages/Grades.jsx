import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Save, Edit, Lock, Unlock, CheckCircle2, AlertCircle, FileSpreadsheet, Sparkles, TrendingUp } from 'lucide-react';
import api from '../services/api';
import Swal from 'sweetalert2';

const SEMESTERS = [
  { id: 'HK1_2026', name: 'Học kỳ 1 (2025 - 2026)' },
  { id: 'HK2_2026', name: 'Học kỳ 2 (2025 - 2026)' },
  { id: 'CN_2026', name: 'Cả năm (2025 - 2026)' }
];

const SUBJECT_KEYS = [
  { key: 'math', label: 'Toán' },
  { key: 'literature', label: 'Ngữ văn' },
  { key: 'english', label: 'Tiếng Anh' },
  { key: 'physics', label: 'Vật lý' },
  { key: 'chemistry', label: 'Hóa học' },
  { key: 'it', label: 'Tin học' }
];

const Grades = () => {
  const [grades, setGrades] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('HK1_2026');
  const [boardStatus, setBoardStatus] = useState('draft'); // 'draft' | 'locked'
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const userRole = localStorage.getItem('userRole') || 'student';
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  useEffect(() => {
    if (userRole !== 'student') {
      const fetchClasses = async () => {
        try {
          const res = await api.get('/classes');
          setClasses(res.data || []);
          if (res.data && res.data.length > 0) {
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
    
    const fetchGrades = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/grades/class/${selectedClass}?semester=${selectedSemester}`);
        const responseData = res.data;
        const studentList = Array.isArray(responseData) 
          ? responseData 
          : (responseData?.students || []);
        const overallStatus = Array.isArray(responseData)
          ? (responseData.some(item => item.status === 'locked') ? 'locked' : 'draft')
          : (responseData?.status || 'draft');
        
        let hasLocked = overallStatus === 'locked';
        const formatted = studentList.map(item => {
          if (item.status === 'locked') hasLocked = true;
          return {
            id: item.id,
            studentId: item.studentId,
            studentCode: item.studentCode || item.id,
            name: item.name,
            class: classes.find(c => c.id === selectedClass)?.className || 'Lớp học',
            status: item.status || 'draft',
            math: item.scores?.math ?? 0,
            literature: item.scores?.literature ?? 0,
            english: item.scores?.english ?? 0,
            it: item.scores?.it ?? 0,
            physics: item.scores?.physics ?? 0,
            chemistry: item.scores?.chemistry ?? 0,
          };
        });

        setBoardStatus(hasLocked ? 'locked' : 'draft');
        setGrades(formatted);
        setIsEditing(!hasLocked);
      } catch (error) {
        console.error("Failed to fetch grades", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, [selectedClass, selectedSemester, classes]);

  const processedGrades = useMemo(() => {
    let filteredList = grades;
    if (userRole === 'student') {
      filteredList = grades.filter(s => s.id === userData.studentCode || s.studentId === userData.id);
    } else {
      if (searchTerm) {
        filteredList = grades.filter(s => 
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          s.studentCode.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
    }

    return filteredList.map(student => {
      const sum = student.math + student.literature + student.english + student.it + student.physics + student.chemistry;
      const avg = sum / 6;
      return {
        ...student,
        average: avg.toFixed(2),
        rank: avg >= 8.0 ? 'Giỏi' : avg >= 6.5 ? 'Khá' : avg >= 5.0 ? 'Trung bình' : 'Yếu'
      };
    });
  }, [grades, searchTerm, userRole, userData]);

  const stats = useMemo(() => {
    if (processedGrades.length === 0) return { count: 0, avg: '0.00', gioikha: 0 };
    const count = processedGrades.length;
    const sumAvg = processedGrades.reduce((acc, cur) => acc + parseFloat(cur.average || 0), 0);
    const avg = (sumAvg / count).toFixed(2);
    const gioikha = processedGrades.filter(s => s.rank === 'Giỏi' || s.rank === 'Khá').length;
    const percentGK = ((gioikha / count) * 100).toFixed(0);
    return { count, avg, percentGK };
  }, [processedGrades]);

  const handleGradeChange = (studentId, field, value) => {
    let numVal = parseFloat(value);
    if (isNaN(numVal)) numVal = 0;
    if (numVal > 10) numVal = 10;
    if (numVal < 0) numVal = 0;

    setGrades(prev => prev.map(s => s.studentId === studentId ? { ...s, [field]: numVal } : s));
  };

  const handleSaveGrades = async (targetStatus) => {
    try {
      setSaving(true);
      const payload = grades.map(g => ({
        studentId: g.studentId,
        status: targetStatus,
        scores: {
          math: g.math,
          literature: g.literature,
          english: g.english,
          physics: g.physics,
          chemistry: g.chemistry,
          it: g.it
        }
      }));

      await api.put(`/grades/class/${selectedClass}`, {
        semester: selectedSemester,
        status: targetStatus,
        grades: payload
      });

      setBoardStatus(targetStatus);
      setIsEditing(targetStatus === 'draft');

      if (targetStatus === 'locked') {
        Swal.fire({
          title: 'Đã Khóa & Công Bố!',
          text: 'Bảng điểm đã được niêm phong chính thức. Học sinh và phụ huynh đã có thể xem điểm trên hệ thống.',
          icon: 'success'
        });
      } else {
        Swal.fire('Thành công', 'Đã lưu bản nháp thành công. Điểm chưa công bố cho học sinh.', 'success');
      }
    } catch (error) {
      console.error('Failed to save grades', error);
      Swal.fire('Lỗi', error.response?.data?.message || 'Không thể lưu bảng điểm', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlockBoard = async () => {
    const result = await Swal.fire({
      title: 'Mở khóa bảng điểm để sửa?',
      text: 'Bảng điểm sẽ chuyển về trạng thái Lưu Nháp (Draft) để cho phép giáo viên điều chỉnh điểm số.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonText: 'Hủy',
      confirmButtonText: 'Mở khóa ngay'
    });

    if (result.isConfirmed) {
      handleSaveGrades('draft');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Sổ Điểm & Đánh Giá</h2>
            {boardStatus === 'locked' ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 shadow-sm">
                <Lock size={13} /> Đã Khóa & Công Bố
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300 shadow-sm">
                <Edit size={13} /> Bản Nháp (Đang Nhập Điểm)
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">Quy trình 2 bước: Giáo viên nhập & lưu nháp → Khóa bảng điểm và công bố toàn trường</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {userRole !== 'student' && (
            <>
              {boardStatus === 'locked' ? (
                <button
                  onClick={handleUnlockBoard}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Unlock size={16} /> Mở khóa Chỉnh sửa
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleSaveGrades('draft')}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save size={16} /> Lưu Nháp
                  </button>
                  <button
                    onClick={() => handleSaveGrades('locked')}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={16} /> Khóa & Công Bố Điểm
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Class Statistics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Sĩ số bảng điểm</p>
            <p className="text-xl font-extrabold text-slate-800">{stats.count} Học sinh</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Sparkles size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Điểm TB Toàn Lớp</p>
            <p className="text-xl font-extrabold text-slate-800">{stats.avg} / 10</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tỷ lệ Đạt Giỏi - Khá</p>
            <p className="text-xl font-extrabold text-slate-800">{stats.percentGK}%</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm mã HS, họ tên..."
              className="pl-10 pr-4 py-2.5 w-full border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={userRole === 'student'}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {userRole !== 'student' && (
              <select 
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 outline-none text-sm bg-white font-semibold"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>Lớp {c.className} (Khối {c.grade})</option>
                ))}
              </select>
            )}

            <select
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 outline-none text-sm bg-white font-semibold"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
            >
              {SEMESTERS.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500 font-medium">Đang tải bảng điểm...</div>
          ) : (
            <table className="w-full text-center text-sm text-slate-600 whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-4 text-left">Mã HS</th>
                  <th className="px-4 py-4 text-left min-w-[170px]">Họ và tên</th>
                  <th className="px-4 py-4">Toán</th>
                  <th className="px-4 py-4">Văn</th>
                  <th className="px-4 py-4">Anh</th>
                  <th className="px-4 py-4">Lý</th>
                  <th className="px-4 py-4">Hóa</th>
                  <th className="px-4 py-4">Tin</th>
                  <th className="px-4 py-4 bg-indigo-50/70 text-indigo-900 font-extrabold">Điểm TB</th>
                  <th className="px-4 py-4">Xếp loại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedGrades.map((student) => (
                  <tr key={student.id} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="px-4 py-4 font-mono font-bold text-indigo-700 text-left">{student.studentCode}</td>
                    <td className="px-4 py-4 font-bold text-slate-900 text-left">{student.name}</td>
                    
                    {/* Grade Inputs */}
                    {SUBJECT_KEYS.map(({ key }) => (
                      <td key={key} className="px-2 py-3">
                        {isEditing && userRole !== 'student' ? (
                          <input 
                            type="number" 
                            min="0" max="10" step="0.1"
                            className="w-14 px-2 py-1.5 text-center font-bold text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white text-sm"
                            value={student[key]}
                            onChange={(e) => handleGradeChange(student.studentId, key, e.target.value)}
                          />
                        ) : (
                          <span className={`font-bold ${student[key] < 5 ? 'text-rose-500' : 'text-slate-700'}`}>
                            {student[key]}
                          </span>
                        )}
                      </td>
                    ))}
                    
                    <td className="px-4 py-4 font-black text-indigo-700 bg-indigo-50/40 text-base">
                      {student.average}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        student.rank === 'Giỏi' ? 'bg-emerald-100 text-emerald-800' :
                        student.rank === 'Khá' ? 'bg-blue-100 text-blue-800' :
                        student.rank === 'Trung bình' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {student.rank}
                      </span>
                    </td>
                  </tr>
                ))}
                {processedGrades.length === 0 && (
                  <tr>
                    <td colSpan="10" className="px-4 py-12 text-slate-400 text-center font-medium">Không có dữ liệu điểm cho lớp này</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Grades;
