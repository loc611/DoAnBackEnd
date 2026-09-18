import prisma from '../prismaClient.js';
import EarlyWarningService from '../services/earlyWarningService.js';
import crypto from 'crypto';

const ACADEMIC_YEAR = '2026-2027';
const SEMESTER = 'HK1_2026';

async function seedMultiGradeFlow() {
  console.log('================================================================');
  console.log('🌟 BẮT ĐẦU TẠO DỮ LIỆU & LIÊN KẾT LUỒNG DỮ LIỆU ĐA KHỐI (10, 11, 12)');
  console.log('================================================================\n');

  // Lấy danh sách lớp, môn học, giáo viên
  const classes = await prisma.class.findMany({
    orderBy: [{ grade: 'asc' }, { className: 'asc' }],
    include: {
      students: {
        orderBy: { studentCode: 'asc' }
      },
      homeroomTeacher: true
    }
  });

  const subjects = await prisma.subject.findMany();
  const teachers = await prisma.teacher.findMany({ include: { user: true } });
  const totalStudents = classes.reduce((sum, c) => sum + c.students.length, 0);

  console.log(`🏫 Thống kê ban đầu:`);
  console.log(`   - Tổng số lớp: ${classes.length} (Khối 10: ${classes.filter(c => c.grade === 10).length} lớp, Khối 11: ${classes.filter(c => c.grade === 11).length} lớp, Khối 12: ${classes.filter(c => c.grade === 12).length} lớp)`);
  console.log(`   - Tổng số học sinh: ${totalStudents}`);
  console.log(`   - Tổng số môn học: ${subjects.length}`);
  console.log(`   - Tổng số giáo viên: ${teachers.length}\n`);

  // ============================================================
  // 1️⃣ LỊCH THI HỌC KỲ CHO KHỐI 11 VÀ KHỐI 12 (EXAM SCHEDULES)
  // ============================================================
  console.log('📝 1. Bổ sung Lịch thi Học kỳ 1 cho Khối 11 & Khối 12...');

  const EXAMS_GRADE_11 = [
    { examName: 'Thi Cuối Kỳ 1 - Toán 11', examType: 'Cuối kỳ', subjectName: 'Toán Học', grade: 11, examDate: new Date('2026-12-21'), startTime: '07:30', duration: 90, room: 'Phòng 301 - 304', examFormat: 'Tự luận kết hợp trắc nghiệm', notes: 'Lượng giác & Hình học không gian' },
    { examName: 'Thi Cuối Kỳ 1 - Ngữ Văn 11', examType: 'Cuối kỳ', subjectName: 'Ngữ Văn', grade: 11, examDate: new Date('2026-12-22'), startTime: '07:30', duration: 90, room: 'Phòng 301 - 304', examFormat: 'Tự luận', notes: 'Nghị luận văn học & xã hội' },
    { examName: 'Thi Cuối Kỳ 1 - Tiếng Anh 11', examType: 'Cuối kỳ', subjectName: 'Tiếng Anh', grade: 11, examDate: new Date('2026-12-23'), startTime: '08:00', duration: 60, room: 'Phòng 301 - 304', examFormat: 'Trắc nghiệm máy', notes: 'Trắc nghiệm 50 câu 4 kỹ năng' },
    { examName: 'Thi Cuối Kỳ 1 - Vật Lý 11', examType: 'Cuối kỳ', subjectName: 'Vật Lý', grade: 11, examDate: new Date('2026-12-24'), startTime: '07:30', duration: 50, room: 'Phòng 301 - 304', examFormat: 'Trắc nghiệm', notes: 'Điện từ trường & Quang hình' },
    { examName: 'Thi Cuối Kỳ 1 - Hóa Học 11', examType: 'Cuối kỳ', subjectName: 'Hóa Học', grade: 11, examDate: new Date('2026-12-25'), startTime: '07:30', duration: 50, room: 'Phòng 301 - 304', examFormat: 'Trắc nghiệm', notes: 'Hóa hữu cơ đại cương' },
    { examName: 'Thi Cuối Kỳ 1 - Lịch Sử 11', examType: 'Cuối kỳ', subjectName: 'Lịch Sử', grade: 11, examDate: new Date('2026-12-26'), startTime: '08:00', duration: 45, room: 'Phòng 301 - 304', examFormat: 'Trắc nghiệm', notes: 'Lịch sử cận hiện đại' }
  ];

  const EXAMS_GRADE_12 = [
    { examName: 'Thi Cuối Kỳ 1 - Toán 12 (Thi Tốt Nghiệp Mẫu)', examType: 'Cuối kỳ', subjectName: 'Toán Học', grade: 12, examDate: new Date('2026-12-21'), startTime: '09:30', duration: 90, room: 'Phòng 401 - 404', examFormat: 'Trắc nghiệm chuẩn Bộ GD&ĐT', notes: 'Khảo sát hàm số & Tọa độ Oxyz' },
    { examName: 'Thi Cuối Kỳ 1 - Ngữ Văn 12', examType: 'Cuối kỳ', subjectName: 'Ngữ Văn', grade: 12, examDate: new Date('2026-12-22'), startTime: '09:30', duration: 120, room: 'Phòng 401 - 404', examFormat: 'Tự luận', notes: 'Tự luận văn học 100%' },
    { examName: 'Thi Cuối Kỳ 1 - Tiếng Anh 12', examType: 'Cuối kỳ', subjectName: 'Tiếng Anh', grade: 12, examDate: new Date('2026-12-23'), startTime: '09:30', duration: 60, room: 'Phòng 401 - 404', examFormat: 'Trắc nghiệm máy', notes: 'Format đề thi Đánh giá năng lực' },
    { examName: 'Thi Cuối Kỳ 1 - Vật Lý 12', examType: 'Cuối kỳ', subjectName: 'Vật Lý', grade: 12, examDate: new Date('2026-12-24'), startTime: '09:30', duration: 50, room: 'Phòng 401 - 404', examFormat: 'Trắc nghiệm', notes: 'Dao động cơ & Sóng điện từ' },
    { examName: 'Thi Cuối Kỳ 1 - Hóa Học 12', examType: 'Cuối kỳ', subjectName: 'Hóa Học', grade: 12, examDate: new Date('2026-12-25'), startTime: '09:30', duration: 50, room: 'Phòng 401 - 404', examFormat: 'Trắc nghiệm', notes: 'Este - Lipit - Cacbohiđrat' },
    { examName: 'Thi Cuối Kỳ 1 - Sinh Học 12', examType: 'Cuối kỳ', subjectName: 'Sinh Học', grade: 12, examDate: new Date('2026-12-26'), startTime: '09:30', duration: 50, room: 'Phòng 401 - 404', examFormat: 'Trắc nghiệm', notes: 'Di truyền học & Tiến hóa' }
  ];

  let examAddedCount = 0;
  for (const ex of [...EXAMS_GRADE_11, ...EXAMS_GRADE_12]) {
    const existing = await prisma.examSchedule.findFirst({
      where: { examName: ex.examName, grade: ex.grade, semester: SEMESTER }
    });
    if (!existing) {
      await prisma.examSchedule.create({
        data: {
          ...ex,
          academicYear: ACADEMIC_YEAR,
          semester: SEMESTER
        }
      });
      examAddedCount++;
    }
  }
  const totalExams = await prisma.examSchedule.count();
  console.log(`  ✅ Đã bổ sung ${examAddedCount} lịch thi mới. Tổng số lịch thi hiện tại: ${totalExams} (trải dài cả 3 Khối 10, 11, 12).`);

  // ============================================================
  // 2️⃣ HỌC PHÍ TOÀN TRƯỜNG & GIAO DỊCH VIETQR (FEE BILLS & PAYMENTS)
  // ============================================================
  console.log('\n💰 2. Tạo Hóa đơn học phí & Giao dịch thanh toán VietQR cho toàn bộ học sinh...');

  // Lấy 3 khoản thu chuẩn
  const mainProfiles = await prisma.feeProfile.findMany({
    where: {
      name: { in: ['Học phí Học kỳ 1 (2026 - 2027)', 'Bảo hiểm Y tế & Thân thể học sinh', 'Quỹ hoạt động Ngoại khóa & Tin học'] }
    }
  });

  const feeBillsToCreate = [];
  let studentIndexOverall = 0;

  for (const profile of mainProfiles) {
    for (const cls of classes) {
      for (const student of cls.students) {
        studentIndexOverall++;
        const isPaid = (studentIndexOverall % 10) < 7; // 70% đã đóng, 30% chưa đóng
        const isPolicyStudent = (studentIndexOverall % 12 === 0);
        const discountAmount = isPolicyStudent ? profile.amount * 0.5 : 0;
        const finalAmount = profile.amount - discountAmount;
        const paidAt = isPaid ? new Date(Date.now() - (studentIndexOverall % 7 + 1) * 86400000) : null;

        feeBillsToCreate.push({
          feeProfileId: profile.id,
          studentId: student.id,
          status: isPaid ? 'paid' : 'unpaid',
          originalAmount: profile.amount,
          discountAmount,
          finalAmount,
          paidAt
        });
      }
    }
  }

  // Bulk create bills (skip existing duplicates)
  const createdBillsResult = await prisma.feeBill.createMany({
    data: feeBillsToCreate,
    skipDuplicates: true
  });
  console.log(`  ✅ Đã thêm mới ${createdBillsResult.count} hóa đơn học phí cho học sinh cả 3 khối.`);

  // Tạo các giao dịch thanh toán VietQR cho các hóa đơn đã thanh toán
  const paidBillsWithoutTx = await prisma.feeBill.findMany({
    where: {
      status: 'paid',
      transactions: { none: {} }
    },
    include: {
      student: { select: { fullName: true, studentCode: true, class: { select: { className: true } } } }
    },
    take: 500 // Giới hạn mẻ để chạy cực nhanh
  });

  if (paidBillsWithoutTx.length > 0) {
    const bankCodes = ['ICB', 'VCB', 'BIDV', 'TCB', 'MB'];
    const txData = paidBillsWithoutTx.map((bill, idx) => {
      const className = bill.student?.class?.className || '10A1';
      const cleanName = (bill.student?.fullName || 'HOC SINH').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return {
        billId: bill.id,
        transactionCode: `VQR_${bill.id.slice(0, 8).toUpperCase()}_${idx.toString().padStart(4, '0')}`,
        amount: Number(bill.finalAmount ?? bill.originalAmount ?? 500000),
        bankCode: bankCodes[idx % bankCodes.length],
        paymentMethod: 'VIETQR',
        transferContent: `HP ${className} ${bill.student?.studentCode || 'HS'} ${cleanName}`,
        paidAt: bill.paidAt || new Date(),
        status: 'SUCCESS'
      };
    });

    const txResult = await prisma.paymentTransaction.createMany({
      data: txData,
      skipDuplicates: true
    });
    console.log(`  ✅ Đã tạo ${txResult.count} giao dịch chuyển khoản VietQR đối soát thành công.`);
  } else {
    console.log(`  ℹ️ Tất cả hóa đơn đã thanh toán đều đã có giao dịch đối soát.`);
  }

  // ============================================================
  // 3️⃣ SỔ ĐẦU BÀI ĐIỆN TỬ (LESSON LOGBOOK) CHO CẢ 3 KHỐI
  // ============================================================
  console.log('\n📖 3. Tạo Sổ đầu bài điện tử (LessonLog) liên kết TKB, GVBM & Chữ ký số...');

  const LESSON_TITLES = {
    'TOAN': [
      'Bài 1: Khảo sát sự biến thiên và đồ thị hàm số',
      'Bài 2: Cực trị của hàm số và ứng dụng thực tiễn',
      'Bài 3: Đường tiệm cận của đồ thị hàm số',
      'Bài 4: Khối đa diện và thể tích khối chóp',
      'Bài 5: Tích vô hướng của vectơ trong không gian'
    ],
    'VAN': [
      'Bài 1: Phong cách ngôn ngữ văn bản văn học',
      'Bài 2: Tuyên ngôn độc lập - Tác gia Hồ Chí Minh',
      'Bài 3: Văn tế nghĩa sĩ Cần Giuộc - Nguyễn Đình Chiểu',
      'Bài 4: Đọc hiểu văn bản thông tin thời đại số',
      'Bài 5: Kỹ năng viết bài văn nghị luận xã hội'
    ],
    'ANH': [
      'Unit 1: Life Stories We Admire - Reading & Vocabulary',
      'Unit 1: Language Focus - Past Simple vs. Past Continuous',
      'Unit 2: A Multicultural World - Listening & Speaking',
      'Unit 2: Writing an Opinion Essay',
      'Unit 3: Green Living - Integrated Skills'
    ],
    'VATLY': [
      'Bài 1: Mô hình động học phân tử chất khí',
      'Bài 2: Định luật Boyle và định luật Charles',
      'Bài 3: Phương trình trạng thái khí lý tưởng',
      'Bài 4: Từ trường và cảm ứng điện từ',
      'Bài 5: Thực hành đo suất điện động của pin'
    ],
    'TINHOC': [
      'Bài 1: Cơ sở dữ liệu quan hệ và hệ quản trị CSDL',
      'Bài 2: Thiết lập bảng và khóa chính trong MySQL',
      'Bài 3: Tạo quan hệ giữa các bảng và toàn vẹn dữ liệu',
      'Bài 4: Truy vấn dữ liệu nâng cao với SELECT và JOIN',
      'Bài 5: Thực hành dự án Web ứng dụng với NodeJS'
    ]
  };

  const subjectCodeTeacherMap = {
    'TOAN': 'GV001', 'VAN': 'GV002', 'ANH': 'GV003', 'VATLY': 'GV004',
    'HOAHOC': 'GV005', 'SINHHOC': 'GV006', 'LICHSU': 'GV007', 'DIALY': 'GV008',
    'TINHOC': 'GV009', 'GDCD': 'GV010', 'THEDUC': 'GV011', 'QPAN': 'GV011'
  };

  const teacherMapByCode = new Map();
  teachers.forEach(t => teacherMapByCode.set(t.teacherCode.toUpperCase(), t));

  const subjectMapByCode = new Map();
  subjects.forEach(s => subjectMapByCode.set(s.subjectCode.toUpperCase(), s));

  // Chọn 6 lớp đại diện trải dài 3 khối: 10A1, 10A2, 11A1, 11A2, 12A1, 12A2
  const targetClasses = classes.filter(c => ['10A1', '10A2', '11A1', '11A2', '12A1', '12A2'].includes(c.className));
  const pastDates = [
    new Date('2026-09-14'),
    new Date('2026-09-15'),
    new Date('2026-09-16'),
    new Date('2026-09-17'),
    new Date('2026-09-18')
  ];

  const dailySchedule = [
    { period: 1, subCode: 'TOAN' },
    { period: 2, subCode: 'VAN' },
    { period: 3, subCode: 'ANH' },
    { period: 4, subCode: 'VATLY' },
    { period: 5, subCode: 'TINHOC' }
  ];

  const lessonLogsData = [];

  for (const cls of targetClasses) {
    const studentCount = cls.students.length;
    for (let dIdx = 0; dIdx < pastDates.length; dIdx++) {
      const d = pastDates[dIdx];

      for (const slot of dailySchedule) {
        const sub = subjectMapByCode.get(slot.subCode);
        if (!sub) continue;

        const teacherCode = subjectCodeTeacherMap[slot.subCode] || 'GV001';
        const teacher = teacherMapByCode.get(teacherCode) || teachers[0];
        const titles = LESSON_TITLES[slot.subCode] || ['Bài học phân phối chương trình'];
        const lessonTitle = titles[dIdx % titles.length];

        let absentIds = [];
        if ((dIdx + slot.period) % 4 === 0 && studentCount > 5) {
          absentIds = [cls.students[(dIdx * 2) % studentCount].id];
        }

        const presentCount = studentCount - absentIds.length;

        lessonLogsData.push({
          classId: cls.id,
          date: d,
          periodNumber: slot.period,
          session: 'morning',
          subjectId: sub.id,
          teacherId: teacher.id,
          lessonTitle,
          periodInPlan: dIdx * 5 + slot.period,
          totalStudents: studentCount,
          presentCount,
          absentStudentIds: absentIds,
          disciplineRating: absentIds.length > 0 ? 'Khá' : 'Tốt',
          teacherRemark: absentIds.length > 0 ? `Lớp học sôi nổi, có ${absentIds.length} học sinh vắng có lý do` : 'Lớp học nghiêm túc, chuẩn bị bài tốt',
          isSigned: true,
          signedAt: new Date(d.getTime() + (slot.period + 7) * 3600000)
        });
      }
    }
  }

  const lessonLogResult = await prisma.lessonLog.createMany({
    data: lessonLogsData,
    skipDuplicates: true
  });
  console.log(`  ✅ Đã lưu ${lessonLogResult.count} tiết vào Sổ đầu bài điện tử (bao gồm đủ các Khối 10, 11, 12).`);

  // ============================================================
  // 4️⃣ ĐIỂM DANH CHUYÊN CẦN TOÀN TRƯỜNG THEO TIẾT & LIÊN KẾT ĐƠN NGHỈ
  // ============================================================
  console.log('\n📅 4. Đồng bộ Điểm danh chuyên cần theo tiết cho tất cả các lớp...');

  const attendanceBatch = [];

  for (const cls of classes) {
    if (cls.students.length === 0) continue;

    for (let dIdx = 0; dIdx < pastDates.length; dIdx++) {
      const d = pastDates[dIdx];

      for (let pNum = 1; pNum <= 5; pNum++) {
        const slot = dailySchedule[pNum - 1];
        const sub = subjectMapByCode.get(slot.subCode);

        for (let sIdx = 0; sIdx < cls.students.length; sIdx++) {
          const student = cls.students[sIdx];

          let status = 'present';
          let note = null;

          if (sIdx === 0 && dIdx === 1) {
            status = 'late';
            note = 'Đến lớp muộn 15 phút do hỏng xe';
          } else if (sIdx === 3 && (dIdx === 2 || dIdx === 3)) {
            // Học sinh xin nghỉ phép có đơn hợp lệ
            status = 'excused';
            note = 'Nghỉ có phép theo đơn số hóa #LEAVE_001';
          } else if (sIdx === 5 && (dIdx === 0 || dIdx === 1 || dIdx === 3)) {
            // Học sinh vắng không phép 3 buổi -> Kích hoạt cảnh báo sớm!
            status = 'unexcused';
            note = 'Vắng không phép tiết học';
          }

          attendanceBatch.push({
            studentId: student.id,
            classId: cls.id,
            date: d,
            periodNumber: pNum,
            session: 'morning',
            periodName: `Tiết ${pNum}`,
            subjectId: sub ? sub.id : null,
            subjectName: sub ? sub.name : 'Văn hóa',
            status,
            note
          });
        }
      }
    }
  }

  // Chèn theo mẻ 1000 bản ghi để tối ưu tốc độ
  let insertedAttendanceCount = 0;
  const chunkSize = 1000;
  for (let i = 0; i < attendanceBatch.length; i += chunkSize) {
    const chunk = attendanceBatch.slice(i, i + chunkSize);
    const res = await prisma.attendance.createMany({
      data: chunk,
      skipDuplicates: true
    });
    insertedAttendanceCount += res.count;
  }
  console.log(`  ✅ Đã đồng bộ ${insertedAttendanceCount} lượt điểm danh chuyên cần theo tiết cho cả 3 khối.`);

  // ============================================================
  // 5️⃣ ĐƠN TỪ SỐ HÓA & LIÊN THÔNG DUYỆT ĐƠN (PETITIONS)
  // ============================================================
  console.log('\n✉️ 5. Tạo Đơn từ số hóa đa khối (Nghỉ phép, Phúc khảo, Miễn giảm học phí)...');

  const student10 = classes.find(c => c.grade === 10)?.students[0];
  const student11 = classes.find(c => c.grade === 11)?.students[0];
  const student12 = classes.find(c => c.grade === 12)?.students[0];
  const mathSub = subjectMapByCode.get('TOAN');
  const litSub = subjectMapByCode.get('VAN');

  const petitionsData = [
    // Khối 10: Đơn xin nghỉ phép đã duyệt -> liên thông chuyên cần
    {
      studentId: student10.id,
      type: 'LEAVE_ABSENCE',
      title: 'Đơn xin nghỉ ốm điều trị tại nhà',
      content: 'Kính gửi Ban Giám Hiệu và GVCN lớp 10A1. Em bị sốt siêu vi, bác sĩ chỉ định nghỉ ngơi 2 ngày từ 16/09 đến 17/09/2026. Em xin phép được nghỉ học và đã nhờ bạn chép bài đầy đủ.',
      startDate: new Date('2026-09-16'),
      endDate: new Date('2026-09-17'),
      reason: 'Sốt siêu vi có giấy khám bệnh',
      status: 'APPROVED',
      approvalRemark: 'GVCN xác nhận giấy khám bệnh hợp lệ. Đã duyệt nghỉ có phép.'
    },
    // Khối 10: Đơn xin phúc khảo điểm Văn
    {
      studentId: student10.id,
      type: 'GRADE_APPEAL',
      title: 'Đơn xin phúc khảo bài kiểm tra giữa kỳ môn Ngữ Văn',
      content: 'Em làm bài tự luận môn Ngữ Văn đạt 7.0 điểm, nhưng đối chiếu đáp án thang điểm thì phần Đọc hiểu em làm đúng hết. Kính đề nghị thầy cô chấm lại giúp em.',
      targetSubjectId: litSub ? litSub.id : null,
      targetSemester: SEMESTER,
      targetGradeColumn: 'gk',
      claimedScore: 8.5,
      status: 'UNDER_REVIEW',
      approvalRemark: 'Đã chuyển đơn đến Tổ trưởng bộ môn Ngữ Văn đối soát bài thi gốc.'
    },
    // Khối 11: Đơn xin miễn giảm học phí diện Hộ nghèo
    {
      studentId: student11.id,
      type: 'TUITION_WAIVER',
      title: 'Đơn xin miễn giảm học phí diện Hộ nghèo năm học 2026 - 2027',
      content: 'Gia đình em thuộc diện hộ nghèo tại địa phương theo Quyết định số 142/QĐ-UBND. Kính mong Nhà trường xem xét miễn giảm học phí học kỳ 1 cho em.',
      status: 'APPROVED',
      approvalRemark: 'Phòng Kế toán đối chiếu Sổ hộ nghèo hợp lệ. Áp dụng miễn giảm 70% học phí.'
    },
    // Khối 12: Đơn phúc khảo điểm Toán -> Được duyệt và cấp mã mở khóa tạm thời 24h
    {
      studentId: student12.id,
      type: 'GRADE_APPEAL',
      title: 'Đơn xin phúc khảo điểm bài thi cuối kỳ môn Toán 12',
      content: 'Thầy cô cộng sót 1 câu hình học không gian (0.5 điểm) trong bài thi tự luận của em. Em xin được phúc khảo.',
      targetSubjectId: mathSub ? mathSub.id : null,
      targetSemester: SEMESTER,
      targetGradeColumn: 'ck',
      claimedScore: 9.0,
      status: 'APPROVED',
      approvalRemark: 'Ban Giám Hiệu đồng ý phúc khảo. Cấp quyền tạm mở khóa sổ điểm 24h cho GVBM Toán sửa điểm.',
      temporaryUnlockToken: crypto.randomBytes(16).toString('hex'),
      unlockTokenExpiresAt: new Date(Date.now() + 24 * 3600000)
    }
  ];

  let createdPetitionCount = 0;
  for (const pet of petitionsData) {
    const existing = await prisma.studentPetition.findFirst({
      where: { studentId: pet.studentId, title: pet.title }
    });
    if (!existing) {
      await prisma.studentPetition.create({ data: pet });
      createdPetitionCount++;
    }
  }
  console.log(`  ✅ Đã tạo ${createdPetitionCount} đơn từ số hóa mẫu với quy trình phê duyệt & liên thông.`);

  // ============================================================
  // 6️⃣ HỒ SƠ CHÍNH SÁCH ƯU TIÊN (STUDENT POLICY)
  // ============================================================
  console.log('\n📜 6. Tạo Hồ sơ Chính sách Ưu tiên & Giấy tờ sắp hết hạn...');
  const policyStudents = [
    { student: student10, type: 'POOR_HOUSEHOLD', name: 'Hộ nghèo chuẩn quốc gia', discount: 0.7, docNum: 'HN-2026-0912' },
    { student: student11, type: 'MARTYR_CHILD', name: 'Con thương binh - liệt sĩ', discount: 1.0, docNum: 'TB-78891' },
    { student: student12, type: 'ETHNIC_MINORITY', name: 'Học sinh dân tộc thiểu số vùng khó khăn', discount: 0.5, docNum: 'DT-11234' }
  ];

  for (const pol of policyStudents) {
    const existing = await prisma.studentPolicy.findFirst({
      where: { studentId: pol.student.id, policyType: pol.type }
    });
    if (!existing) {
      // Đặt hạn hết hạn trong 15 ngày để kích hoạt Cảnh Báo Sớm giấy tờ hết hạn!
      const expiry = new Date(Date.now() + 15 * 86400000);
      await prisma.studentPolicy.create({
        data: {
          studentId: pol.student.id,
          policyType: pol.type,
          policyName: pol.name,
          discountRate: pol.discount,
          documentNumber: pol.docNum,
          documentIssuedDate: new Date('2025-01-15'),
          documentExpiryDate: expiry,
          status: 'ACTIVE',
          notes: 'Đã đối soát hồ sơ gốc tại phòng Văn thư - Kế toán'
        }
      });
    }
  }
  console.log(`  ✅ Đã tạo hồ sơ chính sách ưu tiên và hồ sơ sắp hết hạn cho cả 3 khối.`);

  // ============================================================
  // 7️⃣ KÍCH HOẠT HỆ THỐNG CẢNH BÁO SỚM ĐA KHỐI (EARLY WARNING RUN)
  // ============================================================
  console.log('\n🚨 7. Kích hoạt quét Cảnh Báo Sớm Học Đường (Early Warning System)...');

  // Đặt học sinh có điểm dưới 3.5 ở cả Khối 10, 11, 12 để kích hoạt cảnh báo học tập đa khối
  const atRiskStudent10 = classes.find(c => c.grade === 10)?.students[2];
  const atRiskStudent11 = classes.find(c => c.grade === 11)?.students[2];
  const atRiskStudent12 = classes.find(c => c.grade === 12)?.students[2];

  if (atRiskStudent10 && mathSub) {
    await prisma.subjectGrade.updateMany({
      where: { studentId: atRiskStudent10.id, subjectId: mathSub.id },
      data: { gk: 3.0, avgScore: 3.2 }
    });
  }
  if (atRiskStudent11 && mathSub) {
    await prisma.subjectGrade.updateMany({
      where: { studentId: atRiskStudent11.id, subjectId: mathSub.id },
      data: { gk: 2.8, avgScore: 3.0 }
    });
  }
  if (atRiskStudent12 && mathSub) {
    await prisma.subjectGrade.updateMany({
      where: { studentId: atRiskStudent12.id, subjectId: mathSub.id },
      data: { gk: 2.5, avgScore: 2.9 }
    });
  }

  const alertResults = await EarlyWarningService.runFullScan();
  console.log(`  ✅ Kết quả quét cảnh báo tự động:`);
  console.log(`     - ⚠️ Cảnh báo Chuyên cần (vắng học không phép): ${alertResults.attendanceAlerts} học sinh`);
  console.log(`     - 📉 Cảnh báo Học tập sa sút (ĐTB dưới 3.5): ${alertResults.academicAlerts} học sinh`);
  console.log(`     - 📑 Cảnh báo Giấy tờ ưu tiên sắp hết hạn: ${alertResults.documentAlerts} hồ sơ`);

  const totalAlertsInDb = await prisma.academicAlert.count();
  console.log(`  📊 Tổng số cảnh báo đang hoạt động trong hệ thống: ${totalAlertsInDb}`);

  console.log('\n================================================================');
  console.log('🎉 HOÀN TẤT TẠO DỮ LIỆU & LIÊN KẾT LUỒNG DỮ LIỆU ĐA KHỐI THÀNH CÔNG!');
  console.log('================================================================');
}

seedMultiGradeFlow()
  .catch(err => {
    console.error('❌ Lỗi tạo dữ liệu đa khối:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
