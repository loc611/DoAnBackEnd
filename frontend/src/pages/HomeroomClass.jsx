import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Phone, Mail, Award, Search, Filter, BookOpen, AlertCircle, 
  CheckCircle, ArrowRight, UserPlus, UserMinus, X, Sparkles, GraduationCap, 
  Download, Printer, FileSpreadsheet, Save, Star, ChevronDown 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import StudentGradeReportCardModal from '../components/StudentGradeReportCardModal';

const AddStudentModal = ({ isOpen, onClose, classId, onSuccess }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchEligibleStudents();
      setSelectedIds([]);
      setSearchTerm('');
    }
  }, [isOpen]);

  const fetchEligibleStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/students');
      const allStudents = res.data || [];
      const eligible = allStudents
        .filter(s => s.classId !== classId)
        .map(s => ({
          id: s.id,
          studentCode: s.studentCode,
          fullName: s.fullName,
          gender: s.gender,
          phone: s.phone,
          currentClass: s.class?.className || 'Chưa xếp lớp'
        }));
      setStudents(eligible);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (studentId) => {
    setSelectedIds(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleAdd = async () => {
    if (selectedIds.length === 0) return;
    try {
      setLoading(true);
      await api.post(`/classes/${classId}/students`, { studentIds: selectedIds });
      Swal.fire('Thành công', `Đã thêm ${selectedIds.length} học sinh vào lớp chủ nhiệm`, 'success');
      onSuccess();
      onClose();
    } catch (error) {
      Swal.fire('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra khi thêm học sinh', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.studentCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Thêm học sinh vào lớp chủ nhiệm</h3>
            <p className="text-xs text-slate-500 mt-0.5">Chọn từ danh sách học sinh chưa có lớp hoặc chuyển từ lớp khác</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search size={16} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã HS, họ tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Đang tải danh sách...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">Không tìm thấy học sinh phù hợp</div>
          ) : (
            filteredStudents.map(student => (
              <div 
                key={student.id} 
                onClick={() => handleToggleSelect(student.id)}
                className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                  selectedIds.includes(student.id) ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">{student.fullName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono font-semibold">
                      {student.studentCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Lớp hiện tại: <strong className="text-slate-600">{student.currentClass}</strong> • {student.gender || 'Nam'}
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                  selectedIds.includes(student.id) ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'
                }`}>
                  {selectedIds.includes(student.id) && <CheckCircle size={14} />}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">
            Đã chọn: <strong className="text-emerald-700">{selectedIds.length}</strong> học sinh
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-sm font-medium transition-colors">
              Hủy
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedIds.length === 0 || loading}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            >
              <UserPlus size={16} /> Xác nhận thêm ({selectedIds.length})
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const HomeroomClass = () => {
  const [loading, setLoading] = useState(true);
  const [homeroomClass, setHomeroomClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [stats, setStats] = useState({ total: 0, maleCount: 0, femaleCount: 0 });

  // Tab: 'students' (Hồ sơ lớp) | 'evaluation' (Sổ tổng hợp Thông tư 22)
  const [activeTab, setActiveTab] = useState('students');
  const [selectedSemester, setSelectedSemester] = useState('HK1_2026');

  // Dữ liệu đánh giá Thông tư 22
  const [evaluationList, setEvaluationList] = useState([]);
  const [evaluationSubjects, setEvaluationSubjects] = useState([]);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  const [savingEvaluation, setSavingEvaluation] = useState(false);

  // Modal in phiếu điểm
  const [isReportCardOpen, setIsReportCardOpen] = useState(false);
  const [classGrades, setClassGrades] = useState([]);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState(null);
  const [loadingGrades, setLoadingGrades] = useState(false);

  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  useEffect(() => {
    fetchHomeroomData();
  }, []);

  useEffect(() => {
    if (activeTab === 'evaluation' && homeroomClass) {
      fetchHomeroomEvaluation(homeroomClass.id, selectedSemester);
    }
  }, [activeTab, homeroomClass, selectedSemester]);

  const fetchHomeroomData = async () => {
    try {
      setLoading(true);
      const userRes = await api.get('/auth/me');
      const currentUser = userRes.data?.user || userData;
      const myHomeroom = currentUser.homeroomClasses && currentUser.homeroomClasses.length > 0
        ? currentUser.homeroomClasses[0]
        : null;

      if (!myHomeroom) {
        const classesRes = await api.get('/classes');
        const found = classesRes.data.find(c => c.homeroomTeacher?.userId === currentUser.id || c.homeroomTeacherId === currentUser.profileId);
        if (found) {
          setHomeroomClass(found);
          await fetchStudentsForClass(found.id);
        } else {
          setHomeroomClass(null);
          setLoading(false);
        }
        return;
      }

      setHomeroomClass(myHomeroom);
      await fetchStudentsForClass(myHomeroom.id);
    } catch (err) {
      console.error('Error loading homeroom class:', err);
      setLoading(false);
    }
  };

  const fetchStudentsForClass = async (classId) => {
    try {
      const res = await api.get(`/classes/${classId}/students`);
      const studentList = res.data || [];
      setStudents(studentList);

      const male = studentList.filter(s => s.gender === 'Nam').length;
      const female = studentList.filter(s => s.gender === 'Nữ').length;
      setStats({
        total: studentList.length,
        maleCount: male,
        femaleCount: female
      });
    } catch (err) {
      console.error('Failed to get students for homeroom class', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHomeroomEvaluation = async (classId, semester) => {
    try {
      setLoadingEvaluation(true);
      const res = await api.get(`/grades/homeroom/${classId}?semester=${semester}`);
      if (res.data?.success) {
        setEvaluationList(res.data.students || []);
        setEvaluationSubjects(res.data.subjects || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải sổ tổng hợp điểm:', err);
    } finally {
      setLoadingEvaluation(false);
    }
  };

  const handleEvaluationConductChange = (studentId, conduct) => {
    setEvaluationList(prev => prev.map(item => {
      if (item.studentId === studentId) {
        return { ...item, conductScore: conduct };
      }
      return item;
    }));
  };

  const handleEvaluationRemarkChange = (studentId, remark) => {
    setEvaluationList(prev => prev.map(item => {
      if (item.studentId === studentId) {
        return { ...item, teacherRemark: remark };
      }
      return item;
    }));
  };

  const handleSaveEvaluation = async () => {
    try {
      setSavingEvaluation(true);
      const payload = evaluationList.map(item => ({
        studentId: item.studentId,
        conductScore: item.conductScore || 'Tốt',
        teacherRemark: item.teacherRemark || ''
      }));

      const res = await api.put(`/grades/homeroom/${homeroomClass.id}`, {
        semester: selectedSemester,
        evaluations: payload
      });

      if (res.data?.success) {
        Swal.fire('Thành công', 'Đã lưu kết quả rèn luyện và xếp loại học tập học kỳ theo Thông tư 22!', 'success');
        fetchHomeroomEvaluation(homeroomClass.id, selectedSemester);
      }
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.message || 'Không thể lưu đánh giá', 'error');
    } finally {
      setSavingEvaluation(false);
    }
  };

  const handleExportStudentsList = () => {
    if (students.length === 0) {
      Swal.fire('Thông báo', 'Không có học sinh trong danh sách để xuất', 'info');
      return;
    }
    const headers = 'STT,Mã Học Sinh,Họ và Tên,Giới Tính,Số Điện Thoại,Họ Tên Phụ Huynh,SĐT Phụ Huynh,Địa Chỉ,Lớp\n';
    const rows = students.map((s, idx) => {
      return `"${idx + 1}","${s.studentCode || s.id}","${s.fullName || ''}","${s.gender || 'Nam'}","${s.phone || ''}","${s.parentName || ''}","${s.parentPhone || ''}","${s.address || ''}","${homeroomClass?.className || ''}"`;
    }).join('\n');

    const csvContent = '\uFEFF' + headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Danh_Sach_Hoc_Sinh_Lop_${homeroomClass?.className || 'CN'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [exportingMaster, setExportingMaster] = useState(false);

  const handleExportMasterGradebook = async () => {
    if (!homeroomClass) return;
    try {
      setExportingMaster(true);
      const res = await api.get(`/import-export/classes/${homeroomClass.id}/master-gradebook?semester=${selectedSemester}`);
      if (!res.data?.success || !res.data?.data) {
        throw new Error(res.data?.message || 'Không có dữ liệu sổ cái');
      }

      const report = res.data.data;
      const subjectsList = report.subjects || [];
      const studentsList = report.students || [];

      // CSV Content with UTF-8 BOM
      let csv = '\uFEFF';
      csv += `"BỘ GIÁO DỤC VÀ ĐÀO TẠO - TRƯỜNG THPT TTLN"\n`;
      csv += `"SỔ GỌI TÊN VÀ GHI ĐIỂM HỌC SINH (SỔ CÁI BỘ GD&ĐT)"\n`;
      csv += `"Lớp: ${report.classInfo?.className || ''}","Năm học: ${report.classInfo?.academicYear || ''}","Học kỳ: ${report.classInfo?.semester || ''}","GVCN: ${report.classInfo?.homeroomTeacher || userData.name || ''}"\n`;
      csv += `"Thời điểm xuất: ${new Date().toLocaleString('vi-VN')}"\n\n`;

      // Header row
      const headerCols = [
        'STT',
        'Mã Định Danh Ngành (MOET)',
        'Mã Học Sinh',
        'Họ và Tên',
        'Giới Tính',
        'Ngày Sinh',
        ...subjectsList.map(s => s.subjectName),
        'Điểm TB Môn',
        'Đánh Giá Học Lực (TT22)',
        'Kết Quả Rèn Luyện',
        'Danh Hiệu Thi Đua',
        'Trạng Thái'
      ];
      csv += headerCols.map(h => `"${h}"`).join(',') + '\n';

      // Student rows
      studentsList.forEach(st => {
        const row = [
          st.stt,
          st.moetCode || '',
          st.studentCode || '',
          st.fullName || '',
          st.gender || '',
          st.dob || '',
          ...subjectsList.map(s => st.subjectScores[s.subjectCode] ?? '--'),
          st.gpa,
          st.evaluationStatus || '',
          st.conductScore || '',
          st.academicRanking || '',
          st.passed ? 'Đủ điều kiện lên lớp' : 'Xem xét lại'
        ];
        csv += row.map(v => `"${v}"`).join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `So_Cai_Goi_Ten_Ghi_Diem_${report.classInfo?.className || 'Lop'}_${selectedSemester}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      Swal.fire({
        icon: 'success',
        title: 'Xuất Sổ Cái thành công!',
        text: `Đã kết xuất Sổ gọi tên và ghi điểm Khổ ngang A3 (chuẩn Bộ GD&ĐT) cho ${studentsList.length} học sinh.`,
        confirmButtonColor: '#059669'
      });
    } catch (err) {
      console.error('Export master gradebook error:', err);
      Swal.fire('Lỗi', err.response?.data?.message || err.message || 'Không thể kết xuất sổ cái', 'error');
    } finally {
      setExportingMaster(false);
    }
  };

  const handleExportMoetPackage = async () => {
    try {
      setExportingMaster(true);
      const res = await api.get(`/import-export/moet-sync-package?academicYear=${homeroomClass?.academicYear || '2026-2027'}&semester=${selectedSemester}`);
      if (!res.data?.success) {
        throw new Error(res.data?.message || 'Không thể lấy gói liên thông');
      }
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `Goi_Lien_Thong_MOET_${homeroomClass?.className || 'Class'}_${selectedSemester}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      Swal.fire({
        icon: 'success',
        title: 'Gói liên thông MOET sẵn sàng',
        text: 'Đã tạo tệp đồng bộ Cơ sở dữ liệu ngành (moet.gov.vn) với mã băm toàn vẹn SHA-256.',
        confirmButtonColor: '#2563eb'
      });
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.message || err.message || 'Không thể tạo gói liên thông', 'error');
    } finally {
      setExportingMaster(false);
    }
  };

  const handleRemoveStudent = async (student) => {
    const result = await Swal.fire({
      title: 'Xóa học sinh khỏi lớp?',
      text: `Bạn có chắc muốn xóa học sinh ${student.fullName} (${student.studentCode}) khỏi lớp chủ nhiệm này?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: 'Hủy',
      confirmButtonText: 'Đồng ý xóa'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/classes/${homeroomClass.id}/students/${student.id}`);
        Swal.fire('Thành công', 'Đã xóa học sinh khỏi lớp chủ nhiệm', 'success');
        fetchStudentsForClass(homeroomClass.id);
      } catch (error) {
        Swal.fire('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra khi xóa học sinh', 'error');
      }
    }
  };

  const filteredStudents = students.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.phone && s.phone.includes(searchTerm)) ||
    (s.parentPhone && s.parentPhone.includes(searchTerm))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!homeroomClass) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm border border-slate-100 mt-8">
        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Chưa được phân công Lớp Chủ Nhiệm</h2>
        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
          Tài khoản của bạn chưa được chỉ định làm Giáo viên chủ nhiệm cho lớp nào trong năm học này. Vui lòng liên hệ Ban Giám Hiệu để được phân công.
        </p>
        <Link to="/grades" className="mt-6 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-md shadow-emerald-600/20">
          Chuyển sang Sổ Nhập Điểm <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-300" />
                Lớp Chủ Nhiệm • Chuẩn Thông Tư 22
              </span>
              <span className="text-emerald-100 text-sm font-medium">Năm học: {homeroomClass.academicYear || '2026-2027'}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Lớp {homeroomClass.className}</h1>
            <p className="text-emerald-100 mt-1.5 text-sm font-medium">
              Giáo viên chủ nhiệm: <strong className="text-white font-bold">{userData.name}</strong> • Khối {homeroomClass.grade}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-white/15 p-4 rounded-2xl backdrop-blur-md border border-white/20 text-center min-w-[300px]">
            <div className="px-3 py-1">
              <p className="text-xs text-emerald-100 font-medium">Sĩ số</p>
              <p className="text-2xl font-black text-white">{stats.total}</p>
            </div>
            <div className="px-3 py-1 border-x border-white/20">
              <p className="text-xs text-emerald-100 font-medium">Nam / Nữ</p>
              <p className="text-lg font-bold text-white mt-1">{stats.maleCount} / {stats.femaleCount}</p>
            </div>
            <div className="px-3 py-1">
              <p className="text-xs text-emerald-100 font-medium">Trạng thái</p>
              <span className="inline-block text-xs font-bold bg-emerald-400/30 text-emerald-100 px-2.5 py-1 rounded-full mt-1">
                Đang học
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation: Danh sách học sinh vs Sổ tổng hợp Thông tư 22 */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('students')}
          className={`pb-3 px-5 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'students'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Users size={16} /> Danh Sách Học Sinh ({students.length})
        </button>

        <button
          onClick={() => setActiveTab('evaluation')}
          className={`pb-3 px-5 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'evaluation'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Award size={16} /> Sổ Tổng Hợp Điểm & Đánh Giá Rèn Luyện (TT 22)
        </button>
      </div>

      {/* TAB 1: DANH SÁCH HỌC SINH */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row gap-4 items-center justify-between bg-slate-50/50">
            <div className="relative w-full lg:w-80">
              <Search size={18} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo tên học sinh, mã HS, SĐT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
              <button
                onClick={handleExportStudentsList}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
              >
                <Download size={16} /> Xuất Excel Lớp
              </button>

              <button
                onClick={handleExportMasterGradebook}
                disabled={exportingMaster}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <FileSpreadsheet size={16} className="text-emerald-600" />
                {exportingMaster ? 'Đang xuất...' : 'Xuất Sổ Cái (Chuẩn Bộ GD)'}
              </button>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <UserPlus size={16} /> Thêm Học Sinh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-100 text-xs uppercase">
                <tr>
                  <th className="px-6 py-4">STT</th>
                  <th className="px-6 py-4">Mã Học Sinh</th>
                  <th className="px-6 py-4">Họ và Tên</th>
                  <th className="px-6 py-4">Giới tính</th>
                  <th className="px-6 py-4">Số điện thoại</th>
                  <th className="px-6 py-4">Phụ huynh & Liên hệ</th>
                  <th className="px-6 py-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-400">{idx + 1}</td>
                    <td className="px-6 py-4 font-bold text-emerald-700">{student.studentCode}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                          {student.fullName?.charAt(0) || 'H'}
                        </div>
                        <span>{student.fullName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        student.gender === 'Nữ' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {student.gender || 'Nam'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {student.phone || <span className="text-slate-400 italic">Chưa có</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-800">{student.parentName || 'Chưa cập nhật'}</p>
                        {student.parentPhone && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone size={12} className="text-emerald-600" /> {student.parentPhone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          to={`/students/${student.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                        >
                          Hồ sơ
                        </Link>
                        <button
                          onClick={() => handleRemoveStudent(student)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa học sinh khỏi lớp"
                        >
                          <UserMinus size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SỔ TỔNG HỢP & ĐÁNH GIÁ THÔNG TƯ 22 */}
      {activeTab === 'evaluation' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Học kỳ đánh giá:</span>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm font-semibold outline-none"
              >
                <option value="HK1_2026">Học kỳ 1 (2025 - 2026)</option>
                <option value="HK2_2026">Học kỳ 2 (2025 - 2026)</option>
                <option value="CN_2026">Cả năm (2025 - 2026)</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleExportMoetPackage}
                disabled={exportingMaster}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Download size={16} className="text-blue-600" /> Gói MOET (moet.gov.vn)
              </button>

              <button
                onClick={handleExportMasterGradebook}
                disabled={exportingMaster}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <FileSpreadsheet size={16} className="text-emerald-600" />
                {exportingMaster ? 'Đang xuất...' : 'Xuất Sổ Cái Chuẩn Bộ'}
              </button>

              <button
                onClick={handleSaveEvaluation}
                disabled={savingEvaluation}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Save size={16} /> {savingEvaluation ? 'Đang lưu...' : 'Lưu Đánh Giá GVCN'}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {loadingEvaluation ? (
              <div className="p-12 text-center text-slate-500">Đang nạp sổ điểm tổng hợp...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 uppercase border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-center w-12">STT</th>
                      <th className="px-4 py-3 w-28">Mã HS</th>
                      <th className="px-4 py-3 min-w-[160px]">Họ và Tên</th>
                      <th className="px-4 py-3 text-center w-24 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600">ĐTB Các Môn</th>
                      <th className="px-4 py-3 text-center w-36">Kết quả Rèn luyện</th>
                      <th className="px-4 py-3 text-center w-32">Kết quả Học tập</th>
                      <th className="px-4 py-3 text-center w-40">Danh hiệu Thi đua</th>
                      <th className="px-4 py-3 min-w-[200px]">Ý kiến nhận xét của GVCN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {evaluationList.map((st, idx) => (
                      <tr key={st.studentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600 dark:text-slate-300">{st.studentCode}</td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{st.fullName}</td>

                        {/* Điểm TB các môn */}
                        <td className="px-4 py-3 text-center bg-blue-50/30 dark:bg-blue-950/10 font-black text-blue-600 dark:text-blue-400">
                          {st.overallAvgScore !== null ? st.overallAvgScore : '—'}
                        </td>

                        {/* Kết quả Rèn luyện (GVCN nhập) */}
                        <td className="px-4 py-3 text-center">
                          <select
                            value={st.conductScore || 'Tốt'}
                            onChange={(e) => handleEvaluationConductChange(st.studentId, e.target.value)}
                            className="px-3 py-1 text-xs font-bold rounded-lg border bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
                          >
                            <option value="Tốt">Tốt</option>
                            <option value="Khá">Khá</option>
                            <option value="Đạt">Đạt</option>
                            <option value="Chưa đạt">Chưa đạt</option>
                          </select>
                        </td>

                        {/* Kết quả Học tập (Tự động tính theo TT22) */}
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                            st.academicRank === 'Tốt' || st.academicRank === 'Xuất sắc'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : st.academicRank === 'Khá'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                : st.academicRank === 'Đạt'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                          }`}>
                            {st.academicRank || 'Chưa đánh giá'}
                          </span>
                        </td>

                        {/* Danh hiệu Khen thưởng (TT22) */}
                        <td className="px-4 py-3 text-center">
                          {st.titleAwarded ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300">
                              <Star size={12} className="fill-amber-500 text-amber-500" /> {st.titleAwarded}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>

                        {/* Ý kiến GVCN */}
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={st.teacherRemark || ''}
                            placeholder="Nhận xét rèn luyện và nỗ lực học tập..."
                            onChange={(e) => handleEvaluationRemarkChange(st.studentId, e.target.value)}
                            className="w-full text-xs px-2 py-1 rounded border bg-transparent border-transparent focus:border-slate-300 dark:focus:border-slate-700 outline-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Thêm Học Sinh */}
      <AnimatePresence>
        {isAddModalOpen && (
          <AddStudentModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            classId={homeroomClass.id}
            onSuccess={() => fetchStudentsForClass(homeroomClass.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomeroomClass;
