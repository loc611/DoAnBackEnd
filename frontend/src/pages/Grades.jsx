import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, Filter, Save, Edit, Lock, Unlock, CheckCircle2, AlertCircle, 
  Clock, Send, ShieldAlert, X, Eye, FileText, Sparkles, TrendingUp, AlertTriangle 
} from 'lucide-react';
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
  const [boardStatus, setBoardStatus] = useState('draft'); // 'draft' | 'submitted' | 'locked'
  const [activeUnlock, setActiveUnlock] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null); // countdown in seconds
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modals
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requestDuration, setRequestDuration] = useState(120);

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [unlockRequests, setUnlockRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  
  const rawRole = localStorage.getItem('userRole') || 'student';
  const userRole = rawRole.toLowerCase();
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const isAdmin = ['admin', 'principal', 'vice_principal'].includes(userRole);
  const isTeacher = ['teacher', 'homeroom_teacher', 'guest_teacher', 'department_head'].includes(userRole);

  // Timer reference
  const timerRef = useRef(null);

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

  // Fetch grades & unlock status
  const fetchGrades = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const res = await api.get(`/grades/class/${selectedClass}?semester=${selectedSemester}`);
      const responseData = res.data;
      const studentList = Array.isArray(responseData) 
        ? responseData 
        : (responseData?.students || []);
      const overallStatus = responseData?.status || (responseData?.isLocked ? 'locked' : 'draft');
      const unlockInfo = responseData?.activeUnlock || null;

      const formatted = studentList.map(item => ({
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
      }));

      setBoardStatus(overallStatus);
      setActiveUnlock(unlockInfo);
      setGrades(formatted);

      // Editing permissions:
      // Can edit if draft, OR if active unlock window is valid, OR if admin override
      const canEdit = overallStatus === 'draft' || Boolean(unlockInfo) || isAdmin;
      setIsEditing(canEdit && userRole !== 'student');

      // Setup countdown timer if active unlock window exists
      if (unlockInfo?.expiresAt) {
        const remaining = Math.max(0, Math.floor((new Date(unlockInfo.expiresAt) - new Date()) / 1000));
        setTimeLeft(remaining);
      } else {
        setTimeLeft(null);
      }
    } catch (error) {
      console.error("Failed to fetch grades", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades();
  }, [selectedClass, selectedSemester, classes]);

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          fetchGrades(); // Reload state when window expires
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeLeft]);

  // Load unlock requests for BGH / Teachers
  const fetchUnlockRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await api.get('/grades/unlock-requests');
      setUnlockRequests(res.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch unlock requests', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUnlockRequests();
    }
  }, [isAdmin]);

  const pendingRequestsCount = useMemo(() => {
    return unlockRequests.filter(r => r.status === 'pending').length;
  }, [unlockRequests]);

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

  const handleSaveGrades = async (targetStatus, customReason) => {
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
        grades: payload,
        reason: customReason
      });

      await fetchGrades();

      if (targetStatus === 'locked') {
        Swal.fire({
          title: 'Khóa Sổ & Công Bố Thành Công!',
          text: 'Bảng điểm đã được niêm phong chính thức theo Thông tư 22/2021/TT-BGDĐT. Học sinh và phụ huynh đã có thể tra cứu.',
          icon: 'success'
        });
      } else if (targetStatus === 'submitted') {
        Swal.fire({
          title: 'Đã Nộp Bảng Điểm!',
          text: 'Bảng điểm đã chuyển sang trạng thái nộp cho Ban Giám Hiệu xét duyệt & khóa sổ.',
          icon: 'success'
        });
      } else {
        Swal.fire('Thành công', 'Đã lưu bản nháp điểm số thành công.', 'success');
      }
    } catch (error) {
      console.error('Failed to save grades', error);
      Swal.fire('Lỗi', error.response?.data?.message || 'Không thể lưu bảng điểm', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Nộp bảng điểm cho BGH
  const handleSubmitGrades = async () => {
    const result = await Swal.fire({
      title: 'Nộp Bảng Điểm Cho Ban Giám Hiệu?',
      text: 'Sau khi nộp, bảng điểm sẽ được chuyển cho Ban Giám Hiệu rà soát và khóa sổ công bố. Bạn sẽ không thể sửa điểm nếu chưa có phê duyệt mở khóa.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonText: 'Kiểm tra lại',
      confirmButtonText: 'Xác nhận Nộp'
    });

    if (result.isConfirmed) {
      handleSaveGrades('submitted');
    }
  };

  // Khóa sổ & Công bố toàn trường (Chỉ BGH)
  const handleLockPublish = async () => {
    const result = await Swal.fire({
      title: 'Khóa Sổ & Công Bố Toàn Trường?',
      text: 'Theo Thông tư 22/2021/TT-BGDĐT, thao tác này sẽ niêm phong sổ điểm và công bố điểm cho học sinh trên hệ thống. Mọi điều chỉnh sau thời điểm này đều phải qua phê duyệt mở khóa tạm thời.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonText: 'Hủy',
      confirmButtonText: 'Khóa Sổ & Công Bố Ngay'
    });

    if (result.isConfirmed) {
      handleSaveGrades('locked');
    }
  };

  // GV Gửi yêu cầu mở khóa
  const handleSendUnlockRequest = async (e) => {
    e.preventDefault();
    if (!requestReason || requestReason.trim().length < 5) {
      Swal.fire('Cảnh báo', 'Vui lòng cung cấp lý do điều chỉnh điểm cụ thể (tối thiểu 5 ký tự)', 'warning');
      return;
    }

    try {
      await api.post('/grades/unlock-requests', {
        classId: selectedClass,
        semester: selectedSemester,
        reason: requestReason.trim(),
        durationMinutes: requestDuration
      });

      setShowRequestModal(false);
      setRequestReason('');
      Swal.fire({
        title: 'Đã Gửi Đề Xuất!',
        text: 'Yêu cầu mở khóa sổ điểm đã được chuyển đến Ban Giám Hiệu. Bạn sẽ nhận được thông báo khi được phê duyệt.',
        icon: 'success'
      });
      if (isAdmin) fetchUnlockRequests();
    } catch (error) {
      console.error('Failed to create unlock request', error);
      Swal.fire('Lỗi', error.response?.data?.message || 'Không thể gửi yêu cầu', 'error');
    }
  };

  // BGH Phê duyệt mở khóa
  const handleApproveRequest = async (requestId, duration = 120) => {
    try {
      await api.put(`/grades/unlock-requests/${requestId}/approve`, {
        durationMinutes: duration,
        reason: 'BGH Phê chuẩn mở khóa tạm thời'
      });
      Swal.fire('Thành công', `Đã cấp quyền mở khóa sổ điểm trong ${duration} phút`, 'success');
      fetchUnlockRequests();
      fetchGrades();
    } catch (error) {
      Swal.fire('Lỗi', error.response?.data?.message || 'Không thể duyệt yêu cầu', 'error');
    }
  };

  // BGH Từ chối mở khóa
  const handleRejectRequest = async (requestId) => {
    const { value: reason } = await Swal.fire({
      title: 'Từ chối mở khóa sổ điểm',
      input: 'textarea',
      inputPlaceholder: 'Nhập lý do từ chối...',
      inputValidator: (value) => {
        if (!value || value.trim().length < 5) {
          return 'Vui lòng nhập lý do từ chối cụ thể!';
        }
      },
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'Xác nhận Từ chối',
      cancelButtonText: 'Hủy'
    });

    if (reason) {
      try {
        await api.put(`/grades/unlock-requests/${requestId}/reject`, {
          rejectionReason: reason
        });
        Swal.fire('Đã từ chối', 'Đã gửi thông báo từ chối tới giáo viên', 'info');
        fetchUnlockRequests();
      } catch (error) {
        Swal.fire('Lỗi', error.response?.data?.message || 'Không thể từ chối', 'error');
      }
    }
  };

  // Format time remaining MM:SS
  const formatCountdown = (secs) => {
    if (secs === null || secs <= 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Sổ Điểm Điện Tử</h2>
            
            {/* Status Badges */}
            {boardStatus === 'locked' && !activeUnlock && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 shadow-sm">
                <Lock size={13} /> Đã Khóa & Công Bố (Thông tư 22)
              </span>
            )}

            {boardStatus === 'submitted' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-300 shadow-sm">
                <Send size={13} /> Đã Nộp Cho BGH (Chờ Khóa Sổ)
              </span>
            )}

            {boardStatus === 'draft' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300 shadow-sm">
                <Edit size={13} /> Bản Nháp (Đang Nhập Điểm)
              </span>
            )}

            {activeUnlock && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300 shadow-sm animate-pulse">
                <Unlock size={13} /> Đang Mở Khóa Tạm Thời ({formatCountdown(timeLeft)})
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Quản trị học vụ chuẩn Thông tư 22/2021/TT-BGDĐT: Giáo viên nộp điểm → Ban Giám Hiệu khóa sổ & công bố kết quả
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Nút xem danh sách yêu cầu mở khóa cho BGH */}
          {isAdmin && (
            <button
              onClick={() => { fetchUnlockRequests(); setShowApprovalModal(true); }}
              className="relative px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Eye size={15} /> Quản Lý Yêu Cầu Mở Khóa
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-rose-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-bounce">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          )}

          {userRole !== 'student' && (
            <>
              {/* Khi đang trong cửa sổ mở khóa tạm */}
              {activeUnlock && (
                <button
                  onClick={() => handleSaveGrades('locked', 'Hoàn tất cập nhật và tái khóa sổ')}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock size={15} /> Lưu & Tái Khóa Sổ Điểm
                </button>
              )}

              {/* Khi sổ điểm đang KHÓA và KHÔNG có activeUnlock */}
              {boardStatus === 'locked' && !activeUnlock && (
                <>
                  {isTeacher && (
                    <button
                      onClick={() => setShowRequestModal(true)}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send size={15} /> Gửi Đơn Xin Sửa Điểm
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => handleSaveGrades('draft', 'BGH đặc cách chuyển về trạng thái nháp')}
                      disabled={saving}
                      className="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Unlock size={15} /> BGH Đặc Cách Mở Khóa
                    </button>
                  )}
                </>
              )}

              {/* Khi sổ điểm đang DRAFT */}
              {boardStatus === 'draft' && (
                <>
                  <button
                    onClick={() => handleSaveGrades('draft')}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save size={15} /> Lưu Nháp
                  </button>

                  <button
                    onClick={handleSubmitGrades}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send size={15} /> Nộp Cho BGH
                  </button>

                  {isAdmin && (
                    <button
                      onClick={handleLockPublish}
                      disabled={saving}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 size={15} /> BGH Khóa & Công Bố
                    </button>
                  )}
                </>
              )}

              {/* Khi sổ điểm đang SUBMITTED */}
              {boardStatus === 'submitted' && (
                <>
                  {isAdmin ? (
                    <>
                      <button
                        onClick={() => handleSaveGrades('draft', 'BGH trả về yêu cầu GV rà soát lại')}
                        disabled={saving}
                        className="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit size={15} /> Trả Về Cho GV Sửa
                      </button>
                      <button
                        onClick={handleLockPublish}
                        disabled={saving}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 size={15} /> BGH Phê Duyệt & Khóa Sổ
                      </button>
                    </>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500 italic px-2">
                      Đã nộp thành công. Vui lòng chờ BGH duyệt & khóa sổ.
                    </span>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Active TTL Window Banner */}
      {activeUnlock && (
        <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 border border-rose-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <Clock size={22} className="animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-rose-900 text-sm">CỬA SỔ MỞ KHÓA SỔ ĐIỂM TẠM THỜI (TTL)</h4>
                <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-mono font-black text-xs">
                  {formatCountdown(timeLeft)}
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-0.5 font-medium">
                Ban Giám Hiệu đã phê duyệt điều chỉnh. Lý do: <span className="italic font-bold">"{activeUnlock.reason}"</span>. Hệ thống sẽ tự động niêm phong lại khi đồng hồ kết thúc.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleSaveGrades('locked', 'Hoàn tất cập nhật điểm trong cửa sổ mở khóa')}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <CheckCircle2 size={14} /> Hoàn Tất & Tái Khóa Sổ
          </button>
        </div>
      )}

      {/* Class Statistics Cards */}
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

      {/* Main Table Container */}
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

      {/* Modal: Giáo viên gửi đề xuất mở khóa sửa điểm */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg">Đơn Đề Xuất Mở Khóa Sổ Điểm</h3>
                  <p className="text-xs text-slate-500 font-medium">Theo Điều 21 Thông tư 22/2021/TT-BGDĐT</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRequestModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendUnlockRequest} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Lý do giải trình điều chỉnh điểm <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Ví dụ: Nhập sai điểm bài kiểm tra 15 phút của học sinh Nguyễn Văn A; kèm bài kiểm tra giấy đã đối soát..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Thời lượng mở khóa đề xuất (Phút)
                </label>
                <select
                  value={requestDuration}
                  onChange={(e) => setRequestDuration(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value={60}>60 phút (1 giờ)</option>
                  <option value={120}>120 phút (2 giờ - Khuyến nghị)</option>
                  <option value={240}>240 phút (4 giờ)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-medium">
                ⚠️ Mọi thao tác sửa điểm trong Cửa sổ mở khóa sẽ được hệ thống ghi nhận vào <strong>Nhật ký kiểm toán (Audit Log)</strong> phục vụ công tác thanh tra học vụ.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                >
                  <Send size={14} /> Gửi Đề Xuất Lên BGH
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: BGH Phê duyệt danh sách yêu cầu mở khóa */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg">Danh Sách Yêu Cầu Mở Khóa Sổ Điểm</h3>
                  <p className="text-xs text-slate-500 font-medium">Ban Giám Hiệu xem xét và cấp quyền mở khóa tạm thời (TTL)</p>
                </div>
              </div>
              <button 
                onClick={() => setShowApprovalModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto my-4 space-y-3 flex-1 pr-1">
              {loadingRequests ? (
                <div className="p-8 text-center text-slate-400 font-medium">Đang tải danh sách...</div>
              ) : unlockRequests.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-medium">Không có yêu cầu mở khóa nào</div>
              ) : (
                unlockRequests.map((req) => (
                  <div 
                    key={req.id} 
                    className={`p-4 rounded-2xl border transition-all ${
                      req.status === 'pending' 
                        ? 'bg-amber-50/40 border-amber-200 shadow-sm' 
                        : req.status === 'approved' 
                          ? 'bg-emerald-50/30 border-emerald-200' 
                          : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">
                          Lớp {req.class?.className} ({req.semester})
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          - GV: {req.teacher?.fullName} ({req.teacher?.teacherCode})
                        </span>
                      </div>
                      <div>
                        {req.status === 'pending' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
                            Chờ xét duyệt
                          </span>
                        )}
                        {req.status === 'approved' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                            Đã phê chuẩn ({req.durationMinutes}p)
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300">
                            Đã từ chối
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 text-xs font-medium text-slate-700 bg-white/70 p-2.5 rounded-xl border border-slate-200/60">
                      <strong>Lý do giải trình:</strong> {req.reason}
                    </div>

                    {req.status === 'approved' && req.expiresAt && (
                      <div className="mt-2 text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <Clock size={12} /> Hạn mở khóa đến: {new Date(req.expiresAt).toLocaleString('vi-VN')}
                      </div>
                    )}

                    {req.status === 'rejected' && req.rejectionReason && (
                      <div className="mt-2 text-[11px] font-bold text-rose-700">
                        Lý do từ chối: {req.rejectionReason}
                      </div>
                    )}

                    {req.status === 'pending' && (
                      <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-amber-200/60">
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          className="px-3 py-1.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold"
                        >
                          Từ chối
                        </button>
                        <button
                          onClick={() => handleApproveRequest(req.id, 60)}
                          className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold"
                        >
                          Duyệt 60 phút
                        </button>
                        <button
                          onClick={() => handleApproveRequest(req.id, 120)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm"
                        >
                          Duyệt 120 phút (Chuẩn)
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end border-t border-slate-100 pt-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Grades;
