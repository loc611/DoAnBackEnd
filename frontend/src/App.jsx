import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { TeacherProvider } from './context/TeacherContext';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentProfile from './pages/StudentProfile';
import Teachers from './pages/Teachers';
import TeacherProfile from './pages/TeacherProfile';
import Subjects from './pages/Subjects';
import Classes from './pages/Classes';
import ClassDetails from './pages/ClassDetails';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Schedule from './pages/Schedule';
import Grades from './pages/Grades';
import UsersManagement from './pages/UsersManagement';
import Tuition from './pages/Tuition';
import HomeroomClass from './pages/HomeroomClass';
import StudentGrades from './pages/StudentGrades';
import StudentSchedule from './pages/StudentSchedule';
import StudentTuition from './pages/StudentTuition';
import StudentSubjectCombination from './pages/StudentSubjectCombination';
import Attendance from './pages/Attendance';
import StudentAttendance from './pages/StudentAttendance';
import ExamSchedule from './pages/ExamSchedule';
import StudentExamSchedule from './pages/StudentExamSchedule';
import Profile from './pages/Profile';
import LessonLogbook from './pages/LessonLogbook';
import Petitions from './pages/Petitions';
import AuditLogs from './pages/AuditLogs';
import PrivateRoute from './components/PrivateRoute';

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
                <Route path="profile" element={<Profile />} />
                <Route path="notifications" element={<Notifications />} />
                
                {/* Admin & Shared Management */}
                <Route path="students" element={<Students />} />
                <Route path="students/:id" element={<StudentProfile />} />
                <Route path="teachers" element={<Teachers />} />
                <Route path="teachers/:id" element={<TeacherProfile />} />
                <Route path="classes" element={<Classes />} />
                <Route path="classes/:id" element={<ClassDetails />} />
                <Route path="subjects" element={<Subjects />} />
                <Route path="schedule" element={<Schedule />} />
                <Route path="grades" element={<Grades />} />
                <Route path="attendance" element={<Attendance />} />
                <Route path="exams" element={<ExamSchedule />} />
                <Route path="users" element={<UsersManagement />} />
                <Route path="tuition" element={<Tuition />} />
                <Route path="lesson-logs" element={<LessonLogbook />} />
                <Route path="petitions" element={<Petitions />} />
                <Route path="settings" element={<Settings />} />
                <Route path="audit-logs" element={<AuditLogs />} />

                {/* Teacher Specific Routes */}
                <Route path="teacher/homeroom" element={<HomeroomClass />} />

                {/* Student Specific Routes */}
                <Route path="student/grades" element={<StudentGrades />} />
                <Route path="student/schedule" element={<StudentSchedule />} />
                <Route path="student/exams" element={<StudentExamSchedule />} />
                <Route path="student/attendance" element={<StudentAttendance />} />
                <Route path="student/tuition" element={<StudentTuition />} />
                <Route path="student/subject-combination" element={<StudentSubjectCombination />} />
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
