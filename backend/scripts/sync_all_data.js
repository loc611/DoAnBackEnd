import prisma from '../prismaClient.js';
import { 
  calculateSubjectSemesterAverage, 
  evaluateSemesterSummary, 
  roundScore 
} from '../utils/gradeCalculator.js';
import EarlyWarningService from '../services/earlyWarningService.js';

const ACADEMIC_YEAR = '2025-2026';
const SEMESTER = 'HK1_2026';

async function syncAllData() {
  console.log('🚀 BẮT ĐẦU ĐỒNG BỘ TOÀN DIỆN DỮ LIỆU CÁC PHÂN HỆ...\n');

  // 1. Đồng bộ Niên khóa & Cửa sổ nhập điểm
  console.log('1️⃣ Kiểm tra & Đồng bộ Niên khóa (SchoolYear)...');
  let schoolYear = await prisma.schoolYear.findFirst({
    where: { code: ACADEMIC_YEAR }
  });

  if (!schoolYear) {
    schoolYear = await prisma.schoolYear.create({
      data: {
        code: ACADEMIC_YEAR,
        name: `Năm học ${ACADEMIC_YEAR.replace('-', ' - ')}`,
        startDate: new Date('2025-09-05'),
        endDate: new Date('2026-05-31'),
        isCurrent: true
      }
    });
  } else if (!schoolYear.isCurrent) {
    await prisma.schoolYear.update({
      where: { id: schoolYear.id },
      data: { isCurrent: true }
    });
  }
  console.log(`  ✅ Niên khóa hiện tại: ${schoolYear.name} (ID: ${schoolYear.id})`);

  // Đảm bảo GradingWindow mở
  await prisma.gradingWindow.upsert({
    where: {
      schoolYearId_semester: {
        schoolYearId: schoolYear.id,
        semester: 'HK1'
      }
    },
    update: { status: 'open' },
    create: {
      schoolYearId: schoolYear.id,
      semester: 'HK1',
      status: 'open',
      notes: 'Cửa sổ nhập điểm Học kỳ 1'
    }
  });

  // 2. Đồng bộ Phân công Giáo viên chủ nhiệm (HomeroomAssignment)
  console.log('\n2️⃣ Đồng bộ Phân công Giáo viên Chủ nhiệm (HomeroomAssignment)...');
  const classes = await prisma.class.findMany({
    include: { homeroomTeacher: true }
  });

  let homeroomSyncCount = 0;
  for (const cls of classes) {
    if (cls.homeroomTeacherId) {
      await prisma.homeroomAssignment.upsert({
        where: {
          classId_schoolYearId: {
            classId: cls.id,
            schoolYearId: schoolYear.id
          }
        },
        update: { teacherId: cls.homeroomTeacherId },
        create: {
          classId: cls.id,
          schoolYearId: schoolYear.id,
          teacherId: cls.homeroomTeacherId
        }
      });
      homeroomSyncCount++;
    }
  }
  console.log(`  ✅ Đã đồng bộ ${homeroomSyncCount} phân công GVCN.`);

  // 3. Đồng bộ Phân công Giảng dạy (TeacherAssignment)
  console.log('\n3️⃣ Đồng bộ Phân công Giảng dạy bộ môn (TeacherAssignment)...');
  const subjects = await prisma.subject.findMany();
  const teachers = await prisma.teacher.findMany({
    orderBy: { teacherCode: 'asc' }
  });

  // Bản đồ môn học tương ứng giáo viên
  // GV001: Toán, GV002: Văn, GV003: Anh, GV004: Lý, GV005: Hóa, GV006: Sinh, GV007: Sử, GV008: Địa, GV009: Tin, GV010: GDCD, GV011: Thể dục
  const subjectCodeTeacherMap = {
    'TOAN': 'GV001',
    'VAN': 'GV002',
    'ANH': 'GV003',
    'VATLY': 'GV004',
    'HOAHOC': 'GV005',
    'SINHHOC': 'GV006',
    'LICHSU': 'GV007',
    'DIALY': 'GV008',
    'TINHOC': 'GV009',
    'GDCD': 'GV010',
    'THEDUC': 'GV011',
    'QPAN': 'GV011',
    'AMNHAC': 'GV002'
  };

  const teacherMapByCode = new Map();
  teachers.forEach(t => teacherMapByCode.set(t.teacherCode.toUpperCase(), t));

  let assignmentCount = 0;
  for (const cls of classes) {
    for (const sub of subjects) {
      const code = sub.subjectCode.toUpperCase();
      let assignedCode = subjectCodeTeacherMap[code] || 'GV001';
      let teacher = teacherMapByCode.get(assignedCode) || teachers[0];

      if (teacher) {
        await prisma.teacherAssignment.upsert({
          where: {
            teacherId_classId_subjectId_schoolYearId_semester: {
              teacherId: teacher.id,
              classId: cls.id,
              subjectId: sub.id,
              schoolYearId: schoolYear.id,
              semester: 'All'
            }
          },
          update: { periodsPerWeek: sub.periodsPerWeek || 2 },
          create: {
            teacherId: teacher.id,
            classId: cls.id,
            subjectId: sub.id,
            schoolYearId: schoolYear.id,
            semester: 'All',
            periodsPerWeek: sub.periodsPerWeek || 2
          }
        });
        assignmentCount++;
      }
    }
  }
  console.log(`  ✅ Đã tạo & cập nhật ${assignmentCount} phân công giảng dạy cho ${classes.length} lớp học.`);

  // 4. Đồng bộ Bảng điểm môn học chi tiết TT22 (SubjectGrade) & Bảng tổng hợp (Grade)
  console.log('\n4️⃣ Đồng bộ Bảng điểm chi tiết môn học (SubjectGrade) & ĐTB Học kỳ (Grade)...');
  const students = await prisma.student.findMany({
    include: {
      grades: { where: { semester: SEMESTER } },
      class: true
    }
  });

  const subjectMap = new Map();
  subjects.forEach(s => subjectMap.set(s.subjectCode.toUpperCase(), s));

  let subjectGradeCount = 0;
  let gradeUpdatedCount = 0;

  for (const student of students) {
    if (!student.classId) continue;

    const legacyGrade = student.grades.length > 0 ? student.grades[0] : null;

    // Lấy điểm cơ sở từ Grade cũ
    const baseScores = {
      'TOAN': legacyGrade?.math && legacyGrade.math > 0 ? legacyGrade.math : 8.0,
      'VAN': legacyGrade?.literature && legacyGrade.literature > 0 ? legacyGrade.literature : 7.5,
      'ANH': legacyGrade?.english && legacyGrade.english > 0 ? legacyGrade.english : 8.5,
      'VATLY': legacyGrade?.physics && legacyGrade.physics > 0 ? legacyGrade.physics : 7.5,
      'HOAHOC': legacyGrade?.chemistry && legacyGrade.chemistry > 0 ? legacyGrade.chemistry : 8.0,
      'TINHOC': legacyGrade?.it && legacyGrade.it > 0 ? legacyGrade.it : 9.0,
      'SINHHOC': +(Math.min(10, Math.max(5, (legacyGrade?.chemistry || 7.5) + 0.2))).toFixed(1),
      'LICHSU': +(Math.min(10, Math.max(5, (legacyGrade?.literature || 7.5) + 0.3))).toFixed(1),
      'DIALY': +(Math.min(10, Math.max(5, (legacyGrade?.literature || 7.5) + 0.1))).toFixed(1),
      'GDCD': 8.5
    };

    const createdSubGrades = [];

    for (const sub of subjects) {
      const code = sub.subjectCode.toUpperCase();
      const isFeedback = sub.type === 'Tự chọn' || code === 'THEDUC' || code === 'QPAN' || code === 'AMNHAC';

      let tx1 = null, tx2 = null, tx3 = null, tx4 = null, gk = null, ck = null, avgScore = null, feedbackResult = null;
      const targetTeacherCode = subjectCodeTeacherMap[code] || 'GV001';
      const assignedTeacher = teacherMapByCode.get(targetTeacherCode) || teachers[0];

      if (isFeedback) {
        feedbackResult = 'Đ';
      } else {
        const base = baseScores[code] || 7.5;
        tx1 = +(Math.min(10, Math.max(3, base + (student.studentCode.charCodeAt(student.studentCode.length - 1) % 5 - 2) * 0.2))).toFixed(1);
        tx2 = +(Math.min(10, Math.max(3, base + 0.3))).toFixed(1);
        gk = +(Math.min(10, Math.max(3, base))).toFixed(1);
        ck = +(Math.min(10, Math.max(3, base + 0.2))).toFixed(1);

        const calc = calculateSubjectSemesterAverage({
          regularScores: [tx1, tx2],
          midtermScore: gk,
          finalScore: ck,
          assessmentType: 'score'
        });
        avgScore = calc.avgScore;
      }

      const sg = await prisma.subjectGrade.upsert({
        where: {
          studentId_subjectId_classId_semester: {
            studentId: student.id,
            subjectId: sub.id,
            classId: student.classId,
            semester: SEMESTER
          }
        },
        update: {
          assessmentType: isFeedback ? 'feedback' : 'score',
          tx1, tx2, tx3, tx4, gk, ck, avgScore, feedbackResult,
          status: 'locked',
          teacherId: assignedTeacher ? assignedTeacher.id : null,
          schoolYearId: schoolYear.id
        },
        create: {
          studentId: student.id,
          subjectId: sub.id,
          classId: student.classId,
          semester: SEMESTER,
          schoolYearId: schoolYear.id,
          assessmentType: isFeedback ? 'feedback' : 'score',
          tx1, tx2, tx3, tx4, gk, ck, avgScore, feedbackResult,
          status: 'locked',
          teacherId: assignedTeacher ? assignedTeacher.id : null
        }
      });

      createdSubGrades.push(sg);
      subjectGradeCount++;
    }

    // Tính toán ĐTB học kỳ, Xếp loại học lực và Danh hiệu thi đua theo Thông tư 22
    const conduct = legacyGrade?.conductScore || 'Tốt';
    const evaluation = evaluateSemesterSummary(createdSubGrades, conduct);

    await prisma.grade.upsert({
      where: {
        studentId_classId_semester: {
          studentId: student.id,
          classId: student.classId,
          semester: SEMESTER
        }
      },
      update: {
        overallAvgScore: evaluation.overallAvg,
        conductScore: conduct,
        academicRank: evaluation.academicRank,
        titleAwarded: evaluation.titleAwarded,
        status: 'locked',
        schoolYearId: schoolYear.id
      },
      create: {
        studentId: student.id,
        classId: student.classId,
        semester: SEMESTER,
        schoolYearId: schoolYear.id,
        overallAvgScore: evaluation.overallAvg,
        conductScore: conduct,
        academicRank: evaluation.academicRank,
        titleAwarded: evaluation.titleAwarded,
        status: 'locked',
        math: baseScores['TOAN'] || 8.0,
        literature: baseScores['VAN'] || 7.5,
        english: baseScores['ANH'] || 8.5,
        physics: baseScores['VATLY'] || 7.5,
        chemistry: baseScores['HOAHOC'] || 8.0,
        it: baseScores['TINHOC'] || 9.0
      }
    });

    gradeUpdatedCount++;
  }

  console.log(`  ✅ Đã đồng bộ ${subjectGradeCount} bản ghi SubjectGrade.`);
  console.log(`  ✅ Đã cập nhật ĐTB (overallAvgScore) & Xếp loại cho ${gradeUpdatedCount} học sinh trong Grade.`);

  // 5. Chạy quét Cảnh Báo Sớm Học Đường (Early Warning System)
  console.log('\n5️⃣ Kích hoạt Quét & Đồng bộ Hệ thống Cảnh Báo Sớm (Early Warning Scan)...');
  const alertScanResults = await EarlyWarningService.runFullScan();
  console.log(`  ✅ Kết quả quét:`);
  console.log(`     - Cảnh báo chuyên cần (Attendance risks): ${alertScanResults.attendanceAlerts}`);
  console.log(`     - Cảnh báo học tập sa sút (Academic risks): ${alertScanResults.academicAlerts}`);
  console.log(`     - Cảnh báo hồ sơ hết hạn (Document expiring): ${alertScanResults.documentAlerts}`);

  console.log('\n🎉 ĐỒNG BỘ TOÀN DIỆN THÀNH CÔNG 100%!');
}

syncAllData()
  .catch(err => {
    console.error('❌ Lỗi khi đồng bộ dữ liệu:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
