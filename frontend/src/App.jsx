import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { TeacherProvider } from './context/TeacherContext';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { lazyRetry } from './utils/lazyRetry';

// ============================================================================
// ⚡ LAZY LOADED ROUTE COMPONENTS (AUTO-RETRY ON STALE CHUNKS)
// ============================================================================
const Students = lazy(() => lazyRetry(() => import('./pages/Students')));
const StudentProfile = lazy(() => lazyRetry(() => import('./pages/StudentProfile')));
const Teachers = lazy(() => lazyRetry(() => import('./pages/Teachers')));
const TeacherProfile = lazy(() => lazyRetry(() => import('./pages/TeacherProfile')));
const Subjects = lazy(() => lazyRetry(() => import('./pages/Subjects')));
const Classes = lazy(() => lazyRetry(() => import('./pages/Classes')));
const ClassDetails = lazy(() => lazyRetry(() => import('./pages/ClassDetails')));
const Notifications = lazy(() => lazyRetry(() => import('./pages/Notifications')));
const Settings = lazy(() => lazyRetry(() => import('./pages/Settings')));
const Schedule = lazy(() => lazyRetry(() => import('./pages/Schedule')));
const Grades = lazy(() => lazyRetry(() => import('./pages/Grades')));
const UsersManagement = lazy(() => lazyRetry(() => import('./pages/UsersManagement')));
const Tuition = lazy(() => lazyRetry(() => import('./pages/Tuition')));
const HomeroomClass = lazy(() => lazyRetry(() => import('./pages/HomeroomClass')));
const StudentGrades = lazy(() => lazyRetry(() => import('./pages/StudentGrades')));
const StudentSchedule = lazy(() => lazyRetry(() => import('./pages/StudentSchedule')));
const StudentTuition = lazy(() => lazyRetry(() => import('./pages/StudentTuition')));
const StudentSubjectCombination = lazy(() => lazyRetry(() => import('./pages/StudentSubjectCombination')));
const Attendance = lazy(() => lazyRetry(() => import('./pages/Attendance')));
const StudentAttendance = lazy(() => lazyRetry(() => import('./pages/StudentAttendance')));
const ExamSchedule = lazy(() => lazyRetry(() => import('./pages/ExamSchedule')));
const StudentExamSchedule = lazy(() => lazyRetry(() => import('./pages/StudentExamSchedule')));
const Profile = lazy(() => lazyRetry(() => import('./pages/Profile')));
const LessonLogbook = lazy(() => lazyRetry(() => import('./pages/LessonLogbook')));
const Petitions = lazy(() => lazyRetry(() => import('./pages/Petitions')));
const AuditLogs = lazy(() => lazyRetry(() => import('./pages/AuditLogs')));
const TeachingAssignment = lazy(() => lazyRetry(() => import('./pages/TeachingAssignment')));

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
          <ErrorBoundary>
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
                  <Route path="teaching-assignment" element={<Suspense fallback={<PageLoader />}><TeachingAssignment /></Suspense>} />
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
          </ErrorBoundary>
        </Router>
      </TeacherProvider>
    </ThemeProvider>
  );
}

export default App;
