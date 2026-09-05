import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';
import { initDefaultUsers } from '../utils/initDefaultUsers.js';
import { seedRbacScopeData } from '../utils/seedRbacScope.js';

const ACADEMIC_YEAR = '2026-2027';
const SEMESTER = 'HK1_2026';

const HO_LIST = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Đoàn', 'Lâm', 'Trịnh'];
const DEM_NAM = ['Văn', 'Đức', 'Hữu', 'Minh', 'Quang', 'Quốc', 'Tiến', 'Thành', 'Tuấn', 'Thanh', 'Đình', 'Gia', 'Hoàng'];
const DEM_NU = ['Thị', 'Ngọc', 'Thu', 'Thảo', 'Phương', 'Bích', 'Quỳnh', 'Mỹ', 'Thùy', 'Mai', 'Ánh', 'Hải', 'Diễm'];
const TEN_NAM = ['An', 'Bình', 'Cường', 'Dũng', 'Đạt', 'Hải', 'Hiếu', 'Huy', 'Hùng', 'Khoa', 'Kiệt', 'Long', 'Minh', 'Nam', 'Nghĩa', 'Phúc', 'Quân', 'Sang', 'Thắng', 'Tùng', 'Việt', 'Vinh'];
const TEN_NU = ['Anh', 'Châu', 'Dung', 'Hà', 'Hằng', 'Hoa', 'Hương', 'Lan', 'Linh', 'Mai', 'My', 'Nga', 'Ngân', 'Ngọc', 'Nhi', 'Như', 'Quyên', 'Thảo', 'Trang', 'Trâm', 'Tuyết', 'Uyên', 'Vy', 'Yến'];

const CLASSES_CONFIG = [
  { className: '10A1', grade: 10, teacherCode: 'GV001' },
  { className: '10A2', grade: 10, teacherCode: 'GV002' },
  { className: '10A3', grade: 10, teacherCode: 'GV003' },
  { className: '11A1', grade: 11, teacherCode: 'GV004' },
  { className: '11A2', grade: 11, teacherCode: 'GV005' },
  { className: '12A1', grade: 12, teacherCode: 'GV006' },
  { className: '12A2', grade: 12, teacherCode: 'GV007' }
];

function generateRandomStudent(index, classConfig) {
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

  const birthYear = classConfig.grade === 10 ? 2010 : classConfig.grade === 11 ? 2009 : 2008;
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
  console.log('🚀 BẮT ĐẦU TẠO DỮ LIỆU 40 HỌC SINH CHO MỖI LỚP (TỔNG CỘNG 280 HỌC SINH)...\n');

  await initDefaultUsers();
  await seedRbacScopeData();

  const studentRole = await prisma.role.findUnique({ where: { name: 'student' } });
  const studentPassHash = await bcrypt.hash('student123', 10);

  // 1. Tạo/Đồng bộ 7 Lớp học
  console.log('🏫 1. Đồng bộ 7 Lớp học...');
  const classRecords = [];
  for (const c of CLASSES_CONFIG) {
    let teacher = null;
    if (c.teacherCode) {
      teacher = await prisma.teacher.findFirst({ where: { teacherCode: c.teacherCode } });
    }

    const cls = await prisma.class.upsert({
      where: { className: c.className },
      update: {
        grade: c.grade,
        academicYear: ACADEMIC_YEAR,
        homeroomTeacherId: teacher ? teacher.id : null,
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
    classRecords.push(cls);
    console.log(`  ✅ Lớp ${cls.className} (Khối ${cls.grade}) - GVCN: ${teacher?.fullName || 'Chưa phân công'}`);
  }

  // 2. Tạo 40 học sinh cho mỗi lớp (tổng cộng 280 học sinh)
  console.log('\n🎓 2. Tạo 40 học sinh cho mỗi lớp (280 học sinh)...');
  let globalStudentIndex = 1;
  const allCreatedStudents = [];

  for (const cls of classRecords) {
    const classConfig = CLASSES_CONFIG.find(c => c.className === cls.className);
    console.log(`  -> Đang tạo 40 học sinh cho lớp ${cls.className}...`);

    for (let i = 1; i <= 40; i++) {
      const studentData = generateRandomStudent(globalStudentIndex, classConfig);

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

      allCreatedStudents.push({ ...student, className: cls.className });
      globalStudentIndex++;
    }
    console.log(`  ✅ Đã tạo xong 40 học sinh cho lớp ${cls.className}`);
  }

  console.log(`\n✨ Tổng cộng đã nạp thành công: ${allCreatedStudents.length} học sinh.`);

  // 3. Nhập Bảng Điểm thực tế cho toàn bộ 280 học sinh
  console.log('\n📊 3. Nhập Bảng Điểm cho toàn bộ 280 học sinh...');
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

  for (let i = 0; i < allCreatedStudents.length; i++) {
    const student = allCreatedStudents[i];
    const scores = baseScores[i % baseScores.length];

    await prisma.grade.upsert({
      where: {
        studentId_classId_semester: {
          studentId: student.id,
          classId: student.classId,
          semester: SEMESTER
        }
      },
      update: {
        status: 'locked',
        ...scores
      },
      create: {
        studentId: student.id,
        classId: student.classId,
        semester: SEMESTER,
        status: 'locked',
        ...scores
      }
    });
  }
  console.log(`  ✅ Đã cập nhật điểm HK1 cho 280 học sinh.`);

  // 4. Tạo Dữ liệu Điểm danh 5 ngày gần nhất cho toàn bộ học sinh
  console.log('\n📝 4. Tạo Lịch sử Điểm danh 5 ngày gần nhất cho 280 học sinh...');
  const dates = [
    new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    new Date()
  ];

  for (const d of dates) {
    d.setHours(0, 0, 0, 0);
    for (let i = 0; i < allCreatedStudents.length; i++) {
      const student = allCreatedStudents[i];

      let status = 'present';
      let note = '';
      if (i % 11 === 0) {
        status = 'late';
        note = 'Đến muộn 15 phút';
      } else if (i % 17 === 0) {
        status = 'excused';
        note = 'Có đơn xin phép';
      }

      await prisma.attendance.upsert({
        where: {
          studentId_classId_date_session: {
            studentId: student.id,
            classId: student.classId,
            date: d,
            session: 'morning'
          }
        },
        update: { status, note },
        create: {
          studentId: student.id,
          classId: student.classId,
          date: d,
          session: 'morning',
          status,
          note
        }
      });
    }
  }
  console.log(`  ✅ Đã hoàn tất điểm danh 5 ngày cho 280 học sinh.`);

  // 5. Gán Hóa đơn Học phí cho toàn bộ 280 học sinh
  console.log('\n💰 5. Gán Hóa đơn Học phí cho toàn bộ 280 học sinh...');
  const feeProfiles = await prisma.feeProfile.findMany();

  for (const profile of feeProfiles) {
    for (let i = 0; i < allCreatedStudents.length; i++) {
      const student = allCreatedStudents[i];
      // Tỷ lệ: 65% đã nộp, 35% còn nợ
      const isPaid = (i % 3 !== 0);

      await prisma.feeBill.upsert({
        where: {
          feeProfileId_studentId: {
            feeProfileId: profile.id,
            studentId: student.id
          }
        },
        update: {
          status: isPaid ? 'paid' : 'unpaid',
          paidAt: isPaid ? new Date() : null
        },
        create: {
          feeProfileId: profile.id,
          studentId: student.id,
          status: isPaid ? 'paid' : 'unpaid',
          paidAt: isPaid ? new Date() : null
        }
      });
    }
    console.log(`  ✅ Gán khoản thu "${profile.name}" cho 280 học sinh.`);
  }

  console.log('\n🎉 HOÀN TẤT NẠP DỮ LIỆU 40 HỌC SINH / LỚP (TỔNG CỘNG 280 HỌC SINH) THÀNH CÔNG 100%!');
  await prisma.$disconnect();
}

run().catch((err) => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
