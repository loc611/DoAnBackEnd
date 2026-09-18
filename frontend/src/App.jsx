import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { TeacherProvider } from './context/TeacherContext';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';

// ============================================================================
// ⚡ LAZY LOADED ROUTE COMPONENTS (CODE-SPLITTING FOR OPTIMAL PERFORMANCE)
// ============================================================================
const Students = lazy(() => import('./pages/Students'));
const StudentProfile = lazy(() => import('./pages/StudentProfile'));
const Teachers = lazy(() => import('./pages/Teachers'));
const TeacherProfile = lazy(() => import('./pages/TeacherProfile'));
const Subjects = lazy(() => import('./pages/Subjects'));
const Classes = lazy(() => import('./pages/Classes'));
const ClassDetails = lazy(() => import('./pages/ClassDetails'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Settings = lazy(() => import('./pages/Settings'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Grades = lazy(() => import('./pages/Grades'));
const UsersManagement = lazy(() => import('./pages/UsersManagement'));
const Tuition = lazy(() => import('./pages/Tuition'));
const HomeroomClass = lazy(() => import('./pages/HomeroomClass'));
const StudentGrades = lazy(() => import('./pages/StudentGrades'));
const StudentSchedule = lazy(() => import('./pages/StudentSchedule'));
const StudentTuition = lazy(() => import('./pages/StudentTuition'));
const StudentSubjectCombination = lazy(() => import('./pages/StudentSubjectCombination'));
const Attendance = lazy(() => import('./pages/Attendance'));
const StudentAttendance = lazy(() => import('./pages/StudentAttendance'));
const ExamSchedule = lazy(() => import('./pages/ExamSchedule'));
const StudentExamSchedule = lazy(() => import('./pages/StudentExamSchedule'));
const Profile = lazy(() => import('./pages/Profile'));
const LessonLogbook = lazy(() => import('./pages/LessonLogbook'));
const Petitions = lazy(() => import('./pages/Petitions'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[350px] w-full">
    <div className="flex flex-col items-center gap-3">
      <div className="w-9 h-9 border-3 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Đang tải dữ liệu...</span>
    </div>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <TeacherProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/login/admin" element={<Navigate to="/login" replace />} />
            <Route path="/login/teacher" element={<Navigate to="/login" replace />} />
            <Route path="/login/student" element={<Navigate to="/login" replace />} />
            
            {/* Protected Routes inside DashboardLayout */}
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<Dashboard />} />
                
                {/* Common & Profile */}
                <Route path="profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
                <Route path="notifications" element={<Suspense fallback={<PageLoader />}><Notifications /></Suspense>} />
                
                {/* Admin & Shared Management */}
                <Route path="students" element={<Suspense fallback={<PageLoader />}><Students /></Suspense>} />
                <Route path="students/:id" element={<Suspense fallback={<PageLoader />}><StudentProfile /></Suspense>} />
                <Route path="teachers" element={<Suspense fallback={<PageLoader />}><Teachers /></Suspense>} />
                <Route path="teachers/:id" element={<Suspense fallback={<PageLoader />}><TeacherProfile /></Suspense>} />
                <Route path="classes" element={<Suspense fallback={<PageLoader />}><Classes /></Suspense>} />
                <Route path="classes/:id" element={<Suspense fallback={<PageLoader />}><ClassDetails /></Suspense>} />
                <Route path="subjects" element={<Suspense fallback={<PageLoader />}><Subjects /></Suspense>} />
                <Route path="schedule" element={<Suspense fallback={<PageLoader />}><Schedule /></Suspense>} />
                <Route path="grades" element={<Suspense fallback={<PageLoader />}><Grades /></Suspense>} />
                <Route path="attendance" element={<Suspense fallback={<PageLoader />}><Attendance /></Suspense>} />
                <Route path="exams" element={<Suspense fallback={<PageLoader />}><ExamSchedule /></Suspense>} />
                <Route path="users" element={<Suspense fallback={<PageLoader />}><UsersManagement /></Suspense>} />
                <Route path="tuition" element={<Suspense fallback={<PageLoader />}><Tuition /></Suspense>} />
                <Route path="lesson-logs" element={<Suspense fallback={<PageLoader />}><LessonLogbook /></Suspense>} />
                <Route path="petitions" element={<Suspense fallback={<PageLoader />}><Petitions /></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
                <Route path="audit-logs" element={<Suspense fallback={<PageLoader />}><AuditLogs /></Suspense>} />

                {/* Teacher Specific Routes */}
                <Route path="teacher/homeroom" element={<Suspense fallback={<PageLoader />}><HomeroomClass /></Suspense>} />

                {/* Student Specific Routes */}
                <Route path="student/grades" element={<Suspense fallback={<PageLoader />}><StudentGrades /></Suspense>} />
                <Route path="student/schedule" element={<Suspense fallback={<PageLoader />}><StudentSchedule /></Suspense>} />
                <Route path="student/exams" element={<Suspense fallback={<PageLoader />}><StudentExamSchedule /></Suspense>} />
                <Route path="student/attendance" element={<Suspense fallback={<PageLoader />}><StudentAttendance /></Suspense>} />
                <Route path="student/tuition" element={<Suspense fallback={<PageLoader />}><StudentTuition /></Suspense>} />
                <Route path="student/subject-combination" element={<Suspense fallback={<PageLoader />}><StudentSubjectCombination /></Suspense>} />
              </Route>
            </Route>
            
            {/* Redirect invalid routes */}
            <Route path="/admin" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </TeacherProvider>
    </ThemeProvider>
  );
}

export default App;
