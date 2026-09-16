import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const TeacherContext = createContext(undefined);

export const TeacherProvider = ({ children }) => {
  const [teacherInfo, setTeacherInfo] = useState(null);
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [isHomeroomTeacher, setIsHomeroomTeacher] = useState(false);
  const [homeroomClass, setHomeroomClass] = useState(null);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Khởi tạo viewMode từ localStorage nếu có, mặc định là SUBJECT
  const [viewMode, setViewModeState] = useState(() => {
    const saved = localStorage.getItem('teacher_portal_view_mode');
    return (saved === 'HOMEROOM' || saved === 'SUBJECT') ? saved : 'SUBJECT';
  });

  const setViewMode = (mode) => {
    setViewModeState(mode);
    localStorage.setItem('teacher_portal_view_mode', mode);
  };

  const fetchProfileContext = async () => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    // Chỉ fetch khi user đã đăng nhập và là giáo viên hoặc admin
    if (!token || (userRole !== 'teacher' && userRole !== 'admin')) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.get('/teacher/profile-context');
      if (response.data?.success) {
        const data = response.data.data;
        setTeacherInfo(data.teacherInfo);
        setAcademicYear(data.academicYear || '2025-2026');
        setIsHomeroomTeacher(Boolean(data.isHomeroomTeacher));
        setHomeroomClass(data.homeroomClass || null);
        setAssignedClasses(data.assignedClasses || []);

        // Nếu giáo viên không chủ nhiệm lớp nào mà đang ở mode HOMEROOM -> reset về SUBJECT
        if (!data.isHomeroomTeacher && viewMode === 'HOMEROOM') {
          setViewMode('SUBJECT');
        }
      }
    } catch (err) {
      // Có thể user không phải giáo viên hoặc lỗi mạng, giữ im lặng
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

export const useTeacherContext = () => {
  const context = useContext(TeacherContext);
  if (!context) {
    // Fallback object nếu component render ngoài TeacherProvider
    return {
      teacherInfo: null,
      academicYear: '2025-2026',
      isHomeroomTeacher: false,
      homeroomClass: null,
      assignedClasses: [],
      viewMode: 'SUBJECT',
      setViewMode: () => {},
      isLoading: false,
      refreshContext: async () => {}
    };
  }
  return context;
};
