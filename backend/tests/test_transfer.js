import prisma from '../prismaClient.js';
import TransferService from '../services/transferService.js';

async function runTests() {
  console.log('🚀 BẮT ĐẦU KIỂM THỬ PHÂN HỆ TIẾP NHẬN HỌC SINH CHUYỂN TRƯỜNG KHỐI 10 & 11\n');
  const createdUserIds = [];
  const createdStudentIds = [];

  try {
    // -------------------------------------------------------------
    // TEST 1: checkCurriculumGap (Xử lý so sánh môn học)
    // -------------------------------------------------------------
    console.log('🧪 Test 1: Kiểm tra hàm checkCurriculumGap...');
    const studentOldSubjects = ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Sinh học'];
    const targetClassSubjects = ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Tin học', 'Công nghệ'];

    const gap = TransferService.checkCurriculumGap(studentOldSubjects, targetClassSubjects);
    console.log('  -> Môn học sinh đã học:', studentOldSubjects);
    console.log('  -> Môn lớp mới yêu cầu:', targetClassSubjects);
    console.log('  -> Môn bị lệch cần thi bổ túc:', gap);

    if (gap.length === 2 && gap.includes('Tin học') && gap.includes('Công nghệ')) {
      console.log('  ✅ Test 1 ĐẠT: Phát hiện chính xác 2 môn lệch ("Tin học", "Công nghệ")\n');
    } else {
      throw new Error(`Test 1 Thất bại: Kết quả gap không khớp: ${JSON.stringify(gap)}`);
    }

    // Lấy hoặc tạo 1 lớp mẫu để gán học sinh
    let sampleClass = await prisma.class.findFirst();
    if (!sampleClass) {
      sampleClass = await prisma.class.create({
        data: {
          className: '10A_TEST',
          grade: 10,
          academicYear: '2026-2027'
        }
      });
    }

    // -------------------------------------------------------------
    // TEST 2: Chuyển trường giữa năm (HK1 trùng môn) -> ACTIVE ngay
    // -------------------------------------------------------------
    console.log('🧪 Test 2: Tiếp nhận chuyển trường giữa năm (không lệch tổ hợp)...');
    const transferPayloadMidYear = {
      studentCode: `HS_TRANS_MID_${Date.now()}`,
      fullName: 'Nguyễn Văn Chuyển Trường Giữa Năm',
      email: `trans_mid_${Date.now()}@school.edu.vn`,
      phone: '0901234567',
      previousSchoolName: 'THPT Lê Quý Đôn',
      previousGradeLevel: 10,
      targetClassId: sampleClass.id,
      reason: 'Gia đình chuyển hộ khẩu giữa năm học',
      studentPreviousSubjects: ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Tin học'],
      targetClassSubjects: ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Tin học'],
      transferredGrades: [
        { subjectName: 'Toán', semester: 'HK1', finalScore: 8.0 },
        { subjectName: 'Ngữ văn', semester: 'HK1', finalScore: 7.0 },
        { subjectName: 'Tiếng Anh', semester: 'HK1', finalScore: 9.0 },
        { subjectName: 'Vật lý', semester: 'HK1', finalScore: 7.5 },
        { subjectName: 'Hóa học', semester: 'HK1', finalScore: 8.5 },
        { subjectName: 'Tin học', semester: 'HK1', finalScore: 9.0 }
      ]
    };

    const midYearResult = await TransferService.admitTransferStudent(transferPayloadMidYear);
    createdUserIds.push(midYearResult.student.userId);
    createdStudentIds.push(midYearResult.student.id);

    console.log('  -> Trạng thái học sinh:', midYearResult.status);
    console.log('  -> Lớp được gán:', midYearResult.student.classId);
    console.log('  -> Ngày nhập học:', midYearResult.student.enrolledAt);
    console.log('  -> Số môn học bạ đã lưu:', midYearResult.transferredGrades.length);

    if (
      midYearResult.status === 'ACTIVE' &&
      midYearResult.student.classId === sampleClass.id &&
      midYearResult.student.enrolledAt !== null &&
      midYearResult.transferredGrades.length === 6
    ) {
      console.log('  ✅ Test 2 ĐẠT: Học sinh được ACTIVE, gán lớp và lưu trọn vẹn điểm học bạ HK1.\n');
    } else {
      throw new Error('Test 2 Thất bại: Thuộc tính học sinh sau tiếp nhận không đúng kỳ vọng');
    }

    // -------------------------------------------------------------
    // TEST 3: Chuyển trường hè lệch tổ hợp môn -> PENDING_MAKEUP_EXAM
    // -------------------------------------------------------------
    console.log('🧪 Test 3: Tiếp nhận chuyển trường hè lệch tổ hợp (Cần thi bổ túc)...');
    const transferPayloadSummerGap = {
      studentCode: `HS_TRANS_GAP_${Date.now()}`,
      fullName: 'Trần Thị Lệch Tổ Hợp',
      email: `trans_gap_${Date.now()}@school.edu.vn`,
      phone: '0912345678',
      previousSchoolName: 'THPT Nguyễn Trãi',
      previousGradeLevel: 11,
      targetClassId: sampleClass.id,
      reason: 'Chuyển từ ban Tự nhiên sang ban Tin học ứng dụng',
      studentPreviousSubjects: ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học'],
      targetClassSubjects: ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Tin học', 'Công nghệ']
    };

    const gapResult = await TransferService.admitTransferStudent(transferPayloadSummerGap);
    createdUserIds.push(gapResult.student.userId);
    createdStudentIds.push(gapResult.student.id);

    console.log('  -> Trạng thái học sinh:', gapResult.status);
    console.log('  -> Lớp học (phải là null vì đang chờ thi):', gapResult.student.classId);
    console.log('  -> Môn thi bổ túc đã sinh:', gapResult.makeupExams.map(m => m.subjectName));

    if (
      gapResult.status === 'PENDING_MAKEUP_EXAM' &&
      gapResult.student.classId === null &&
      gapResult.makeupExams.length === 2
    ) {
      console.log('  ✅ Test 3 ĐẠT: Trạng thái PENDING_MAKEUP_EXAM và đã sinh đúng 2 bài thi bổ túc.\n');
    } else {
      throw new Error('Test 3 Thất bại: Không xử lý đúng trạng thái PENDING_MAKEUP_EXAM');
    }

    // -------------------------------------------------------------
    // TEST 4: Chấm thi bổ túc & Tự động kích hoạt xếp lớp khi đỗ toàn bộ
    // -------------------------------------------------------------
    console.log('🧪 Test 4: Chấm điểm bài thi bổ sung & Kiểm tra Auto-Activation...');
    const [exam1, exam2] = gapResult.makeupExams;

    // Chấm thi môn 1: Đạt 7.5
    console.log(`  -> Chấm môn 1 (${exam1.subjectName}): 7.5 điểm`);
    const gradeExam1 = await TransferService.recordMakeupExamScore({
      examId: exam1.id,
      score: 7.5,
      examinerName: 'Thầy Nguyễn Chấm Thi'
    });
    console.log('     Kết quả sau môn 1 - Tất cả đã đỗ chưa?:', gradeExam1.allPassed, '| Đã kích hoạt chưa?:', gradeExam1.studentActivated);

    if (gradeExam1.allPassed === false && gradeExam1.studentActivated === false) {
      console.log('     ✓ Chính xác: Mới đỗ 1 môn, vẫn giữ trạng thái chờ môn còn lại.');
    } else {
      throw new Error('Test 4 Thất bại: Kích hoạt học sinh quá sớm khi chưa đỗ hết các môn');
    }

    // Chấm thi môn 2: Đạt 6.0 (>= 5.0) -> Hệ thống phải auto-activate
    console.log(`  -> Chấm môn 2 (${exam2.subjectName}): 6.0 điểm`);
    const gradeExam2 = await TransferService.recordMakeupExamScore({
      examId: exam2.id,
      score: 6.0,
      examinerName: 'Cô Lê Chấm Thi'
    });
    console.log('     Kết quả sau môn 2 - Tất cả đã đỗ chưa?:', gradeExam2.allPassed, '| Đã kích hoạt chưa?:', gradeExam2.studentActivated);

    // Truy vấn lại học sinh từ DB Neon
    const activatedStudent = await prisma.student.findUnique({
      where: { id: gapResult.student.id }
    });

    if (
      gradeExam2.studentActivated === true &&
      activatedStudent.status === 'ACTIVE' &&
      activatedStudent.classId === sampleClass.id &&
      activatedStudent.enrolledAt !== null
    ) {
      console.log('  ✅ Test 4 ĐẠT: Sau khi đỗ toàn bộ môn bổ túc, học sinh đã TỰ ĐỘNG CHUYỂN ACTIVE & XẾP LỚP!\n');
    } else {
      throw new Error('Test 4 Thất bại: Học sinh không được tự động kích hoạt sau khi đỗ toàn bộ bài thi');
    }

    // -------------------------------------------------------------
    // TEST 5: Tính ĐTB Cả Năm = (HK1 + 2 * HK2) / 3
    // -------------------------------------------------------------
    console.log('🧪 Test 5: Tính điểm trung bình cả năm (calculateFinalGPA)...');
    // Tạo điểm HK2 trường mới cho học sinh ở Test 2
    const midStudentId = midYearResult.student.id;
    await prisma.grade.create({
      data: {
        studentId: midStudentId,
        classId: sampleClass.id,
        semester: 'HK2_2026',
        math: 9.0,        // HK1: 8.0 -> Cả năm = (8 + 2*9)/3 = 8.67
        literature: 8.0,  // HK1: 7.0 -> Cả năm = (7 + 2*8)/3 = 7.67
        english: 9.0,     // HK1: 9.0 -> Cả năm = (9 + 2*9)/3 = 9.00
        physics: 8.5,     // HK1: 7.5 -> Cả năm = (7.5 + 2*8.5)/3 = 8.17
        chemistry: 9.0,   // HK1: 8.5 -> Cả năm = (8.5 + 2*9)/3 = 8.83
        it: 9.5           // HK1: 9.0 -> Cả năm = (9 + 2*9.5)/3 = 9.33
      }
    });

    const gpaResult = await TransferService.calculateFinalGPA(midStudentId, '2026-2027');
    console.log('  -> ĐTB HK1 (Học bạ trường cũ):', gpaResult.gpaHK1);
    console.log('  -> ĐTB HK2 (Trường mới):', gpaResult.gpaHK2);
    console.log('  -> ĐTB CẢ NĂM:', gpaResult.overallFinalGPA);
    console.log('  -> Xếp loại học lực:', gpaResult.academicPerformance);
    console.log('  -> Chi tiết môn Toán: HK1 =', gpaResult.subjects.find(s => s.subjectKey === 'math')?.hk1Score, 
                ', HK2 =', gpaResult.subjects.find(s => s.subjectKey === 'math')?.hk2Score,
                ', Cả năm =', gpaResult.subjects.find(s => s.subjectKey === 'math')?.fullYearScore);

    const mathScore = gpaResult.subjects.find(s => s.subjectKey === 'math')?.fullYearScore;
    if (mathScore === 8.67 && gpaResult.overallFinalGPA > 0) {
      console.log('  ✅ Test 5 ĐẠT: Công thức (HK1 + 2*HK2)/3 tính toán chính xác tuyệt đối!\n');
    } else {
      throw new Error(`Test 5 Thất bại: Điểm tính ra không khớp: Toán = ${mathScore}`);
    }

    console.log('🎉 TẤT CẢ CÁC BÀI KIỂM THỬ ĐÃ THÀNH CÔNG VƯỢT TRỘI!');
  } catch (error) {
    console.error('❌ LỖI TRONG QUÁ TRÌNH KIỂM THỬ:', error);
    process.exitCode = 1;
  } finally {
    // Dọn dẹp dữ liệu test
    console.log('\n🧹 Đang dọn dẹp dữ liệu kiểm thử test records...');
    for (const sId of createdStudentIds) {
      await prisma.grade.deleteMany({ where: { studentId: sId } }).catch(() => {});
      await prisma.transferredGrade.deleteMany({ where: { studentId: sId } }).catch(() => {});
      await prisma.makeupExam.deleteMany({ where: { studentId: sId } }).catch(() => {});
      await prisma.transferRecord.deleteMany({ where: { studentId: sId } }).catch(() => {});
      await prisma.student.delete({ where: { id: sId } }).catch(() => {});
    }
    for (const uId of createdUserIds) {
      await prisma.userRole.deleteMany({ where: { userId: uId } }).catch(() => {});
      await prisma.user.delete({ where: { id: uId } }).catch(() => {});
    }
    console.log('✅ Đã hoàn tất dọn dẹp dữ liệu.');
    await prisma.$disconnect();
  }
}

runTests();
