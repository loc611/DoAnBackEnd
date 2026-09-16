// docs/teacher-portal/RoleSwitcher.tsx
// Nút chuyển chế độ xem nhanh giữa "Góc nhìn Bộ môn" và "Lớp Chủ nhiệm"

import React from 'react';
import { useTeacherContext } from './TeacherContext';
import { BookOpen, Users } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const { isHomeroomTeacher, homeroomClass, viewMode, setViewMode, assignedClasses } = useTeacherContext();

  // TH 1: Giáo viên không làm chủ nhiệm lớp nào
  if (!isHomeroomTeacher) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
        <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="font-medium truncate">GV Bộ môn ({assignedClasses.length} lớp)</span>
      </div>
    );
  }

  // TH 2: Giáo viên kiêm cả 2 vai trò -> Hiển thị Switcher linh hoạt
  return (
    <div className="bg-slate-900/60 p-1 rounded-xl flex items-center border border-slate-700/60 shadow-inner">
      {/* Nút Góc nhìn Bộ môn */}
      <button
        type="button"
        onClick={() => setViewMode('SUBJECT')}
        className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
          viewMode === 'SUBJECT'
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 scale-[1.02]'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0" />
        <span>Bộ môn</span>
        <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-bold">
          {assignedClasses.length}
        </span>
      </button>

      {/* Nút Góc nhìn Chủ nhiệm */}
      <button
        type="button"
        onClick={() => setViewMode('HOMEROOM')}
        className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
          viewMode === 'HOMEROOM'
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/20 scale-[1.02]'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
      >
        <Users className="w-3.5 h-3.5 shrink-0" />
        <span>Chủ nhiệm</span>
        {homeroomClass && (
          <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-bold">
            {homeroomClass.className}
          </span>
        )}
      </button>
    </div>
  );
};
