import React, { useState, useMemo } from 'react';
import { 
  Users, 
  BookOpenCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Filter, 
  CalendarPlus,
  X,
  ChevronRight,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Data
const MOCK_TEACHERS = [
  { id: 'T01', name: 'Nguyễn Văn A', subject: 'Toán học', quota: 15, assigned: 15, avatar: 'A' },
  { id: 'T02', name: 'Trần Thị B', subject: 'Vật lý', quota: 15, assigned: 12, avatar: 'B' },
  { id: 'T03', name: 'Lê Văn C', subject: 'Hóa học', quota: 15, assigned: 18, avatar: 'C' },
  { id: 'T04', name: 'Phạm Thị D', subject: 'Sinh học', quota: 15, assigned: 0, avatar: 'D' },
  { id: 'T05', name: 'Hoàng Văn E', subject: 'Toán học', quota: 15, assigned: 10, avatar: 'E' },
];

const MOCK_UNASSIGNED_CLASSES = [
  { id: 'C01', className: '10A1', subject: 'Toán học', periods: 4, grade: '10' },
  { id: 'C02', className: '10A2', subject: 'Vật lý', periods: 3, grade: '10' },
  { id: 'C03', className: '11B1', subject: 'Hóa học', periods: 3, grade: '11' },
  { id: 'C04', className: '12C1', subject: 'Sinh học', periods: 4, grade: '12' },
  { id: 'C05', className: '12C2', subject: 'Toán học', periods: 4, grade: '12' },
];

const SUBJECTS = ['Tất cả', 'Toán học', 'Vật lý', 'Hóa học', 'Sinh học'];
const GRADES = ['Tất cả', '10', '11', '12'];

const TeachingAssignment = () => {
  const [teachers, setTeachers] = useState(MOCK_TEACHERS);
  const [unassignedClasses, setUnassignedClasses] = useState(MOCK_UNASSIGNED_CLASSES);
  
  // Filters
  const [searchTeacher, setSearchTeacher] = useState('');
  const [filterSubject, setFilterSubject] = useState('Tất cả');
  const [filterGrade, setFilterGrade] = useState('Tất cả');

  // Modal State
  const [selectedClass, setSelectedClass] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Derived Stats
  const totalTeachers = teachers.length;
  const totalPeriodsMissing = unassignedClasses.reduce((acc, curr) => acc + curr.periods, 0);
  const fullyAssignedCount = teachers.filter(t => t.assigned >= t.quota).length;
  const overQuotaCount = teachers.filter(t => t.assigned > t.quota).length;

  // Filtered Data
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchName = t.name.toLowerCase().includes(searchTeacher.toLowerCase());
      const matchSubject = filterSubject === 'Tất cả' || t.subject === filterSubject;
      return matchName && matchSubject;
    });
  }, [teachers, searchTeacher, filterSubject]);

  const filteredClasses = useMemo(() => {
    return unassignedClasses.filter(c => {
      const matchGrade = filterGrade === 'Tất cả' || c.grade === filterGrade;
      const matchSubject = filterSubject === 'Tất cả' || c.subject === filterSubject;
      return matchGrade && matchSubject;
    });
  }, [unassignedClasses, filterGrade, filterSubject]);

  const handleOpenAssignModal = (cls) => {
    setSelectedClass(cls);
    setIsModalOpen(true);
  };

  const handleAssignTeacher = (teacherId) => {
    if (!selectedClass) return;

    // Update Teacher Assigned Periods
    setTeachers(prev => prev.map(t => {
      if (t.id === teacherId) {
        return { ...t, assigned: t.assigned + selectedClass.periods };
      }
      return t;
    }));

    // Remove Class from Unassigned
    setUnassignedClasses(prev => prev.filter(c => c.id !== selectedClass.id));
    
    // Close Modal
    setIsModalOpen(false);
    setSelectedClass(null);
  };

  const getProgressColor = (assigned, quota) => {
    const ratio = assigned / quota;
    if (ratio > 1) return 'bg-rose-500';
    if (ratio >= 0.8) return 'bg-amber-400';
    return 'bg-emerald-500';
  };

  const getTextColor = (assigned, quota) => {
    const ratio = assigned / quota;
    if (ratio > 1) return 'text-rose-600 dark:text-rose-400';
    if (ratio >= 0.8) return 'text-amber-600 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header & Stats */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Phân công Giảng dạy
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quản lý định mức và thời khóa biểu cho giáo viên trong Khoa
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tổng Giáo viên</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalTeachers}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Đủ định mức</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{fullyAssignedCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Vượt tải</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{overQuotaCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <BookOpenCheck size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tiết chưa phân</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalPeriodsMissing}</p>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm giáo viên..." 
            value={searchTeacher}
            onChange={(e) => setSearchTeacher(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-sm text-slate-700 dark:text-slate-200"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select 
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/50"
            >
              {SUBJECTS.map(sub => (
                <option key={sub} value={sub}>{sub === 'Tất cả' ? 'Môn học (Tất cả)' : sub}</option>
              ))}
            </select>
          </div>
          <select 
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/50"
          >
            {GRADES.map(g => (
              <option key={g} value={g}>{g === 'Tất cả' ? 'Khối (Tất cả)' : `Khối ${g}`}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Left Column: Teachers List */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800 overflow-hidden flex flex-col h-[600px]">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Danh sách Giáo viên</h2>
            <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold">
              {filteredTeachers.length} GV
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {filteredTeachers.length > 0 ? filteredTeachers.map(teacher => (
              <div key={teacher.id} className="p-3 mb-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {teacher.avatar}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{teacher.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{teacher.subject}</p>
                  </div>
                  <div className={`text-xs font-bold px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 ${getTextColor(teacher.assigned, teacher.quota)}`}>
                    {teacher.assigned} / {teacher.quota} tiết
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="relative w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((teacher.assigned / teacher.quota) * 100, 100)}%` }}
                    transition={{ duration: 0.5 }}
                    className={`absolute top-0 left-0 h-full ${getProgressColor(teacher.assigned, teacher.quota)}`}
                  />
                </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                <Users size={32} className="opacity-20" />
                <p className="text-sm">Không tìm thấy giáo viên nào</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Unassigned Classes List */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800 overflow-hidden flex flex-col h-[600px]">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Lớp chưa phân công</h2>
            <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
              {filteredClasses.length} Lớp
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
            {filteredClasses.length > 0 ? filteredClasses.map(cls => (
              <div key={cls.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Lớp</span>
                    <span className="text-sm font-black text-blue-600 dark:text-blue-400 leading-none">{cls.className}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{cls.subject}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-700/50 px-2 py-0.5 rounded-md">
                        <Clock size={12} /> {cls.periods} tiết/tuần
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleOpenAssignModal(cls)}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white dark:bg-blue-900/30 dark:hover:bg-blue-600 dark:text-blue-400 dark:hover:text-white transition-all shadow-sm group"
                  title="Phân công ngay"
                >
                  <CalendarPlus size={16} className="group-hover:scale-110 transition-transform" />
                </button>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                <CheckCircle2 size={36} className="text-emerald-500 opacity-50" />
                <p className="text-sm font-medium">Tất cả các lớp đã được phân công</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Assign Modal */}
      <AnimatePresence>
        {isModalOpen && selectedClass && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-50 border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <CalendarPlus size={20} className="text-blue-500" />
                  Phân công Lớp {selectedClass.className}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:text-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-6">
                <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Bạn đang phân công môn <strong className="text-blue-700 dark:text-blue-400">{selectedClass.subject}</strong> cho lớp <strong className="text-blue-700 dark:text-blue-400">{selectedClass.className}</strong>. Khối lượng: <strong className="text-blue-700 dark:text-blue-400">{selectedClass.periods} tiết/tuần</strong>.
                  </p>
                </div>

                <p className="text-xs font-bold text-slate-400 uppercase mb-3 px-1">Chọn giáo viên phù hợp</p>
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                  {teachers.filter(t => t.subject === selectedClass.subject).map(teacher => {
                    const isOverloaded = (teacher.assigned + selectedClass.periods) > teacher.quota;
                    return (
                      <button
                        key={teacher.id}
                        onClick={() => handleAssignTeacher(teacher.id)}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-sm text-slate-600 dark:text-slate-300">
                            {teacher.avatar}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400">{teacher.name}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Đã phân: {teacher.assigned}/{teacher.quota} tiết
                            </p>
                          </div>
                        </div>
                        {isOverloaded ? (
                          <span className="text-[10px] font-bold px-2 py-1 rounded bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
                            Sẽ vượt tải
                          </span>
                        ) : (
                          <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500" />
                        )}
                      </button>
                    );
                  })}
                  {teachers.filter(t => t.subject === selectedClass.subject).length === 0 && (
                    <div className="text-center py-4 text-slate-500 text-sm">
                      Không có giáo viên bộ môn {selectedClass.subject} nào.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};

export default TeachingAssignment;
