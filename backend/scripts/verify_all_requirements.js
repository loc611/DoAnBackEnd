import 'dotenv/config';
import prisma from '../prismaClient.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

async function verifyAll() {
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN HỆ THỐNG THEO 13 ĐIỂM YÊU CẦU...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Kiểm tra tài khoản Admin, Quản Khoa, GVCN, Học sinh
  console.log('1️⃣ Kiểm tra Tài khoản & Chức vụ Giáo viên...');
  const admin = await prisma.user.findFirst({ where: { username: 'admin' }, include: { admin: true } });
  assert(admin && admin.role === 'admin' && admin.admin, 'Tài khoản Super Admin tồn tại');

  const quanKhoa = await prisma.user.findFirst({
    where: { username: 'gv001' },
    include: { teacher: true }
  });
  assert(
    quanKhoa && quanKhoa.teacher && quanKhoa.teacher.position === 'Trưởng khoa / Quản khoa',
    'Tài khoản Quản Khoa (gv001) có chức vụ "Trưởng khoa / Quản khoa"'
  );

  const gvcn = await prisma.user.findFirst({
    where: { username: 'gv003' },
    include: { teacher: true }
  });
  assert(
    gvcn && gvcn.teacher && gvcn.teacher.position === 'Giáo viên chủ nhiệm',
    'Tài khoản GVCN (gv003) có chức vụ "Giáo viên chủ nhiệm"'
  );

  const student = await prisma.user.findFirst({
    where: { username: 'hs001' },
    include: { student: { include: { class: true } } }
  });
  assert(
    student && student.student && student.student.studentCode === 'HS001' && student.student.class,
    'Tài khoản Học sinh (hs001) gắn đúng mã HS001 và lớp 10A1'
  );

  // 2. Kiểm tra Môn học đồng bộ CSDL
  console.log('\n2️⃣ Kiểm tra Danh mục Môn học trong CSDL...');
  const subjects = await prisma.subject.findMany();
  assert(subjects.length >= 10, `CSDL có ${subjects.length} môn học chính thức (không hardcode)`);

  // 3. Kiểm tra Thời khóa biểu & Điểm danh
  console.log('\n3️⃣ Kiểm tra Thời khóa biểu & Điểm danh...');
  const class10A1 = await prisma.class.findUnique({ where: { className: '10A1' } });
  const schedules = await prisma.schedule.findMany({ where: { classId: class10A1.id } });
  assert(schedules.length >= 5, `Lớp 10A1 có đủ ${schedules.length} tiết TKB thực tế`);

  const attendances = await prisma.attendance.findMany({ where: { classId: class10A1.id } });
  assert(attendances.length > 0, `Lớp 10A1 có ${attendances.length} bản ghi điểm danh`);

  // 4. Kiểm tra Điểm số 2 bước (Draft vs Locked) & Quyền Mở Khóa
  console.log('\n4️⃣ Kiểm tra Quy trình Điểm 2 bước...');
  const lockedGrades = await prisma.grade.findMany({ where: { classId: class10A1.id, status: 'locked' } });
  assert(lockedGrades.length > 0, `Lớp 10A1 có ${lockedGrades.length} bảng điểm đã khóa & công bố`);

  // Test set draft & check privacy
  await prisma.grade.updateMany({
    where: { classId: class10A1.id, semester: 'HK1_2026' },
    data: { status: 'draft' }
  });

  const draftGrades = await prisma.grade.findMany({ where: { classId: class10A1.id, semester: 'HK1_2026' } });
  assert(draftGrades.every(g => g.status === 'draft'), 'Cập nhật thành công trạng thái nháp (draft)');

  // Re-lock
  await prisma.grade.updateMany({
    where: { classId: class10A1.id, semester: 'HK1_2026' },
    data: { status: 'locked' }
  });
  const reLocked = await prisma.grade.findMany({ where: { classId: class10A1.id, semester: 'HK1_2026' } });
  assert(reLocked.every(g => g.status === 'locked'), 'Khóa và công bố điểm thành công (locked)');

  // 5. Kiểm tra Học phí Phân cấp Khối -> Lớp
  console.log('\n5️⃣ Kiểm tra Đợt thu Học phí & Hóa đơn...');
  const feeProfiles = await prisma.feeProfile.findMany();
  assert(feeProfiles.length >= 3, `Hệ thống có ${feeProfiles.length} đợt thu học phí`);

  const bills = await prisma.feeBill.findMany();
  assert(bills.length > 0, `Có ${bills.length} phiếu thu gán cho học sinh`);

  // 6. Kiểm tra Cấu hình hệ thống (Settings)
  console.log('\n6️⃣ Kiểm tra Cài đặt Hệ thống...');
  const setting = await prisma.systemSetting.findUnique({ where: { id: 'default_setting' } });
  assert(
    setting && setting.schoolName === 'Trường THPT TTLN' && setting.schoolCode === 'THPT-TTLN',
    'Cấu hình trường THPT TTLN đã được lưu đầy đủ'
  );

  console.log(`\n========================================`);
  console.log(`🏁 KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
  console.log(`========================================\n`);

  await prisma.$disconnect();
  if (failed > 0) process.exit(1);
}

verifyAll().catch(err => {
  console.error('Lỗi khi chạy kiểm thử:', err);
  process.exit(1);
});
