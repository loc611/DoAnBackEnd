import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RoleSelection from './pages/RoleSelection';
import AdminLogin from './pages/AdminLogin';
import TeacherLogin from './pages/TeacherLogin';
import StudentLogin from './pages/StudentLogin';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Subjects from './pages/Subjects';
import Classes from './pages/Classes';
import ClassDetails from './pages/ClassDetails';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Schedule from './pages/Schedule';
import Grades from './pages/Grades';
import UsersManagement from './pages/UsersManagement';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<RoleSelection />} />
        <Route path="/login/admin" element={<AdminLogin />} />
        <Route path="/login/teacher" element={<TeacherLogin />} />
        <Route path="/login/student" element={<StudentLogin />} />
        
        {/* Protected Routes inside DashboardLayout */}
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path="classes" element={<Classes />} />
          <Route path="classes/:id" element={<ClassDetails />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="grades" element={<Grades />} />
          <Route path="users" element={<UsersManagement />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        
        {/* Redirect invalid routes */}
        <Route path="/admin" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
