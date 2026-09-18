import 'dotenv/config';
import prisma from '../prismaClient.js';

const BASE_URL = 'http://localhost:5000/api';

async function main() {
  console.log('🧪 BẮT ĐẦU KIỂM THỬ XÁC THỰC CÁC SỬA LỖI CHO PHÂN HỆ TEACHER & HỆ THỐNG...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  // 1. Kiểm tra đăng nhập với mật khẩu chuẩn
  console.log('1️⃣ Kiểm tra Đăng nhập các tài khoản mặc định...');

  // Admin
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const adminData = await adminLoginRes.json();
  assert(adminLoginRes.status === 200 && adminData.token, 'Admin đăng nhập thành công với admin / admin123');

  // GV001
  const gv001LoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'gv001', password: 'gv001@123' })
  });
  const gv001Data = await gv001LoginRes.json();
  assert(gv001LoginRes.status === 200 && gv001Data.token, 'gv001 đăng nhập thành công với gv001 / gv001@123');

  // GV007 (Chủ nhiệm 12A2)
  const gv007LoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'gv007', password: 'gv007@123' })
  });
  const gv007Data = await gv007LoginRes.json();
  assert(gv007LoginRes.status === 200 && gv007Data.token, 'gv007 đăng nhập thành công với gv007 / gv007@123');

  // HS001
  const hs001LoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'hs001', password: 'hs001@123' })
  });
  const hs001Data = await hs001LoginRes.json();
  assert(hs001LoginRes.status === 200 && hs001Data.token, 'hs001 đăng nhập thành công với hs001 / hs001@123');

  // 2. Kiểm tra Scope Guard Homeroom Permission cho GVCN
  console.log('\n2️⃣ Kiểm tra Scope Guard Homeroom (Xem điểm lớp chủ nhiệm)...');
  // Lấy class 10A1 do gv001 chủ nhiệm
  const class10A1 = await prisma.class.findFirst({
    where: { className: '10A1' }
  });
  assert(Boolean(class10A1), 'Tìm thấy lớp 10A1 trong CSDL');

  if (class10A1 && gv001Data.token) {
    const homeroomGradesRes = await fetch(`${BASE_URL}/grades/homeroom/${class10A1.id}?semester=HK1_2026`, {
      headers: { Authorization: `Bearer ${gv001Data.token}` }
    });
    const hrGradesData = await homeroomGradesRes.json();
    assert(
      homeroomGradesRes.status === 200,
      'GVCN (gv001) truy cập xem điểm lớp chủ nhiệm 10A1 thành công (không còn bị 403 Forbidden)',
      JSON.stringify(hrGradesData)
    );
  }

  // 3. Kiểm tra hiển thị danh sách học sinh cho GVCN (gv007)
  console.log('\n3️⃣ Kiểm tra hiển thị danh sách học sinh cho GVCN (gv007)...');
  const class12A2 = await prisma.class.findFirst({
    where: { className: '12A2' },
    include: { _count: { select: { students: true } } }
  });
  assert(Boolean(class12A2), 'Tìm thấy lớp 12A2 trong CSDL');

  if (gv007Data.token) {
    const studentsRes = await fetch(`${BASE_URL}/students`, {
      headers: { Authorization: `Bearer ${gv007Data.token}` }
    });
    const studentsList = await studentsRes.json();
    assert(
      Array.isArray(studentsList) && studentsList.length >= 40,
      `GVCN gv007 xem được đầy đủ ${Array.isArray(studentsList) ? studentsList.length : 0} học sinh lớp phụ trách (không còn rỗng)`
    );
  }

  // 4. Kiểm tra Điểm danh theo Tiết học (Period-based Attendance)
  console.log('\n4️⃣ Kiểm tra Lưu điểm danh theo Tiết học (saveClassAttendance)...');
  if (class10A1 && gv001Data.token) {
    const sampleStudent = await prisma.student.findFirst({
      where: { classId: class10A1.id }
    });

    const attRes = await fetch(`${BASE_URL}/attendance/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gv001Data.token}`
      },
      body: JSON.stringify({
        classId: class10A1.id,
        date: '2026-09-18',
        periodNumber: 1,
        periodName: 'Tiết 1',
        session: 'morning',
        records: [
          {
            studentId: sampleStudent.id,
            status: 'present',
            note: 'Kiểm thử điểm danh tiết 1'
          }
        ]
      })
    });
    const attData = await attRes.json();
    assert(
      attRes.status === 200,
      'Điểm danh hàng loạt theo tiết (periodNumber) lưu thành công không còn lỗi 500 Schema Mismatch',
      JSON.stringify(attData)
    );
  }

  // 5. Kiểm tra Endpoint Lấy danh sách học sinh cho Sổ đầu bài
  console.log('\n5️⃣ Kiểm tra Endpoint Lấy danh sách học sinh lớp (/classes/:id/students)...');
  if (class10A1 && gv001Data.token) {
    const classStudentsRes = await fetch(`${BASE_URL}/classes/${class10A1.id}/students`, {
      headers: { Authorization: `Bearer ${gv001Data.token}` }
    });
    const classStudents = await classStudentsRes.json();
    assert(
      Array.isArray(classStudents) && classStudents.length > 0,
      `Sổ đầu bài tải được danh sách ${classStudents.length} học sinh của lớp ${class10A1.className}`
    );
  }

  // 6. Kiểm tra Đổi mật khẩu cá nhân (/auth/change-password)
  console.log('\n6️⃣ Kiểm tra Đổi mật khẩu cá nhân (/auth/change-password)...');
  if (gv007Data.token) {
    // Đổi mật khẩu sang gv007@456
    const changePassRes = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gv007Data.token}`
      },
      body: JSON.stringify({
        currentPassword: 'gv007@123',
        newPassword: 'gv007@456'
      })
    });
    const changePassData = await changePassRes.json();
    assert(changePassRes.status === 200, 'Giáo viên tự đổi mật khẩu thành công qua /auth/change-password');

    // Thử đăng nhập lại bằng mật khẩu mới
    const loginNewPassRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'gv007', password: 'gv007@456' })
    });
    assert(loginNewPassRes.status === 200, 'Đăng nhập thành công với mật khẩu mới vừa đổi');

    // Đổi lại mật khẩu cũ để giữ tính nhất quán
    const loginNewData = await loginNewPassRes.json();
    await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginNewData.token}`
      },
      body: JSON.stringify({
        currentPassword: 'gv007@456',
        newPassword: 'gv007@123'
      })
    });
    console.log('  ℹ️ Đã hoàn trả mật khẩu gv007 về gv007@123');
  }

  // Tổng kết
  console.log(`\n========================================`);
  console.log(`🎯 KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
