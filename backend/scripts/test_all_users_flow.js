import express from 'express';
import dotenv from 'dotenv';
import authRoutes from '../routes/authRoutes.js';
import studentRoutes from '../routes/studentRoutes.js';
import userRoutes from '../routes/userRoutes.js';
import classRoutes from '../routes/classRoutes.js';
import subjectRoutes from '../routes/subjectRoutes.js';
import gradeRoutes from '../routes/gradeRoutes.js';
import scheduleRoutes from '../routes/scheduleRoutes.js';
import notificationRoutes from '../routes/notificationRoutes.js';
import feeProfileRoutes from '../routes/feeProfileRoutes.js';
import tuitionRoutes from '../routes/tuitionRoutes.js';
import attendanceRoutes from '../routes/attendanceRoutes.js';
import examRoutes from '../routes/examRoutes.js';
import systemSettingRoutes from '../routes/systemSettingRoutes.js';
import auditLogRoutes from '../routes/auditLogRoutes.js';
import { initDefaultUsers } from '../utils/initDefaultUsers.js';
import { seedRbacScopeData } from '../utils/seedRbacScope.js';
import prisma from '../prismaClient.js';

dotenv.config();

const app = express();
app.use(express.json());

// Mount routes exactly as in server.js
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/fee-profiles', feeProfileRoutes);
app.use('/api/tuition', tuitionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/settings', systemSettingRoutes);
app.use('/api/audit-logs', auditLogRoutes);

const TEST_PORT = 5099;

const testResults = [];

function recordTest(category, description, passed, details = '') {
  testResults.push({ category, description, status: passed ? '✅ PASS' : '❌ FAIL', details });
  console.log(`${passed ? '✅' : '❌'} [${category}] ${description} ${details ? '(' + details + ')' : ''}`);
}

async function makeRequest(path, options = {}) {
  const url = `http://127.0.0.1:${TEST_PORT}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }
  return { status: response.status, data };
}

async function run() {
  console.log('🚀 Bắt đầu khởi động server test trên port', TEST_PORT, '...\n');
  
  // 1. Khởi tạo dữ liệu người dùng & RBAC
  await initDefaultUsers();
  await seedRbacScopeData();

  const server = app.listen(TEST_PORT);

  try {
    // ==========================================
    // 👑 1. KIỂM TRA TÀI KHOẢN ADMIN
    // ==========================================
    console.log('\n--- 1. KIỂM TRA TÀI KHOẢN ADMIN (admin / admin123) ---');
    
    // Đăng nhập Admin
    const adminLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'admin', password: 'admin123' })
    });
    
    const adminToken = adminLogin.data?.token;
    recordTest('Admin Auth', 'Đăng nhập bằng username "admin"', adminLogin.status === 200 && !!adminToken, `Role: ${adminLogin.data?.user?.role}`);

    // Đăng nhập Admin bằng Email
    const adminEmailLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'admin@school.edu.vn', password: 'admin123' })
    });
    recordTest('Admin Auth', 'Đăng nhập bằng email "admin@school.edu.vn"', adminEmailLogin.status === 200);

    // Lấy thông tin cá nhân Admin (/auth/me)
    const adminMe = await makeRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest('Admin Profile', 'Lấy thông tin Admin qua GET /api/auth/me', adminMe.status === 200 && adminMe.data?.user?.name === 'Super Admin');

    // Admin truy cập tính năng quản trị độc quyền
    const adminUsers = await makeRequest('/api/users', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest('Admin RBAC', 'Admin truy cập Quản lý người dùng (GET /api/users)', adminUsers.status === 200 && Array.isArray(adminUsers.data), `Số users: ${adminUsers.data?.length || 0}`);

    const adminTuition = await makeRequest('/api/tuition/dashboard-summary', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest('Admin RBAC', 'Admin truy cập Thống kê học phí (GET /api/tuition/dashboard-summary)', adminTuition.status === 200 && adminTuition.data?.success === true);


    // ==========================================
    // 👨‍🏫 2. KIỂM TRA TÀI KHOẢN GIÁO VIÊN
    // ==========================================
    console.log('\n--- 2. KIỂM TRA TÀI KHOẢN GIÁO VIÊN (gv001 / teacher123) ---');

    // Đăng nhập GV001
    const teacherLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'gv001', password: 'teacher123' })
    });
    const teacherToken = teacherLogin.data?.token;
    recordTest('Teacher Auth', 'Đăng nhập bằng mã "gv001"', teacherLogin.status === 200 && !!teacherToken, `Tên: ${teacherLogin.data?.user?.name}`);

    // Đăng nhập GV002 bằng email
    const teacher2Login = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'gv002@school.edu.vn', password: 'teacher123' })
    });
    recordTest('Teacher Auth', 'Đăng nhập bằng email "gv002@school.edu.vn"', teacher2Login.status === 200);

    // Lấy thông tin cá nhân GV (/auth/me)
    const teacherMe = await makeRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    recordTest('Teacher Profile', 'Lấy thông tin GV qua GET /api/auth/me', teacherMe.status === 200 && teacherMe.data?.user?.role === 'teacher');

    // Giáo viên xem danh sách lớp học
    const teacherClasses = await makeRequest('/api/classes', {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    recordTest('Teacher Access', 'Giáo viên xem danh sách lớp học (GET /api/classes)', teacherClasses.status === 200 && Array.isArray(teacherClasses.data));

    // Giáo viên BỊ CHẶN khi cố truy cập trang Quản lý User của Admin
    const teacherDeniedUsers = await makeRequest('/api/users', {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    recordTest('Teacher Security', 'Giáo viên bị chặn khi truy cập Quản trị User (GET /api/users)', teacherDeniedUsers.status === 403, 'Trả về 403 Forbidden chuẩn xác');


    // ==========================================
    // 🎓 3. KIỂM TRA TÀI KHOẢN HỌC SINH
    // ==========================================
    console.log('\n--- 3. KIỂM TRA TÀI KHOẢN HỌC SINH (hs001 / student123) ---');

    // Đăng nhập HS001
    const studentLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'hs001', password: 'student123' })
    });
    const studentToken = studentLogin.data?.token;
    recordTest('Student Auth', 'Đăng nhập bằng mã "hs001"', studentLogin.status === 200 && !!studentToken, `Tên: ${studentLogin.data?.user?.name}`);

    // Lấy thông tin cá nhân HS (/auth/me)
    const studentMe = await makeRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    recordTest('Student Profile', 'Lấy thông tin HS qua GET /api/auth/me', studentMe.status === 200 && studentMe.data?.user?.role === 'student');

    // Học sinh xem bảng điểm cá nhân (/api/grades/my-grades)
    const studentGrades = await makeRequest('/api/grades/my-grades', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    recordTest('Student Feature', 'Học sinh xem bảng điểm cá nhân (GET /api/grades/my-grades)', studentGrades.status === 200 && !!studentGrades.data?.student);

    // Học sinh xem lịch sử học phí (/api/tuition/my-bills)
    const studentBills = await makeRequest('/api/tuition/my-bills', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    recordTest('Student Feature', 'Học sinh xem học phí & biên lai (GET /api/tuition/my-bills)', studentBills.status === 200 && studentBills.data?.success === true);

    // Học sinh xem lịch sử chuyên cần (/api/attendance/student/me)
    const studentAtt = await makeRequest('/api/attendance/student/me', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    recordTest('Student Feature', 'Học sinh xem lịch sử chuyên cần (GET /api/attendance/student/me)', studentAtt.status === 200 && !!studentAtt.data?.stats);

    // Học sinh xem lịch thi (/api/exams/my-exams)
    const studentExams = await makeRequest('/api/exams/my-exams', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    recordTest('Student Feature', 'Học sinh xem lịch thi cá nhân (GET /api/exams/my-exams)', studentExams.status === 200);

    // Học sinh BỊ CHẶN khi cố thêm học sinh mới (Chức năng Admin)
    const studentDeniedPost = await makeRequest('/api/students', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ fullName: 'Học sinh giả mạo' })
    });
    recordTest('Student Security', 'Học sinh bị chặn khi gọi POST /api/students', studentDeniedPost.status === 403, 'Trả về 403 Forbidden chuẩn xác');


    // ==========================================
    // 🛡️ 4. KIỂM TRA BẢO MẬT & MẬT KHẨU SAI
    // ==========================================
    console.log('\n--- 4. KIỂM TRA MẬT KHẨU SAI & TÀI KHOẢN KHÔNG TỒN TẠI ---');

    const wrongPass = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'admin', password: 'matkhau_sai_hoantoan' })
    });
    recordTest('Security', 'Đăng nhập mật khẩu sai bị từ chối', wrongPass.status === 401, 'Trả về 401 Unauthorized');

    const notExistUser = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'user_khong_ton_tai_12345', password: '123' })
    });
    recordTest('Security', 'Đăng nhập tài khoản không tồn tại bị từ chối', notExistUser.status === 401, 'Trả về 401 Unauthorized');

    const noToken = await makeRequest('/api/auth/me');
    recordTest('Security', 'Gọi API bảo vệ không có token bị từ chối', noToken.status === 401, 'Trả về 401 Unauthorized');

  } catch (err) {
    console.error('Fatal test error:', err);
  } finally {
    server.close();
    await prisma.$disconnect();
    
    console.log('\n======================================================');
    console.log(`📊 TỔNG KẾT KIỂM THỬ: ${testResults.filter(r => r.status.includes('PASS')).length}/${testResults.length} BÀI KIỂM TRA THÀNH CÔNG`);
    console.log('======================================================\n');
  }
}

run();
