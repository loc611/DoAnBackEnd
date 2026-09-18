import prisma from '../prismaClient.js';
import EarlyWarningService from '../services/earlyWarningService.js';

async function verifyMultiGradeFlow() {
  console.log('================================================================');
  console.log('🧪 KIỂM TRA ĐỐI SOÁT TOÀN DIỆN LUỒNG DỮ LIỆU ĐA KHỐI (10, 11, 12)');
  console.log('================================================================\n');

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

  // 1. Kiểm tra Lịch thi học kỳ trên cả 3 khối 10, 11, 12
  console.log('📌 1. Kiểm tra Lịch thi học kỳ (ExamSchedule) trên cả 3 khối:');
  const examsGrade10 = await prisma.examSchedule.findMany({ where: { grade: 10 } });
  const examsGrade11 = await prisma.examSchedule.findMany({ where: { grade: 11 } });
  const examsGrade12 = await prisma.examSchedule.findMany({ where: { grade: 12 } });

  assert(examsGrade10.length >= 6, `Khối 10 có đầy đủ ${examsGrade10.length} lịch thi`);
  assert(examsGrade11.length >= 6, `Khối 11 có đầy đủ ${examsGrade11.length} lịch thi`);
  assert(examsGrade12.length >= 6, `Khối 12 có đầy đủ ${examsGrade12.length} lịch thi`);

  // 2. Kiểm tra Sổ đầu bài điện tử (LessonLog) trên cả 3 khối
  console.log('\n📌 2. Kiểm tra Sổ đầu bài điện tử (LessonLog) trên cả 3 khối:');
  const classes = await prisma.class.findMany({
    include: {
      lessonLogs: {
        include: { subject: true, teacher: true }
      }
    }
  });

  const logsByGrade = { 10: 0, 11: 0, 12: 0 };
  for (const c of classes) {
    logsByGrade[c.grade] = (logsByGrade[c.grade] || 0) + c.lessonLogs.length;
  }

  assert(logsByGrade[10] >= 40, `Khối 10 có ${logsByGrade[10]} tiết sổ đầu bài đã ký duyệt`);
  assert(logsByGrade[11] >= 40, `Khối 11 có ${logsByGrade[11]} tiết sổ đầu bài đã ký duyệt`);
  assert(logsByGrade[12] >= 40, `Khối 12 có ${logsByGrade[12]} tiết sổ đầu bài đã ký duyệt`);

  // 3. Kiểm tra Điểm danh chuyên cần (Attendance) trên cả 3 khối
  console.log('\n📌 3. Kiểm tra Điểm danh chuyên cần (Attendance):');
  const attendanceCount = await prisma.attendance.count();
  const presentCount = await prisma.attendance.count({ where: { status: 'present' } });
  const excusedCount = await prisma.attendance.count({ where: { status: 'excused' } });
  const unexcusedCount = await prisma.attendance.count({ where: { status: 'unexcused' } });
  const lateCount = await prisma.attendance.count({ where: { status: 'late' } });

  assert(attendanceCount >= 7000, `Tổng số lượt điểm danh: ${attendanceCount} bản ghi`);
  assert(excusedCount > 0, `Có ${excusedCount} lượt nghỉ có phép (liên thông đơn nghỉ học)`);
  assert(unexcusedCount > 0, `Có ${unexcusedCount} lượt nghỉ không phép (kích hoạt cảnh báo sớm)`);
  assert(lateCount > 0, `Có ${lateCount} lượt đi muộn`);

  // 4. Kiểm tra Học phí (FeeBill) & Giao dịch VietQR (PaymentTransaction)
  console.log('\n📌 4. Kiểm tra Học phí & Giao dịch thanh toán VietQR:');
  const totalBills = await prisma.feeBill.count();
  const paidBills = await prisma.feeBill.count({ where: { status: 'paid' } });
  const unpaidBills = await prisma.feeBill.count({ where: { status: 'unpaid' } });
  const totalTx = await prisma.paymentTransaction.count();

  assert(totalBills >= 700, `Tổng số hóa đơn học phí: ${totalBills}`);
  assert(paidBills > 0 && unpaidBills > 0, `Tỷ lệ thu học phí thực tế: ${paidBills} đã thu / ${unpaidBills} nợ đọng`);
  assert(totalTx >= 500, `Số lượng giao dịch VietQR đối soát thành công: ${totalTx}`);

  // Kiểm tra liên kết giao dịch <-> hóa đơn
  const sampleTx = await prisma.paymentTransaction.findFirst({
    include: { bill: { include: { student: { include: { class: true } } } } }
  });
  assert(sampleTx && sampleTx.bill && sampleTx.bill.student, `Giao dịch VietQR liên kết toàn vẹn với Học sinh (${sampleTx?.bill?.student?.fullName} - Lớp ${sampleTx?.bill?.student?.class?.className})`);

  // 5. Kiểm tra Đơn từ số hóa & Phê duyệt (StudentPetition)
  console.log('\n📌 5. Kiểm tra Đơn từ số hóa & Phê duyệt:');
  const petitions = await prisma.studentPetition.findMany({
    include: { student: { include: { class: true } } }
  });
  assert(petitions.length >= 4, `Số đơn từ số hóa được tạo: ${petitions.length}`);

  const leavePetition = petitions.find(p => p.type === 'LEAVE_ABSENCE' && p.status === 'APPROVED');
  assert(leavePetition !== undefined, `Đơn nghỉ phép đã được phê duyệt liên thông chuyên cần (${leavePetition?.title})`);

  const appealPetition = petitions.find(p => p.type === 'GRADE_APPEAL' && p.status === 'APPROVED');
  assert(appealPetition && appealPetition.temporaryUnlockToken !== null, `Đơn phúc khảo đã được phê duyệt và cấp Token mở khóa sổ điểm 24h (${appealPetition?.temporaryUnlockToken?.slice(0, 8)}...)`);

  const tuitionPetition = petitions.find(p => p.type === 'TUITION_WAIVER' && p.status === 'APPROVED');
  assert(tuitionPetition !== undefined, `Đơn miễn giảm học phí được phê duyệt cho học sinh chính sách`);

  // 6. Kiểm tra Hồ sơ chính sách & Giấy tờ sắp hết hạn (StudentPolicy)
  console.log('\n📌 6. Kiểm tra Hồ sơ chính sách & Giấy tờ sắp hết hạn:');
  const policies = await prisma.studentPolicy.findMany({
    include: { student: { include: { class: true } } }
  });
  assert(policies.length >= 3, `Số hồ sơ chính sách ưu tiên: ${policies.length}`);

  const now = new Date();
  const in30Days = new Date(Date.now() + 30 * 86400000);
  const expiringSoon = policies.filter(p => p.documentExpiryDate && p.documentExpiryDate >= now && p.documentExpiryDate <= in30Days);
  assert(expiringSoon.length >= 3, `Có ${expiringSoon.length} hồ sơ chính sách sắp hết hạn trong 30 ngày để cảnh báo văn thư`);

  // 7. Kiểm tra Hệ thống Cảnh Báo Sớm Học Đường (EarlyWarningService & AcademicAlert)
  console.log('\n📌 7. Kiểm tra Hệ thống Cảnh Báo Sớm Học Đường (AcademicAlert):');
  const allAlerts = await prisma.academicAlert.findMany({
    include: { student: { include: { class: true } } }
  });
  const attendanceAlerts = allAlerts.filter(a => a.alertType === 'ATTENDANCE_RISK');
  const academicAlerts = allAlerts.filter(a => a.alertType === 'ACADEMIC_RISK');
  const docAlerts = allAlerts.filter(a => a.alertType === 'DOCUMENT_EXPIRING');

  assert(attendanceAlerts.length > 0, `Cảnh báo Chuyên cần (vắng học không phép >= 3 buổi): ${attendanceAlerts.length} học sinh`);
  assert(academicAlerts.length > 0, `Cảnh báo Học lực sa sút (ĐTB < 3.5): ${academicAlerts.length} học sinh`);
  assert(docAlerts.length > 0, `Cảnh báo Giấy tờ ưu tiên sắp hết hạn: ${docAlerts.length} hồ sơ`);

  // Kiểm tra phân quyền truy cập Cảnh báo (Scoped Access cho GVCN và Student)
  const teacher1 = await prisma.teacher.findFirst({
    where: { homeroomClasses: { some: {} } },
    include: { user: true, homeroomClasses: true }
  });
  if (teacher1 && teacher1.user) {
    const teacherAlerts = await EarlyWarningService.getAlerts({
      userRole: 'teacher',
      userId: teacher1.user.id
    });
    console.log(`  ℹ️ GVCN ${teacher1.fullName} (${teacher1.homeroomClasses[0]?.className}) nhận được: ${teacherAlerts.total} cảnh báo thuộc lớp mình phụ trách.`);
  }

  console.log('\n================================================================');
  console.log(`📊 TỔNG KẾT KIỂM TRA ĐA KHỐI: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

verifyMultiGradeFlow()
  .catch(err => {
    console.error('❌ Lỗi kiểm tra:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
