import React from 'react';
import { useTeacherContext } from '../context/TeacherContext';
import { BookOpen, Users, Sparkles } from 'lucide-react';

export const RoleSwitcher = () => {
  const { isHomeroomTeacher, homeroomClass, viewMode, setViewMode, assignedClasses } = useTeacherContext();

  // 1. Nếu giáo viên CHỈ dạy bộ môn và không chủ nhiệm lớp nào
  if (!isHomeroomTeacher) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
        <BookOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="font-medium truncate">GV Bộ Môn ({assignedClasses?.length || 0} lớp)</span>
      </div>
    );
  }

  // 2. Nếu giáo viên ĐẢM NHẬN CẢ 2 VAI TRÒ (Bộ môn & Chủ nhiệm) -> Nút gạt chuyển chế độ
  return (
    <div className="bg-slate-900/80 dark:bg-slate-950/80 p-1 rounded-xl flex items-center border border-slate-700/60 dark:border-slate-800 shadow-inner">
      {/* Tab: Góc nhìn Bộ môn */}
      <button
        type="button"
        onClick={() => setViewMode('SUBJECT')}
        className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
          viewMode === 'SUBJECT'
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 scale-[1.02]'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
        title="Chuyển sang góc nhìn Giáo viên Bộ môn"
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0" />
        <span>Bộ môn</span>
        <span className="px-1.5 py-0.2 rounded-full bg-black/25 text-[10px] font-bold">
          {assignedClasses?.length || 0}
        </span>
      </button>

      {/* Tab: Góc nhìn Chủ nhiệm */}
      <button
        type="button"
        onClick={() => setViewMode('HOMEROOM')}
        className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
          viewMode === 'HOMEROOM'
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/30 scale-[1.02]'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
        title="Chuyển sang góc nhìn Giáo viên Chủ nhiệm"
      >
        <Users className="w-3.5 h-3.5 shrink-0" />
        <span>Chủ nhiệm</span>
        {homeroomClass?.className && (
          <span className="px-1.5 py-0.2 rounded-full bg-black/25 text-[10px] font-bold">
            {homeroomClass.className}
          </span>
        )}
      </button>
    </div>
  );
};

export default RoleSwitcher;
