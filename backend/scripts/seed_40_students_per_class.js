import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';
import { initDefaultUsers } from '../utils/initDefaultUsers.js';
import { seedRbacScopeData } from '../utils/seedRbacScope.js';

const ACADEMIC_YEAR = '2026-2027';
const SEMESTER = 'HK1_2026';
const TARGET_STUDENTS_PER_CLASS = 40;
const DEFAULT_STUDENT_PASSWORD = '1111';

const HO_LIST = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Đoàn', 'Lâm', 'Trịnh'];
const DEM_NAM = ['Văn', 'Đức', 'Hữu', 'Minh', 'Quang', 'Quốc', 'Tiến', 'Thành', 'Tuấn', 'Thanh', 'Đình', 'Gia', 'Hoàng'];
const DEM_NU = ['Thị', 'Ngọc', 'Thu', 'Thảo', 'Phương', 'Bích', 'Quỳnh', 'Mỹ', 'Thùy', 'Mai', 'Ánh', 'Hải', 'Diễm'];
const TEN_NAM = ['An', 'Bình', 'Cường', 'Dũng', 'Đạt', 'Hải', 'Hiếu', 'Huy', 'Hùng', 'Khoa', 'Kiệt', 'Long', 'Minh', 'Nam', 'Nghĩa', 'Phúc', 'Quân', 'Sang', 'Thắng', 'Tùng', 'Việt', 'Vinh'];
const TEN_NU = ['Anh', 'Châu', 'Dung', 'Hà', 'Hằng', 'Hoa', 'Hương', 'Lan', 'Linh', 'Mai', 'My', 'Nga', 'Ngân', 'Ngọc', 'Nhi', 'Như', 'Quyên', 'Thảo', 'Trang', 'Trâm', 'Tuyết', 'Uyên', 'Vy', 'Yến'];

// 7 Lớp chuẩn tối thiểu của trường
const BASELINE_CLASSES = [
  { className: '10A1', grade: 10, teacherCode: 'GV001' },
  { className: '10A2', grade: 10, teacherCode: 'GV002' },
  { className: '10A3', grade: 10, teacherCode: 'GV003' },
  { className: '11A1', grade: 11, teacherCode: 'GV004' },
  { className: '11A2', grade: 11, teacherCode: 'GV005' },
  { className: '12A1', grade: 12, teacherCode: 'GV006' },
  { className: '12A2', grade: 12, teacherCode: 'GV007' }
];

function generateRandomStudent(index, grade) {
  const isMale = index % 2 === 0;
  const ho = HO_LIST[index % HO_LIST.length];
  const dem = isMale 
    ? DEM_NAM[Math.floor((index / 2) % DEM_NAM.length)]
    : DEM_NU[Math.floor((index / 2) % DEM_NU.length)];
  const ten = isMale 
    ? TEN_NAM[index % TEN_NAM.length]
    : TEN_NU[index % TEN_NU.length];
  const fullName = `${ho} ${dem} ${ten}`;

  const parentHo = ho;
  const parentDem = isMale ? 'Văn' : 'Đình';
  const parentTen = TEN_NAM[(index + 3) % TEN_NAM.length];
  const parentName = `${parentHo} ${parentDem} ${parentTen}`;

  const birthYear = grade === 10 ? 2010 : grade === 11 ? 2009 : 2008;
  const birthMonth = String((index % 12) + 1).padStart(2, '0');
  const birthDay = String((index % 28) + 1).padStart(2, '0');

  const paddedNum = String(index).padStart(3, '0');
  const studentCode = `HS${paddedNum}`;

  return {
    studentCode,
    fullName,
    gender: isMale ? 'Nam' : 'Nữ',
    dateOfBirth: new Date(`${birthYear}-${birthMonth}-${birthDay}`),
    phone: `091${String(1000000 + index).slice(1)}`,
    parentName,
    parentPhone: `098${String(1000000 + index).slice(1)}`,
    username: studentCode.toLowerCase(),
    email: `${studentCode.toLowerCase()}@school.edu.vn`
  };
}

async function run() {
  console.log('🚀 BẮT ĐẦU TIẾN TRÌNH BỔ SUNG HỌC SINH (MỤC TIÊU 40 EM/LỚP)...');
  console.log(`📌 Quy ước mật khẩu mặc định: "${DEFAULT_STUDENT_PASSWORD}"\n`);

  await initDefaultUsers();
  await seedRbacScopeData();

  const studentRole = await prisma.role.findUnique({ where: { name: 'student' } });
  const studentPassHash = await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, 10);

  // 1. Đảm bảo 7 lớp cơ bản luôn tồn tại
  console.log('🏫 1. Kiểm tra và đảm bảo các lớp học chuẩn...');
  for (const c of BASELINE_CLASSES) {
    let teacher = null;
    if (c.teacherCode) {
      teacher = await prisma.teacher.findFirst({ where: { teacherCode: c.teacherCode } });
    }

    await prisma.class.upsert({
      where: { className: c.className },
      update: {
        grade: c.grade,
        academicYear: ACADEMIC_YEAR,
        status: 'active'
      },
      create: {
        className: c.className,
        grade: c.grade,
        academicYear: ACADEMIC_YEAR,
        homeroomTeacherId: teacher ? teacher.id : null,
        status: 'active'
      }
    });
  }

  // 2. Quét TẤT CẢ các lớp học hiện có trong hệ thống
  const allClasses = await prisma.class.findMany({
    include: {
      students: true,
      homeroomTeacher: true
    },
    orderBy: [
      { grade: 'asc' },
      { className: 'asc' }
    ]
  });

  console.log(`📋 Tìm thấy tổng cộng ${allClasses.length} lớp học trong cơ sở dữ liệu:`);
  for (const c of allClasses) {
    console.log(`   - Lớp ${c.className} (Khối ${c.grade}): hiện có ${c.students.length} học sinh`);
  }

  // 3. Tìm mã số học sinh lớn nhất hiện tại (HSxxx) để sinh tiếp không bị trùng
  const existingStudents = await prisma.student.findMany({
    select: { studentCode: true }
  });

  let maxCodeNumber = 0;
  for (const s of existingStudents) {
    const match = (s.studentCode || '').match(/^HS(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxCodeNumber) {
        maxCodeNumber = num;
      }
    }
  }
  console.log(`\n🔢 Mã học sinh lớn nhất hiện có: HS${String(maxCodeNumber).padStart(3, '0')}`);

  let currentCodeSequence = maxCodeNumber + 1;
  const newlyCreatedStudents = [];
  const allEnrolledStudents = [];

  // 4. Bổ sung học sinh cho từng lớp nếu chưa đủ TARGET_STUDENTS_PER_CLASS (40)
  console.log('\n🎓 4. Tiến hành bổ sung học sinh để mỗi lớp đạt đủ 40 em...');
  for (const cls of allClasses) {
    const currentCount = cls.students.length;
    allEnrolledStudents.push(...cls.students);

    if (currentCount >= TARGET_STUDENTS_PER_CLASS) {
      console.log(`  ✅ Lớp ${cls.className}: Đã có ${currentCount} học sinh (đạt chuẩn ≥ ${TARGET_STUDENTS_PER_CLASS}), giữ nguyên.`);
      continue;
    }

    const needed = TARGET_STUDENTS_PER_CLASS - currentCount;
    console.log(`  ➕ Lớp ${cls.className}: Đang có ${currentCount} em, bổ sung thêm ${needed} em...`);

    for (let i = 1; i <= needed; i++) {
      const studentData = generateRandomStudent(currentCodeSequence, cls.grade || 10);

      // Tạo/Cập nhật User
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: studentData.username },
            { email: studentData.email }
          ]
        }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            username: studentData.username,
            email: studentData.email,
            password: studentPassHash,
            role: 'student',
            status: 'active'
          }
        });
        if (studentRole) {
          await prisma.userRole.create({
            data: { userId: user.id, roleId: studentRole.id }
          });
        }
      } else {
        // Đảm bảo mật khẩu luôn là DEFAULT_STUDENT_PASSWORD
        await prisma.user.update({
          where: { id: user.id },
          data: { password: studentPassHash }
        });
      }

      // Tạo/Cập nhật Student
      const student = await prisma.student.upsert({
        where: { studentCode: studentData.studentCode },
        update: {
          fullName: studentData.fullName,
          gender: studentData.gender,
          dateOfBirth: studentData.dateOfBirth,
          phone: studentData.phone,
          parentName: studentData.parentName,
          parentPhone: studentData.parentPhone,
          classId: cls.id,
          userId: user.id
        },
        create: {
          userId: user.id,
          studentCode: studentData.studentCode,
          fullName: studentData.fullName,
          gender: studentData.gender,
          dateOfBirth: studentData.dateOfBirth,
          phone: studentData.phone,
          parentName: studentData.parentName,
          parentPhone: studentData.parentPhone,
          classId: cls.id
        }
      });

      newlyCreatedStudents.push({ ...student, className: cls.className });
      allEnrolledStudents.push(student);
      currentCodeSequence++;
    }
    console.log(`  👉 Đã bổ sung đủ 40 học sinh cho lớp ${cls.className}!`);
  }

  console.log(`\n🎉 Đã tạo mới thành công: ${newlyCreatedStudents.length} học sinh.`);

  // 5. Cập nhật Bảng Điểm mẫu HK1 cho học sinh chưa có điểm
  console.log('\n📊 5. Kiểm tra và đồng bộ Bảng Điểm mẫu HK1 cho học sinh...');
  const allCurrentStudents = await prisma.student.findMany({
    where: { classId: { not: null } }
  });

  const baseScores = [
    { math: 8.5, literature: 8.0, english: 9.0, physics: 8.5, chemistry: 7.5, it: 9.5 },
    { math: 9.0, literature: 8.5, english: 8.5, physics: 9.0, chemistry: 8.5, it: 9.0 },
    { math: 7.0, literature: 7.5, english: 6.5, physics: 7.0, chemistry: 6.5, it: 8.0 },
    { math: 6.5, literature: 7.0, english: 7.0, physics: 6.0, chemistry: 6.0, it: 7.5 },
    { math: 8.0, literature: 7.5, english: 8.0, physics: 8.0, chemistry: 7.5, it: 8.5 },
    { math: 9.5, literature: 9.0, english: 9.5, physics: 9.5, chemistry: 9.0, it: 10.0 },
    { math: 5.5, literature: 6.0, english: 6.0, physics: 5.5, chemistry: 5.0, it: 7.0 },
    { math: 7.5, literature: 8.0, english: 7.5, physics: 8.0, chemistry: 7.0, it: 8.5 }
  ];

  let syncedGradesCount = 0;
  for (let i = 0; i < allCurrentStudents.length; i++) {
    const student = allCurrentStudents[i];
    const scores = baseScores[i % baseScores.length];

    const existingGrade = await prisma.grade.findUnique({
      where: {
        studentId_classId_semester: {
          studentId: student.id,
          classId: student.classId,
          semester: SEMESTER
        }
      }
    });

    if (!existingGrade) {
      await prisma.grade.create({
        data: {
          studentId: student.id,
          classId: student.classId,
          semester: SEMESTER,
          status: 'locked',
          ...scores
        }
      });
      syncedGradesCount++;
    }
  }
  console.log(`  ✅ Đã đồng bộ điểm HK1 (thêm mới cho ${syncedGradesCount} học sinh chưa có điểm).`);

  // 6. Cập nhật Lịch sử Điểm danh 5 ngày gần nhất cho học sinh
  console.log('\n📝 6. Kiểm tra và đồng bộ Điểm danh 5 ngày gần nhất...');
  const dates = [
    new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    new Date()
  ];

  let attendanceCreatedCount = 0;
  for (const d of dates) {
    d.setHours(0, 0, 0, 0);
    for (let i = 0; i < allCurrentStudents.length; i++) {
      const student = allCurrentStudents[i];

      let status = 'present';
      let note = '';
      if (i % 11 === 0) {
        status = 'late';
        note = 'Đến muộn 15 phút';
      } else if (i % 17 === 0) {
        status = 'excused';
        note = 'Có đơn xin phép';
      }

      const existingAtt = await prisma.attendance.findFirst({
        where: {
          studentId: student.id,
          classId: student.classId,
          date: d
        }
      });

      if (!existingAtt) {
        await prisma.attendance.create({
          data: {
            studentId: student.id,
            classId: student.classId,
            date: d,
            session: 'morning',
            periodNumber: 1,
            status,
            note
          }
        });
        attendanceCreatedCount++;
      }
    }
  }
  console.log(`  ✅ Đã điểm danh 5 ngày (thêm mới ${attendanceCreatedCount} bản ghi điểm danh).`);

  // 7. Gán Hóa đơn Học phí cho học sinh
  console.log('\n💰 7. Kiểm tra và gán Hóa đơn Học phí cho học sinh...');
  const feeProfiles = await prisma.feeProfile.findMany();
  let createdBillsCount = 0;

  for (const profile of feeProfiles) {
    for (let i = 0; i < allCurrentStudents.length; i++) {
      const student = allCurrentStudents[i];
      const isPaid = (i % 3 !== 0);

      const existingBill = await prisma.feeBill.findFirst({
        where: {
          feeProfileId: profile.id,
          studentId: student.id
        }
      });

      if (!existingBill) {
        await prisma.feeBill.create({
          data: {
            feeProfileId: profile.id,
            studentId: student.id,
            status: isPaid ? 'paid' : 'unpaid',
            paidAt: isPaid ? new Date() : null,
            originalAmount: profile.amount,
            finalAmount: profile.amount
          }
        });
        createdBillsCount++;
      }
    }
    console.log(`  ✅ Khoản thu "${profile.name}": đồng bộ thành công.`);
  }
  console.log(`  ✅ Đã tạo mới ${createdBillsCount} hóa đơn học phí cho học sinh chưa có.`);

  // 8. Thống kê kết quả cuối cùng
  console.log('\n======================================================');
  console.log('🏆 KẾT QUẢ TỔNG KẾT TẤT CẢ CÁC LỚP:');
  const finalClasses = await prisma.class.findMany({
    include: {
      _count: { select: { students: true } }
    },
    orderBy: [
      { grade: 'asc' },
      { className: 'asc' }
    ]
  });

  for (const c of finalClasses) {
    console.log(`  🏫 Lớp ${c.className.padEnd(6)} | Khối ${c.grade} | Sĩ số: ${c._count.students} học sinh`);
  }
  const totalStudents = await prisma.student.count();
  console.log(`\n🎯 Tổng số học sinh toàn trường hiện tại: ${totalStudents} học sinh.`);
  console.log('🔑 Mật khẩu mặc định cho toàn bộ học sinh: 1111');
  console.log('======================================================\n');

  await prisma.$disconnect();
}

run().catch((err) => {
  console.error('❌ Lỗi tiến trình:', err);
  process.exit(1);
});
