import { useState, useMemo, useEffect } from 'react';
import { 
  Search, Filter, Save, Edit, Lock, Unlock, CheckCircle2, AlertCircle, 
  FileSpreadsheet, Sparkles, TrendingUp, Download, Printer, FileText, 
  BookOpen, Award, Check, X, ShieldAlert 
} from 'lucide-react';
import api from '../services/api';
import Swal from 'sweetalert2';
import StudentGradeReportCardModal from '../components/StudentGradeReportCardModal';

const SEMESTERS = [
  { id: 'HK1_2026', name: 'Học kỳ 1 (2025 - 2026)' },
  { id: 'HK2_2026', name: 'Học kỳ 2 (2025 - 2026)' },
  { id: 'CN_2026', name: 'Cả năm (2025 - 2026)' }
];

// Helper tính toán ĐTBmhk chuẩn Thông tư 22/2021/TT-BGDĐT
const computeAverageScoreTT22 = (tx1, tx2, tx3, tx4, gk, ck, assessmentType, feedbackResult) => {
  if (assessmentType === 'feedback') {
    return { avg: null, isComplete: feedbackResult === 'Đ' || feedbackResult === 'CĐ' };
  }

  const txList = [tx1, tx2, tx3, tx4]
    .map(val => (val !== '' && val !== null && val !== undefined ? parseFloat(val) : null))
    .filter(val => val !== null && !isNaN(val) && val >= 0 && val <= 10);

  const numGk = (gk !== '' && gk !== null && gk !== undefined) ? parseFloat(gk) : null;
  const numCk = (ck !== '' && ck !== null && ck !== undefined) ? parseFloat(ck) : null;

  const hasGk = numGk !== null && !isNaN(numGk) && numGk >= 0 && numGk <= 10;
  const hasCk = numCk !== null && !isNaN(numCk) && numCk >= 0 && numCk <= 10;

  if (txList.length === 0 && !hasGk && !hasCk) {
    return { avg: null, isComplete: false };
  }

  const totalPoints = txList.reduce((acc, cur) => acc + cur, 0) + (hasGk ? numGk * 2 : 0) + (hasCk ? numCk * 3 : 0);
  const totalCoefficients = txList.length + (hasGk ? 2 : 0) + (hasCk ? 3 : 0);

  if (totalCoefficients === 0) return { avg: null, isComplete: false };

  const raw = totalPoints / totalCoefficients;
  const rounded = Math.round(raw * 10) / 10;
  return { 
    avg: rounded.toFixed(1), 
    isComplete: txList.length > 0 && hasGk && hasCk 
  };
};

const Grades = () => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('HK1_2026');
  
  const [students, setStudents] = useState([]);
  const [boardStatus, setBoardStatus] = useState('draft'); // 'draft' | 'submitted' | 'locked'
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [isReportCardOpen, setIsReportCardOpen] = useState(false);
  const [selectedReportStudent, setSelectedReportStudent] = useState(null);
  
  const userRole = localStorage.getItem('userRole') || 'student';
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  // 1. Tải danh mục Lớp và Môn học
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [classRes, subRes] = await Promise.all([
          api.get('/classes'),
          api.get('/subjects')
        ]);
        
        const classList = classRes.data || [];
        const subjectList = subRes.data || [];

        setClasses(classList);
        setSubjects(subjectList);

        if (classList.length > 0 && !selectedClass) {
          setSelectedClass(classList[0].id);
        }
        if (subjectList.length > 0 && !selectedSubject) {
          setSelectedSubject(subjectList[0].id);
        }
      } catch (error) {
        console.error("Lỗi tải danh mục lớp/môn", error);
      }
    };
    fetchMetadata();
  }, []);

  // 2. Tải bảng điểm môn học chi tiết theo Thông tư 22
  useEffect(() => {
    if (!selectedClass || !selectedSubject) return;
    
    const fetchSubjectGrades = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/grades/subject/${selectedClass}?subjectId=${selectedSubject}&semester=${selectedSemester}`);
        if (res.data?.success) {
          const list = res.data.students || [];
          setStudents(list);
          const currentStatus = res.data.gradebookStatus || 'draft';
          setBoardStatus(currentStatus);
          setIsEditing(currentStatus === 'draft');
        }
      } catch (error) {
        console.error("Lỗi tải bảng điểm môn", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjectGrades();
  }, [selectedClass, selectedSubject, selectedSemester]);

  // Tìm thông tin môn học đang chọn
  const activeSubject = useMemo(() => {
    return subjects.find(s => s.id === selectedSubject) || null;
  }, [subjects, selectedSubject]);

  const isFeedbackSubject = useMemo(() => {
    if (!activeSubject) return false;
    const name = activeSubject.name?.toLowerCase() || '';
    return name.includes('thể chất') || name.includes('trải nghiệm') || name.includes('nghệ thuật') || activeSubject.type === 'Nhận xét';
  }, [activeSubject]);

  // Xử lý thay đổi điểm cho 1 ô
  const handleScoreChange = (studentId, field, value) => {
    setStudents(prev => prev.map(st => {
      if (st.studentId !== studentId) return st;

      let sanitizedValue = value;
      if (field !== 'feedbackResult' && field !== 'teacherRemark') {
        if (value === '') {
          sanitizedValue = null;
        } else {
          let num = parseFloat(value);
          if (isNaN(num)) num = 0;
          if (num > 10) num = 10;
          if (num < 0) num = 0;
          sanitizedValue = num;
        }
      }

      const updated = { ...st, [field]: sanitizedValue };
      
      // Tự động tính lại ĐTBmhk theo thời gian thực
      const calculated = computeAverageScoreTT22(
        updated.tx1, updated.tx2, updated.tx3, updated.tx4,
        updated.gk, updated.ck,
        isFeedbackSubject ? 'feedback' : 'score',
        updated.feedbackResult
      );

      updated.avgScore = calculated.avg;
      return updated;
    }));
  };

  // Lọc học sinh theo từ khóa
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const term = searchTerm.toLowerCase();
    return students.filter(s => 
      s.fullName.toLowerCase().includes(term) || 
      s.studentCode.toLowerCase().includes(term)
    );
  }, [students, searchTerm]);

  // Thống kê nhanh theo Thông tư 22
  const stats = useMemo(() => {
    if (students.length === 0) return { total: 0, completedCount: 0, avgClass: '0.0', passCount: 0 };
    const total = students.length;

    if (isFeedbackSubject) {
      const passCount = students.filter(s => s.feedbackResult === 'Đ').length;
      return { total, completedCount: students.filter(s => s.feedbackResult).length, passCount, percentPass: ((passCount / total) * 100).toFixed(0) };
    }

    const scoredList = students.filter(s => s.avgScore !== null && !isNaN(s.avgScore)).map(s => parseFloat(s.avgScore));
    const completedCount = scoredList.length;
    const sum = scoredList.reduce((acc, cur) => acc + cur, 0);
    const avgClass = completedCount > 0 ? (sum / completedCount).toFixed(1) : '0.0';
    const gioikha = scoredList.filter(score => score >= 6.5).length;
    const percentGioiKha = completedCount > 0 ? ((gioikha / completedCount) * 100).toFixed(0) : 0;

    return { total, completedCount, avgClass, gioikha, percentGioiKha };
  }, [students, isFeedbackSubject]);

  // Lưu bảng điểm
  const handleSaveGrades = async (targetStatus) => {
    try {
      setSaving(true);
      const payload = students.map(s => ({
        studentId: s.studentId,
        assessmentType: isFeedbackSubject ? 'feedback' : 'score',
        tx1: s.tx1,
        tx2: s.tx2,
        tx3: s.tx3,
        tx4: s.tx4,
        gk: s.gk,
        ck: s.ck,
        feedbackResult: s.feedbackResult,
        teacherRemark: s.teacherRemark
      }));

      const res = await api.put(`/grades/subject/${selectedClass}`, {
        subjectId: selectedSubject,
        semester: selectedSemester,
        status: targetStatus,
        grades: payload
      });

      if (res.data?.success) {
        setBoardStatus(targetStatus);
        setIsEditing(targetStatus === 'draft');

        if (targetStatus === 'locked') {
          Swal.fire('Đã Niêm Phong!', 'Sổ điểm môn học đã được khóa và công bố chính thức theo Thông tư 22.', 'success');
        } else if (targetStatus === 'submitted') {
          Swal.fire('Đã Nộp!', 'Bảng điểm đã được nộp cho Tổ trưởng chuyên môn / Ban Giám Hiệu kiểm duyệt.', 'info');
        } else {
          Swal.fire('Thành công', 'Đã lưu nháp bảng điểm thành công.', 'success');
        }
      }
    } catch (error) {
      console.error('Lỗi khi lưu điểm:', error);
      Swal.fire('Lỗi', error.response?.data?.message || 'Không thể lưu bảng điểm', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Mở khóa bảng điểm
  const handleUnlockBoard = async () => {
    const { value: reason } = await Swal.fire({
      title: 'Mở khóa sổ điểm môn học?',
      text: 'Sổ điểm sẽ chuyển về trạng thái Lưu Nháp để giáo viên điều chỉnh. Thao tác này bắt buộc có lý do và sẽ ghi nhận vào Audit Log.',
      input: 'textarea',
      inputLabel: 'Lý do mở khóa (Bắt buộc):',
      inputPlaceholder: 'Nhập lý do (VD: Phúc khảo điểm thi, đính chính sai sót nhập liệu...)',
      inputValidator: (val) => {
        if (!val || val.trim().length < 5) {
          return 'Vui lòng nhập lý do tối thiểu 5 ký tự!';
        }
      },
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      confirmButtonText: 'Xác nhận mở khóa'
    });

    if (reason) {
      try {
        setSaving(true);
        const res = await api.put(`/grades/subject/${selectedClass}/unlock`, {
          subjectId: selectedSubject,
          semester: selectedSemester,
          reason: reason.trim()
        });

        if (res.data?.success) {
          setBoardStatus('draft');
          setIsEditing(true);
          Swal.fire('Đã mở khóa!', 'Sổ điểm đã được mở khóa để giáo viên chỉnh sửa.', 'success');
        }
      } catch (error) {
        Swal.fire('Lỗi', error.response?.data?.message || 'Không thể mở khóa sổ điểm', 'error');
      } finally {
        setSaving(false);
      }
    }
  };

  // Xuất file CSV / Excel chuẩn Thông tư 22
  const handleExportCSV = () => {
    if (students.length === 0) return;
    const currentClassObj = classes.find(c => c.id === selectedClass);
    const className = currentClassObj?.className || 'Lop';
    const subName = activeSubject?.name || 'Mon';

    let csvContent = `STT,Mã Học Sinh,Họ và Tên,Lớp,Môn Học,ĐĐGtx1,ĐĐGtx2,ĐĐGtx3,ĐĐGtx4,ĐĐGgk,ĐĐGck,ĐTB Môn,Đánh Giá Nhận Xét,Trạng Thái\n`;
    students.forEach((s, idx) => {
      const evalText = isFeedbackSubject ? (s.feedbackResult || 'Chưa đánh giá') : (s.avgScore || '-');
      csvContent += `"${idx + 1}","${s.studentCode}","${s.fullName}","${className}","${subName}","${s.tx1 ?? ''}","${s.tx2 ?? ''}","${s.tx3 ?? ''}","${s.tx4 ?? ''}","${s.gk ?? ''}","${s.ck ?? ''}","${evalText}","${s.teacherRemark || ''}","${boardStatus}"\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BangDiem_TT22_${className}_${subName}_${selectedSemester}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isManagement = userRole === 'admin' || userRole === 'principal' || userData?.position?.includes('Trưởng khoa') || userData?.position?.includes('Ban giám hiệu');

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header & Tiêu chuẩn Thông tư 22 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-full border border-blue-400/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Chuẩn Thông tư 22/2021/TT-BGDĐT
            </span>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 ${
              boardStatus === 'locked' 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : (boardStatus === 'submitted' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-500/20 text-slate-300 border border-slate-500/30')
            }`}>
              {boardStatus === 'locked' ? <Lock className="w-3.5 h-3.5" /> : (boardStatus === 'submitted' ? <AlertCircle className="w-3.5 h-3.5" /> : <Edit className="w-3.5 h-3.5" />)}
              {boardStatus === 'locked' ? 'Đã niêm phong công bố' : (boardStatus === 'submitted' ? 'Đã nộp chờ duyệt' : 'Bản nháp')}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sổ Điểm Bộ Môn Điện Tử</h1>
          <p className="text-slate-300 text-sm mt-1">
            Đánh giá thường xuyên (ĐĐGtx) & Đánh giá định kỳ (ĐĐGgk, ĐĐGck) theo quy chế THPT
          </p>
        </div>

        {/* Nút hành động */}
        <div className="flex flex-wrap items-center gap-2">
          {boardStatus === 'locked' ? (
            isManagement && (
              <button
                onClick={handleUnlockBoard}
                disabled={saving}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-xl flex items-center gap-2 shadow-lg transition-all"
              >
                <Unlock className="w-4 h-4" /> Mở khóa đặc cách
              </button>
            )
          ) : (
            <>
              <button
                onClick={() => handleSaveGrades('draft')}
                disabled={saving || !isEditing}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl flex items-center gap-2 border border-white/20 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Lưu nháp
              </button>
              <button
                onClick={() => handleSaveGrades('submitted')}
                disabled={saving || !isEditing}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> Nộp bảng điểm
              </button>
              {isManagement && (
                <button
                  onClick={() => handleSaveGrades('locked')}
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl flex items-center gap-2 shadow-lg transition-all"
                >
                  <Lock className="w-4 h-4" /> Khóa & Công bố
                </button>
              )}
            </>
          )}

          <button
            onClick={handleExportCSV}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all"
            title="Xuất CSV chuẩn TT22"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Thanh bộ lọc: Học kỳ + Môn học + Lớp học */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Học kỳ & Niên khóa</label>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {SEMESTERS.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Môn học giảng dạy</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.subjectCode}) - {s.type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Lớp học phân công</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.className} (Khối {c.grade})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Tìm kiếm học sinh</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tên hoặc mã HS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Thẻ tóm tắt chỉ số */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Sĩ số lớp</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{stats.total} học sinh</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">Đã hoàn thành điểm</p>
          <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.completedCount} / {stats.total}</p>
        </div>
        {!isFeedbackSubject ? (
          <>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">Điểm TB môn cả lớp</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.avgClass} / 10</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">Tỷ lệ Khá - Giỏi (&ge; 6.5)</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.percentGioiKha}%</p>
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 col-span-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">Tỷ lệ Đạt (Đ)</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.passCount} ({stats.percentPass}%)</p>
          </div>
        )}
      </div>

      {/* Bảng điểm chi tiết Thông tư 22 */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Đang nạp bảng điểm Thông tư 22...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-center w-12" rowSpan={2}>STT</th>
                  <th className="px-4 py-3 w-28" rowSpan={2}>Mã HS</th>
                  <th className="px-4 py-3 min-w-[180px]" rowSpan={2}>Họ và Tên</th>
                  {!isFeedbackSubject ? (
                    <>
                      <th className="px-4 py-2 text-center border-b border-slate-200 dark:border-slate-700" colSpan={4}>
                        ĐĐG Thường xuyên (Hệ số 1)
                      </th>
                      <th className="px-4 py-2 text-center border-b border-slate-200 dark:border-slate-700 w-24">
                        ĐĐG Giữa kỳ (x2)
                      </th>
                      <th className="px-4 py-2 text-center border-b border-slate-200 dark:border-slate-700 w-24">
                        ĐĐG Cuối kỳ (x3)
                      </th>
                      <th className="px-4 py-3 text-center w-28 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400" rowSpan={2}>
                        ĐTB Môn HK
                      </th>
                    </>
                  ) : (
                    <th className="px-4 py-3 text-center w-36" rowSpan={2}>Đánh giá nhận xét</th>
                  )}
                  <th className="px-4 py-3 min-w-[200px]" rowSpan={2}>Nhận xét của GV</th>
                  <th className="px-4 py-3 text-center w-20" rowSpan={2}>Chi tiết</th>
                </tr>
                {!isFeedbackSubject && (
                  <tr>
                    <th className="px-2 py-1.5 text-center text-slate-500 w-16">TX 1</th>
                    <th className="px-2 py-1.5 text-center text-slate-500 w-16">TX 2</th>
                    <th className="px-2 py-1.5 text-center text-slate-500 w-16">TX 3</th>
                    <th className="px-2 py-1.5 text-center text-slate-500 w-16">TX 4</th>
                    <th className="px-2 py-1.5 text-center text-slate-500 w-24">Giữa kỳ</th>
                    <th className="px-2 py-1.5 text-center text-slate-500 w-24">Cuối kỳ</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-500">
                      Không tìm thấy học sinh nào trong lớp học này.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st, idx) => (
                    <tr key={st.studentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">{st.studentCode}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{st.fullName}</td>

                      {!isFeedbackSubject ? (
                        <>
                          {/* Điểm TX1-4 */}
                          {['tx1', 'tx2', 'tx3', 'tx4'].map((colKey) => (
                            <td key={colKey} className="px-2 py-2 text-center">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                disabled={!isEditing}
                                value={st[colKey] ?? ''}
                                onChange={(e) => handleScoreChange(st.studentId, colKey, e.target.value)}
                                className={`w-14 text-center py-1 text-xs font-semibold rounded-lg border transition-all ${
                                  !isEditing 
                                    ? 'bg-transparent border-transparent text-slate-700 dark:text-slate-300' 
                                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white'
                                }`}
                              />
                            </td>
                          ))}

                          {/* Giữa kỳ */}
                          <td className="px-2 py-2 text-center">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="10"
                              disabled={!isEditing}
                              value={st.gk ?? ''}
                              onChange={(e) => handleScoreChange(st.studentId, 'gk', e.target.value)}
                              className={`w-16 text-center py-1 text-xs font-bold rounded-lg border transition-all ${
                                !isEditing 
                                  ? 'bg-transparent border-transparent text-indigo-700 dark:text-indigo-300' 
                                  : 'bg-indigo-50/30 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-500 text-indigo-900 dark:text-indigo-200'
                              }`}
                            />
                          </td>

                          {/* Cuối kỳ */}
                          <td className="px-2 py-2 text-center">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="10"
                              disabled={!isEditing}
                              value={st.ck ?? ''}
                              onChange={(e) => handleScoreChange(st.studentId, 'ck', e.target.value)}
                              className={`w-16 text-center py-1 text-xs font-bold rounded-lg border transition-all ${
                                !isEditing 
                                  ? 'bg-transparent border-transparent text-purple-700 dark:text-purple-300' 
                                  : 'bg-purple-50/30 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700 focus:ring-2 focus:ring-purple-500 text-purple-900 dark:text-purple-200'
                              }`}
                            />
                          </td>

                          {/* Điểm TB Môn HK (Tính tự động theo TT22) */}
                          <td className="px-4 py-3 text-center bg-blue-50/30 dark:bg-blue-950/10">
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                              st.avgScore === null 
                                ? 'text-slate-400' 
                                : parseFloat(st.avgScore) >= 8.0 
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                  : parseFloat(st.avgScore) >= 6.5
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                    : parseFloat(st.avgScore) >= 5.0
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                            }`}>
                              {st.avgScore !== null ? st.avgScore : '-'}
                            </span>
                          </td>
                        </>
                      ) : (
                        /* Môn Đánh giá nhận xét (Thể dục, HĐTN) */
                        <td className="px-4 py-3 text-center">
                          <select
                            disabled={!isEditing}
                            value={st.feedbackResult || ''}
                            onChange={(e) => handleScoreChange(st.studentId, 'feedbackResult', e.target.value)}
                            className="px-3 py-1 text-xs font-bold rounded-lg border bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
                          >
                            <option value="">Chưa đánh giá</option>
                            <option value="Đ">Đạt (Đ)</option>
                            <option value="CĐ">Chưa đạt (CĐ)</option>
                          </select>
                        </td>
                      )}

                      {/* Nhận xét giáo viên */}
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          disabled={!isEditing}
                          value={st.teacherRemark || ''}
                          placeholder="Nhận xét chuyên môn..."
                          onChange={(e) => handleScoreChange(st.studentId, 'teacherRemark', e.target.value)}
                          className="w-full text-xs px-2 py-1 rounded border bg-transparent border-transparent focus:border-slate-300 dark:focus:border-slate-700 outline-none text-slate-700 dark:text-slate-300"
                        />
                      </td>

                      {/* Nút xem phiếu điểm cá nhân */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedReportStudent({ ...st, id: st.studentCode, class: classes.find(c => c.id === selectedClass)?.className });
                            setIsReportCardOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Xem phiếu điểm cá nhân"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Phiếu điểm học sinh */}
      {isReportCardOpen && (
        <StudentGradeReportCardModal
          isOpen={isReportCardOpen}
          onClose={() => setIsReportCardOpen(false)}
          student={selectedReportStudent}
          semester={selectedSemester}
          semesterName={SEMESTERS.find(s => s.id === selectedSemester)?.name || selectedSemester}
        />
      )}
    </div>
  );
};

export default Grades;
