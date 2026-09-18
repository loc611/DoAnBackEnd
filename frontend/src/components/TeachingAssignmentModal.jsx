import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Check, AlertTriangle, BookOpen, Layers, Users, 
  Calendar, Save, Sparkles, Filter, CheckCircle2, ChevronRight,
  TrendingUp, AlertCircle, RefreshCw, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import Swal from 'sweetalert2';

const TeachingAssignmentModal = ({ isOpen, onClose, initialTeacherId = null, onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('matrix'); // 'matrix' hoặc 'teacher'
  
  // Filters
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [semester, setSemester] = useState('HK1');
  const [gradeFilter, setGradeFilter] = useState('10'); // 'all', '10', '11', '12'
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedTeacherId, setSelectedTeacherId] = useState(initialTeacherId || '');

  // Matrix Raw Data from Server
  const [matrixData, setMatrixData] = useState({
    classes: [],
    subjects: [],
    departments: [],
    teachers: [],
    assignments: []
  });

  // Local mutable assignments map: key = `${classId}_${subjectId}` -> { teacherId, periodsPerWeek, note }
  const [assignmentMap, setAssignmentMap] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchMatrix();
      if (initialTeacherId) {
        setSelectedTeacherId(initialTeacherId);
      }
    }
  }, [isOpen, academicYear, semester]);

  const fetchMatrix = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/teaching-assignments/matrix`, {
        params: {
          academicYear,
          semester,
          grade: gradeFilter === 'all' ? undefined : gradeFilter
        }
      });
      const data = res.data?.data || {};
      setMatrixData(data);

      // Build local map
      const map = {};
      (data.assignments || []).forEach(a => {
        map[`${a.classId}_${a.subjectId}`] = {
          teacherId: a.teacherId || '',
          periodsPerWeek: a.periodsPerWeek || 2,
          note: a.note || ''
        };
      });
      setAssignmentMap(map);
    } catch (err) {
      console.error('Lỗi khi tải ma trận phân công:', err);
      Swal.fire('Lỗi', err.response?.data?.message || 'Không thể tải dữ liệu phân công', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when grade filter changes
  useEffect(() => {
    if (isOpen && !loading) {
      fetchMatrix();
    }
  }, [gradeFilter]);

  // Handle cell change
  const handleCellChange = (classId, subjectId, teacherId, periodsPerWeek = 2) => {
    setAssignmentMap(prev => ({
      ...prev,
      [`${classId}_${subjectId}`]: {
        teacherId: teacherId || '',
        periodsPerWeek,
        note: prev[`${classId}_${subjectId}`]?.note || ''
      }
    }));
  };

  // Dynamic calculation of teacher workload from current assignmentMap
  const dynamicTeacherStats = useMemo(() => {
    const workload = {};
    (matrixData.teachers || []).forEach(t => {
      workload[t.id] = 0;
    });

    Object.entries(assignmentMap).forEach(([key, val]) => {
      if (val.teacherId && workload[val.teacherId] !== undefined) {
        workload[val.teacherId] += (parseInt(val.periodsPerWeek, 10) || 2);
      }
    });

    return (matrixData.teachers || []).map(t => {
      const assigned = workload[t.id] || 0;
      const actualQuota = Math.max(0, (t.baseQuotas || 17) - (t.quotaReduction || 0));
      const delta = assigned - actualQuota;
      let status = 'normal';
      if (assigned < actualQuota) status = 'under_quota';
      else if (assigned > actualQuota) status = 'over_quota';

      return {
        ...t,
        assigned,
        actualQuota,
        delta,
        status
      };
    });
  }, [matrixData.teachers, assignmentMap]);

  // Filtered teachers by department
  const filteredTeachers = useMemo(() => {
    if (departmentFilter === 'all') return dynamicTeacherStats;
    return dynamicTeacherStats.filter(t => t.departmentId === departmentFilter);
  }, [dynamicTeacherStats, departmentFilter]);

  // Filtered subjects by department
  const filteredSubjects = useMemo(() => {
    if (departmentFilter === 'all') return matrixData.subjects || [];
    return (matrixData.subjects || []).filter(s => s.departmentId === departmentFilter);
  }, [matrixData.subjects, departmentFilter]);

  // Save Batch Assignments
  const handleSave = async () => {
    try {
      setSaving(true);
      const assignmentsList = [];
      Object.entries(assignmentMap).forEach(([key, val]) => {
        const [classId, subjectId] = key.split('_');
        assignmentsList.push({
          classId,
          subjectId,
          teacherId: val.teacherId,
          periodsPerWeek: val.periodsPerWeek,
          note: val.note
        });
      });

      await api.post('/teaching-assignments/batch', {
        academicYear,
        semester,
        assignments: assignmentsList
      });

      Swal.fire({
        title: 'Đã lưu phân công!',
        text: `Đã lưu thành công ${assignmentsList.length} vị trí phân công giảng dạy cho ${semester} - Năm học ${academicYear}.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Lỗi khi lưu phân công:', err);
      Swal.fire('Lỗi', err.response?.data?.message || 'Không thể lưu phân công giảng dạy', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Auto assign helper (matching teacher specialization)
  const handleAutoSuggest = () => {
    const newMap = { ...assignmentMap };
    let count = 0;

    matrixData.classes.forEach(cls => {
      filteredSubjects.forEach(sub => {
        const key = `${cls.id}_${sub.id}`;
        // If not assigned yet
        if (!newMap[key]?.teacherId) {
          // Find teacher with matching specialization who is not over quota
          const candidate = dynamicTeacherStats.find(t => 
            t.specialization?.toLowerCase().includes(sub.name.toLowerCase()) && 
            t.assigned < t.actualQuota
          ) || dynamicTeacherStats.find(t => 
            t.specialization?.toLowerCase().includes(sub.name.toLowerCase())
          );

          if (candidate) {
            newMap[key] = {
              teacherId: candidate.id,
              periodsPerWeek: sub.periodsPerWeek || 2,
              note: 'Đề xuất tự động theo chuyên môn'
            };
            count++;
          }
        }
      });
    });

    setAssignmentMap(newMap);
    Swal.fire('Hoàn tất đề xuất', `Đã tự động gán phù hợp chuyên môn cho ${count} vị trí còn trống.`, 'info');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-7xl max-h-[96vh] flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <BookOpen size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                Động cơ Phân công Giảng dạy THPT
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-extrabold">
                  {academicYear} • {semester}
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Ma trận kiểm soát định mức 17 tiết/tuần &amp; phân công môn học theo khối lớp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="bg-slate-200/70 p-1 rounded-2xl flex items-center text-xs font-bold">
              <button
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  viewMode === 'matrix' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ma trận Lớp × Môn
              </button>
              <button
                onClick={() => setViewMode('teacher')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  viewMode === 'teacher' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chi tiết theo Giáo viên
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Khối lớp */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-500">Khối:</span>
              <select 
                value={gradeFilter} 
                onChange={e => setGradeFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">Tất cả khối (10, 11, 12)</option>
                <option value="10">Khối 10</option>
                <option value="11">Khối 11</option>
                <option value="12">Khối 12</option>
              </select>
            </div>

            {/* Tổ chuyên môn */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-500">Tổ:</span>
              <select 
                value={departmentFilter} 
                onChange={e => setDepartmentFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">Tất cả Tổ chuyên môn</option>
                {(matrixData.departments || []).map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Học kỳ */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-500">Kỳ:</span>
              <select 
                value={semester} 
                onChange={e => setSemester(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="HK1">Học kỳ 1</option>
                <option value="HK2">Học kỳ 2</option>
                <option value="All">Cả năm học</option>
              </select>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoSuggest}
              className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold flex items-center gap-1.5 border border-purple-200 transition-all cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Gợi ý theo chuyên môn</span>
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>{saving ? 'Đang lưu...' : 'Lưu phân công'}</span>
            </button>
          </div>
        </div>

        {/* Real-time Workload KPI Bar */}
        <div className="px-6 py-2.5 bg-slate-900 text-white flex flex-col gap-2 shadow-inner">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold tracking-wide uppercase flex items-center gap-1.5 text-indigo-400">
              <TrendingUp size={14} /> Thước đo định mức Giáo viên (Chuẩn 17 tiết THPT trừ kiêm nhiệm)
            </span>
            <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Đạt chuẩn</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Vượt định mức (tính thù lao)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> Thiếu tiết</span>
            </div>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin">
            {filteredTeachers.map(t => {
              let badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
              let icon = <Check size={11} className="text-emerald-400" />;
              let label = `Đạt (${t.assigned}/${t.actualQuota}t)`;

              if (t.status === 'over_quota') {
                badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                icon = <AlertTriangle size={11} className="text-amber-400" />;
                label = `+${t.delta}t vượt (${t.assigned}/${t.actualQuota}t)`;
              } else if (t.status === 'under_quota') {
                badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
                icon = <AlertCircle size={11} className="text-blue-400" />;
                label = `${t.delta}t thiếu (${t.assigned}/${t.actualQuota}t)`;
              }

              return (
                <div 
                  key={t.id}
                  onClick={() => {
                    setSelectedTeacherId(t.id);
                    setViewMode('teacher');
                  }}
                  className={`shrink-0 px-2.5 py-1 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:scale-102 transition-transform ${badgeColor}`}
                  title={`${t.fullName} (${t.specialization}) - Giảm trừ: ${t.quotaReduction}t do ${t.reductionReason || 'kiêm nhiệm'}`}
                >
                  {icon}
                  <span className="font-bold">{t.fullName.split(' ').slice(-2).join(' ')}:</span>
                  <span className="font-mono font-bold text-[11px]">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-medium">Đang khởi tạo ma trận phân công...</p>
            </div>
          ) : viewMode === 'matrix' ? (
            /* ========================================================================= */
            /* 1. MATRIX VIEW: Lớp (Hàng) x Môn (Cột)                                     */
            /* ========================================================================= */
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto max-h-[58vh]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-20 shadow-xs">
                    <tr>
                      <th className="p-3 border-b border-r border-slate-200 min-w-[140px] bg-slate-100 sticky left-0 z-30">
                        Lớp học &amp; Sĩ số
                      </th>
                      {filteredSubjects.map(sub => (
                        <th key={sub.id} className="p-3 border-b border-r border-slate-200 min-w-[180px] text-center">
                          <div className="font-black text-slate-800 text-xs">{sub.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {sub.periodsPerWeek} tiết/tuần • {sub.type}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {matrixData.classes.length === 0 ? (
                      <tr>
                        <td colSpan={filteredSubjects.length + 1} className="p-8 text-center text-slate-400 font-medium">
                          Không có lớp học nào phù hợp với bộ lọc khối.
                        </td>
                      </tr>
                    ) : matrixData.classes.map(cls => (
                      <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Cột Tên Lớp & GVCN cố định bên trái */}
                        <td className="p-3 border-r border-slate-200 font-bold bg-white sticky left-0 z-10 shadow-xs">
                          <div className="font-extrabold text-slate-900 text-sm">{cls.className}</div>
                          <div className="text-[11px] text-indigo-600 font-medium flex items-center gap-1 mt-0.5">
                            <UserCheck size={12} />
                            CN: {cls.homeroomTeacher?.fullName || 'Chưa gán'}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {cls._count?.students || 0} học sinh
                          </div>
                        </td>

                        {/* Các ô Dropdown chọn Giáo viên theo Môn */}
                        {filteredSubjects.map(sub => {
                          const cellKey = `${cls.id}_${sub.id}`;
                          const cellValue = assignmentMap[cellKey]?.teacherId || '';
                          const currentTeacher = dynamicTeacherStats.find(t => t.id === cellValue);

                          // Check if teacher specialization matches subject
                          const isMatchSpec = currentTeacher 
                            ? currentTeacher.specialization?.toLowerCase().includes(sub.name.toLowerCase()) 
                            : true;

                          return (
                            <td key={sub.id} className="p-2 border-r border-slate-200 align-top">
                              <div className="flex flex-col gap-1">
                                <select
                                  value={cellValue}
                                  onChange={e => handleCellChange(cls.id, sub.id, e.target.value, sub.periodsPerWeek)}
                                  className={`w-full py-1.5 px-2 rounded-xl text-xs font-semibold outline-none border transition-all cursor-pointer ${
                                    cellValue 
                                      ? isMatchSpec 
                                        ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950 focus:border-indigo-500' 
                                        : 'bg-amber-50 border-amber-300 text-amber-950 focus:border-amber-500'
                                      : 'bg-white border-dashed border-slate-300 text-slate-400 hover:border-slate-400'
                                  }`}
                                >
                                  <option value="">-- Chưa phân công --</option>
                                  {dynamicTeacherStats.map(t => (
                                    <option key={t.id} value={t.id}>
                                      {t.fullName} ({t.specialization || 'GV'}) [{t.assigned}/{t.actualQuota}t]
                                    </option>
                                  ))}
                                </select>

                                {/* Badges in cell */}
                                {currentTeacher && (
                                  <div className="flex items-center justify-between text-[10px] px-1 font-medium">
                                    <span className={isMatchSpec ? 'text-indigo-600' : 'text-amber-700 flex items-center gap-0.5 font-bold'}>
                                      {!isMatchSpec && <AlertTriangle size={10} />}
                                      {isMatchSpec ? 'Đúng môn' : 'Khác chuyên môn'}
                                    </span>
                                    <span className="font-mono text-slate-500">
                                      {sub.periodsPerWeek} tiết
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* 2. TEACHER CENTRIC VIEW: Chọn GV -> Phân công danh sách lớp              */
            /* ========================================================================= */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Danh sách giáo viên bên trái */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 max-h-[60vh] overflow-y-auto space-y-2">
                <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-3">
                  Chọn Giáo viên ({filteredTeachers.length})
                </div>
                {filteredTeachers.map(t => {
                  const isSelected = t.id === selectedTeacherId;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTeacherId(t.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25' 
                          : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm">{t.fullName}</div>
                        <div className={`text-xs mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                          {t.specialization || 'Bộ môn'} • {t.position || 'GVBM'}
                        </div>
                      </div>
                      <div className="text-right font-mono text-xs font-black">
                        <div>{t.assigned} / {t.actualQuota} tiết</div>
                        <div className={`text-[10px] font-bold ${
                          t.status === 'over_quota' 
                            ? isSelected ? 'text-amber-200' : 'text-amber-600' 
                            : t.status === 'under_quota' 
                              ? isSelected ? 'text-blue-200' : 'text-blue-500' 
                              : isSelected ? 'text-emerald-200' : 'text-emerald-600'
                        }`}>
                          {t.status === 'over_quota' ? `+${t.delta}t vượt` : t.status === 'under_quota' ? `${t.delta}t thiếu` : 'Đạt chuẩn'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Danh sách phân công của giáo viên đang chọn bên phải */}
              <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
                {selectedTeacherId ? (() => {
                  const currentT = dynamicTeacherStats.find(t => t.id === selectedTeacherId);
                  if (!currentT) return null;

                  // Lọc các phân công của GV này trong assignmentMap
                  const assignedItems = [];
                  Object.entries(assignmentMap).forEach(([key, val]) => {
                    if (val.teacherId === selectedTeacherId) {
                      const [classId, subjectId] = key.split('_');
                      const cls = matrixData.classes.find(c => c.id === classId);
                      const sub = matrixData.subjects.find(s => s.id === subjectId);
                      if (cls && sub) {
                        assignedItems.push({
                          classId,
                          subjectId,
                          className: cls.className,
                          subjectName: sub.name,
                          periodsPerWeek: val.periodsPerWeek,
                          key
                        });
                      }
                    }
                  });

                  return (
                    <div className="space-y-4">
                      {/* Teacher Header Banner */}
                      <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-black text-indigo-950">{currentT.fullName}</h4>
                          <p className="text-xs text-indigo-700 font-medium">
                            {currentT.department?.name || 'Tổ chuyên môn'} • {currentT.specialization}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-indigo-900 font-mono">
                            {currentT.assigned} <span className="text-sm font-normal text-slate-500">/ {currentT.actualQuota} tiết</span>
                          </div>
                          <div className="text-xs text-slate-500 font-medium">
                            Định mức chuẩn 17t - Giảm trừ: {currentT.quotaReduction}t ({currentT.reductionReason || 'Kiêm nhiệm'})
                          </div>
                        </div>
                      </div>

                      {/* Danh sách lớp đã phân công */}
                      <div>
                        <h5 className="font-extrabold text-sm text-slate-800 mb-3 flex items-center justify-between">
                          <span>Các lớp được phân công ({assignedItems.length} lớp):</span>
                          <span className="text-xs font-normal text-slate-500">
                            Bấm biểu tượng thùng rác để gỡ lớp
                          </span>
                        </h5>

                        {assignedItems.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-2xl">
                            Giáo viên này chưa được phân công lớp nào trong {semester}.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {assignedItems.map(item => (
                              <div key={item.key} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                                <div>
                                  <div className="font-bold text-slate-900 text-sm">{item.className}</div>
                                  <div className="text-xs text-indigo-600 font-semibold">{item.subjectName}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-mono font-bold text-xs bg-white px-2 py-1 rounded-lg border border-slate-200">
                                    {item.periodsPerWeek} tiết/tuần
                                  </span>
                                  <button
                                    onClick={() => handleCellChange(item.classId, item.subjectId, '')}
                                    className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 cursor-pointer"
                                    title="Gỡ lớp này"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })() : (
                  <div className="flex flex-col items-center justify-center min-h-[40vh] text-slate-400">
                    <Users size={40} className="mb-2 text-slate-300" />
                    <p className="text-sm font-medium">Vui lòng chọn một giáo viên bên trái để xem chi tiết phân công</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Ghi chú:</span>
            <span>Theo Thông tư 28/2009 &amp; 15/2017 của Bộ GD&amp;ĐT: GV THPT dạy 17 tiết/tuần (GVCN giảm 4t, Tổ trưởng giảm 3t, Tổ phó giảm 1t).</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-all cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : 'Lưu bảng phân công'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TeachingAssignmentModal;
