// docs/teacher-portal/TeacherContext.tsx
// React Context quản lý dữ liệu vai trò giáo viên & cơ chế chuyển đổi góc nhìn

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export type ViewMode = 'SUBJECT' | 'HOMEROOM';

export interface AssignedClass {
  assignmentId: string;
  classId: string;
  className: string;
  gradeLevel: number;
  totalStudents: number;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
}

export interface HomeroomClass {
  classId: string;
  className: string;
  gradeLevel: number;
  totalStudents: number;
}

export interface TeacherInfo {
  id: string;
  fullName: string;
  teacherCode: string;
  specialization?: string;
}

export interface TeacherProfileContextType {
  teacherInfo: TeacherInfo | null;
  academicYear: string;
  isHomeroomTeacher: boolean;
  homeroomClass: HomeroomClass | null;
  assignedClasses: AssignedClass[];
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isLoading: boolean;
  refreshContext: () => Promise<void>;
}

const TeacherContext = createContext<TeacherProfileContextType | undefined>(undefined);

export const TeacherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [isHomeroomTeacher, setIsHomeroomTeacher] = useState(false);
  const [homeroomClass, setHomeroomClass] = useState<HomeroomClass | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Khởi tạo viewMode từ localStorage nếu có, mặc định là SUBJECT
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('teacher_portal_view_mode');
    return (saved === 'HOMEROOM' || saved === 'SUBJECT') ? (saved as ViewMode) : 'SUBJECT';
  });

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem('teacher_portal_view_mode', mode);
  };

  const fetchProfileContext = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('/api/teacher/profile-context', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data?.success) {
        const data = response.data.data;
        setTeacherInfo(data.teacherInfo);
        setAcademicYear(data.academicYear);
        setIsHomeroomTeacher(data.isHomeroomTeacher);
        setHomeroomClass(data.homeroomClass);
        setAssignedClasses(data.assignedClasses || []);

        // Fallback: nếu không chủ nhiệm lớp nào mà đang ở mode HOMEROOM -> reset về SUBJECT
        if (!data.isHomeroomTeacher && viewMode === 'HOMEROOM') {
          setViewMode('SUBJECT');
        }
      }
    } catch (err) {
      console.error('Error fetching teacher profile context:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileContext();
  }, []);

  return (
    <TeacherContext.Provider
      value={{
        teacherInfo,
        academicYear,
        isHomeroomTeacher,
        homeroomClass,
        assignedClasses,
        viewMode,
        setViewMode,
        isLoading,
        refreshContext: fetchProfileContext
      }}
    >
      {children}
    </TeacherContext.Provider>
  );
};

export const useTeacherContext = (): TeacherProfileContextType => {
  const context = useContext(TeacherContext);
  if (!context) {
    throw new Error('useTeacherContext must be used within a TeacherProvider');
  }
  return context;
};
