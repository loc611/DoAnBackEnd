// docs/teacher-portal/TeacherSidebar.tsx
// Component Sidebar động cho Teacher Portal (Next.js / React + Tailwind CSS)

import React from 'react';
import { useTeacherContext } from './TeacherContext';
import { RoleSwitcher } from './RoleSwitcher';
import {
  BarChart3,
  ClipboardList,
  Calendar,
  CalendarCheck2,
  Award,
  FileSpreadsheet,
  GraduationCap,
  MessageSquare,
  Layers,
  ChevronRight
} from 'lucide-react';

export interface TeacherSidebarProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export const TeacherSidebar: React.FC<TeacherSidebarProps> = ({ currentPath = '', onNavigate }) => {
  const {
    teacherInfo,
    homeroomClass,
    assignedClasses,
    viewMode,
    isHomeroomTeacher
  } = useTeacherContext();

  const handleItemClick = (path: string, e: React.MouseEvent) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(path);
    }
  };

  return (
    <aside className="w-72 h-screen bg-slate-900 border-r border-slate-800 text-slate-200 flex flex-col justify-between select-none shadow-2xl">
      {/* 1. Header & Switcher */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-500/20">
            {teacherInfo?.fullName ? teacherInfo.fullName[0] : 'GV'}
          </div>
          <div className="overflow-hidden">
            <h3 className="font-semibold text-sm text-white truncate">
              {teacherInfo?.fullName || 'Đang tải thông tin...'}
            </h3>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
              <span>{teacherInfo?.teacherCode}</span>
              {teacherInfo?.specialization && (
                <>
                  <span>•</span>
                  <span className="text-blue-400 font-medium">
                    Môn {teacherInfo.specialization}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Nút chuyển đổi góc nhìn */}
        <RoleSwitcher />
      </div>

      {/* 2. Menu Điều hướng thay đổi động theo viewMode */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* ================= GÓC NHÌN CHỦ NHIỆM ================= */}
        {viewMode === 'HOMEROOM' && homeroomClass && (
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                Lớp Chủ Nhiệm {homeroomClass.className}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {homeroomClass.totalStudents} học sinh
              </span>
            </div>

            <nav className="space-y-1">
              <a
                href={`/teacher/homeroom/${homeroomClass.classId}/dashboard`}
                onClick={(e) => handleItemClick(`/teacher/homeroom/${homeroomClass.classId}/dashboard`, e)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-purple-900/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-4 h-4 text-purple-400" />
                  <span>Tổng quan lớp {homeroomClass.className}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </a>

              <a
                href={`/teacher/homeroom/${homeroomClass.classId}/attendance`}
                onClick={(e) => handleItemClick(`/teacher/homeroom/${homeroomClass.classId}/attendance`, e)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-purple-900/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <CalendarCheck2 className="w-4 h-4 text-purple-400" />
                  <span>Điểm danh chuyên cần</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </a>

              <a
                href={`/teacher/homeroom/${homeroomClass.classId}/conduct`}
                onClick={(e) => handleItemClick(`/teacher/homeroom/${homeroomClass.classId}/conduct`, e)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-purple-900/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Award className="w-4 h-4 text-purple-400" />
                  <span>Đánh giá rèn luyện & hạnh kiểm</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </a>

              <a
                href={`/teacher/homeroom/${homeroomClass.classId}/summary`}
                onClick={(e) => handleItemClick(`/teacher/homeroom/${homeroomClass.classId}/summary`, e)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-purple-900/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-4 h-4 text-purple-400" />
                  <span>Tổng hợp học bạ & xếp loại</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </a>

              <a
                href={`/teacher/homeroom/${homeroomClass.classId}/parents`}
                onClick={(e) => handleItemClick(`/teacher/homeroom/${homeroomClass.classId}/parents`, e)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-purple-900/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  <span>Sổ liên lạc phụ huynh</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </a>
            </nav>
          </div>
        )}

        {/* ================= GÓC NHÌN BỘ MÔN ================= */}
        {viewMode === 'SUBJECT' && (
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                Phân Hệ Bộ Môn
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                {assignedClasses.length} Lớp phân công
              </span>
            </div>

            <nav className="space-y-1">
              <a
                href="/grades"
                onClick={(e) => handleItemClick('/grades', e)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-blue-900/30 transition-all"
              >
                <ClipboardList className="w-4 h-4 text-blue-400" />
                <span>Sổ nhập điểm bộ môn</span>
              </a>

              <a
                href="/schedule"
                onClick={(e) => handleItemClick('/schedule', e)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-blue-900/30 transition-all"
              >
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>Lịch giảng dạy & Thời khóa biểu</span>
              </a>

              {/* Danh sách lớp phụ trách */}
              <div className="pt-3">
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Lớp & Môn Đang Dạy
                </p>
                <div className="space-y-1">
                  {assignedClasses.map((item) => (
                    <a
                      key={item.assignmentId}
                      href={`/grades?classId=${item.classId}&subjectId=${item.subjectId}`}
                      onClick={(e) => handleItemClick(`/grades?classId=${item.classId}&subjectId=${item.subjectId}`, e)}
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-blue-400/80" />
                        <span>Lớp {item.className}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 font-medium border border-blue-500/20">
                        {item.subjectName}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>

      {/* 3. Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400">
        <div className="flex items-center justify-between">
          <span>Năm học</span>
          <span className="font-semibold text-slate-200">2025 - 2026</span>
        </div>
        {isHomeroomTeacher && homeroomClass && (
          <div className="mt-1 text-[11px] text-purple-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
            <span>Chủ nhiệm lớp {homeroomClass.className}</span>
          </div>
        )}
      </div>
    </aside>
  );
};
