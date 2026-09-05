import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';
import { initDefaultUsers } from '../utils/initDefaultUsers.js';
import { seedRbacScopeData } from '../utils/seedRbacScope.js';

const ACADEMIC_YEAR = '2026-2027';
const SEMESTER = 'HK1_2026';

const CLASSES_DATA = [
  { className: '10A1', grade: 10, academicYear: ACADEMIC_YEAR, teacherCode: 'GV001' },
  { className: '10A2', grade: 10, academicYear: ACADEMIC_YEAR, teacherCode: 'GV002' },
  { className: '10A3', grade: 10, academicYear: ACADEMIC_YEAR, teacherCode: 'GV003' },
  { className: '11A1', grade: 11, academicYear: ACADEMIC_YEAR, teacherCode: 'GV004' },
  { className: '11A2', grade: 11, academicYear: ACADEMIC_YEAR, teacherCode: 'GV005' },
  { className: '12A1', grade: 12, academicYear: ACADEMIC_YEAR, teacherCode: 'GV006' },
  { className: '12A2', grade: 12, academicYear: ACADEMIC_YEAR, teacherCode: 'GV007' }
];

const SAMPLE_STUDENTS = [
  // 10A1
  { code: 'HS001', name: 'Trần Học Sinh', gender: 'Nam', dob: '2010-03-15', phone: '0911000001', parentName: 'Trần Văn Phụ Huynh', parentPhone: '0988000001', className: '10A1' },
  { code: 'HS002', name: 'Nguyễn Thị Ánh Tuyết', gender: 'Nữ', dob: '2010-05-20', phone: '0911000002', parentName: 'Nguyễn Văn Hùng', parentPhone: '0988000002', className: '10A1' },
  { code: 'HS003', name: 'Lê Hoàng Nam', gender: 'Nam', dob: '2010-08-11', phone: '0911000003', parentName: 'Lê Văn Minh', parentPhone: '0988000003', className: '10A1' },
  { code: 'HS004', name: 'Phạm Quỳnh Nga', gender: 'Nữ', dob: '2010-11-25', phone: '0911000004', parentName: 'Phạm Đức Thắng', parentPhone: '0988000004', className: '10A1' },
  { code: 'HS005', name: 'Hoàng Quốc Bảo', gender: 'Nam', dob: '2010-01-09', phone: '0911000005', parentName: 'Hoàng Đình Cường', parentPhone: '0988000005', className: '10A1' },
  { code: 'HS006', name: 'Vũ Mai Linh', gender: 'Nữ', dob: '2010-04-14', phone: '0911000006', parentName: 'Vũ Trọng Phụng', parentPhone: '0988000006', className: '10A1' },
  { code: 'HS007', name: 'Đỗ Tiến Dũng', gender: 'Nam', dob: '2010-07-22', phone: '0911000007', parentName: 'Đỗ Văn Thành', parentPhone: '0988000007', className: '10A1' },
  { code: 'HS008', name: 'Bùi Lan Hương', gender: 'Nữ', dob: '2010-09-30', phone: '0911000008', parentName: 'Bùi Đức Long', parentPhone: '0988000008', className: '10A1' },
  
  // 10A2
  { code: 'HS009', name: 'Ngô Gia Huy', gender: 'Nam', dob: '2010-02-18', phone: '0911000009', parentName: 'Ngô Văn Thắng', parentPhone: '0988000009', className: '10A2' },
  { code: 'HS010', name: 'Đặng Thảo Vy', gender: 'Nữ', dob: '2010-06-05', phone: '0911000010', parentName: 'Đặng Đình Khoa', parentPhone: '0988000010', className: '10A2' },
  { code: 'HS011', name: 'Dương Đức Anh', gender: 'Nam', dob: '2010-10-12', phone: '0911000011', parentName: 'Dương Công Minh', parentPhone: '0988000011', className: '10A2' },
  { code: 'HS012', name: 'Lý Mỹ Uyên', gender: 'Nữ', dob: '2010-12-01', phone: '0911000012', parentName: 'Lý Quốc Sư', parentPhone: '0988000012', className: '10A2' },

  // 11A1
  { code: 'HS013', name: 'Phan Minh Khang', gender: 'Nam', dob: '2009-03-10', phone: '0911000013', parentName: 'Phan Văn Trị', parentPhone: '0988000013', className: '11A1' },
  { code: 'HS014', name: 'Trịnh Bích Ngọc', gender: 'Nữ', dob: '2009-07-15', phone: '0911000014', parentName: 'Trịnh Hoài Đức', parentPhone: '0988000014', className: '11A1' },
  { code: 'HS015', name: 'Tô Vĩnh Diện', gender: 'Nam', dob: '2009-09-09', phone: '0911000015', parentName: 'Tô Hiến Thành', parentPhone: '0988000015', className: '11A1' },
  { code: 'HS016', name: 'Võ Thị Sáu', gender: 'Nữ', dob: '2009-11-20', phone: '0911000016', parentName: 'Võ Nguyên Giáp', parentPhone: '0988000016', className: '11A1' },

  // 12A1
  { code: 'HS017', name: 'Lâm Tuấn Kiệt', gender: 'Nam', dob: '2008-01-28', phone: '0911000017', parentName: 'Lâm Quang Ky', parentPhone: '0988000017', className: '12A1' },
  { code: 'HS018', name: 'Đoàn Thu Hà', gender: 'Nữ', dob: '2008-05-14', phone: '0911000018', parentName: 'Đoàn Văn Bơ', parentPhone: '0988000018', className: '12A1' },
  { code: 'HS019', name: 'Cao Bá Quát', gender: 'Nam', dob: '2008-08-08', phone: '0911000019', parentName: 'Cao Thắng', parentPhone: '0988000019', className: '12A1' },
  { code: 'HS020', name: 'Tôn Nữ Diễm My', gender: 'Nữ', dob: '2008-10-31', phone: '0911000020', parentName: 'Tôn Thất Tùng', parentPhone: '0988000020', className: '12A1' }
];

const NOTIFICATIONS_DATA = [
  {
    title: 'Kế hoạch tổ chức sơ kết Học kỳ 1 Năm học 2026 - 2027',
    content: 'Ban Giám Hiệu thông báo toàn thể cán bộ giáo viên và học sinh lịch tổ chức lễ sơ kết Học kỳ 1 vào ngày 15/01/2027 tại Hội trường A. Đề nghị các lớp chuẩn bị báo cáo thi đua đầy đủ.',
    type: 'Thông báo chung'
  },
  {
    title: 'Thông báo nộp học phí và các khoản thu đợt 1',
    content: 'Nhà trường nhắc nhở quý phụ huynh và học sinh hoàn tất đóng học phí và bảo hiểm y tế trước ngày 30/12/2026 qua cổng thanh toán QR hoặc nộp trực tiếp tại phòng Tài vụ.',
    type: 'Học phí'
  },
  {
    title: 'Lịch thi học kỳ 1 chính thức năm học 2026 - 2027',
    content: 'Lịch thi các môn văn hóa tập trung khối 10, 11, 12 sẽ diễn ra từ ngày 20/12 đến 28/12/2026. Học sinh có mặt tại phòng thi trước 15 phút.',
    type: 'Lịch thi'
  },
  {
    title: 'Phát động phong trào Hội khỏe Phù Đổng cấp trường',
    content: 'Tổ Thể dục - QPAN tổ chức giải bóng đá nam, bóng rổ nữ và cầu lông chào mừng ngày thành lập Đoàn 26/3. Các lớp đăng ký danh sách VĐV trước ngày 10/12.',
    type: 'Hoạt động ngoại khóa'
  }
];

const EXAMS_DATA = [
  { examName: 'Thi Cuối Kỳ 1 - Môn Toán', examType: 'Cuối kỳ', subjectName: 'Toán Học', grade: 10, examDate: new Date('2026-12-21'), startTime: '07:30', duration: 90, room: 'Phòng 201 - 204', notes: 'Thi tập trung, tự luận kết hợp trắc nghiệm' },
  { examName: 'Thi Cuối Kỳ 1 - Môn Ngữ Văn', examType: 'Cuối kỳ', subjectName: 'Ngữ Văn', grade: 10, examDate: new Date('2026-12-22'), startTime: '07:30', duration: 90, room: 'Phòng 201 - 204', notes: 'Tự luận 100%' },
  { examName: 'Thi Cuối Kỳ 1 - Môn Tiếng Anh', examType: 'Cuối kỳ', subjectName: 'Tiếng Anh', grade: 10, examDate: new Date('2026-12-23'), startTime: '08:00', duration: 60, room: 'Phòng 201 - 204', notes: 'Trắc nghiệm trên phiếu trả lời' },
  { examName: 'Thi Cuối Kỳ 1 - Môn Vật Lý', examType: 'Cuối kỳ', subjectName: 'Vật Lý', grade: 10, examDate: new Date('2026-12-24'), startTime: '07:30', duration: 45, room: 'Phòng 201 - 204', notes: 'Trắc nghiệm 40 câu' },
  { examName: 'Thi Cuối Kỳ 1 - Môn Hóa Học', examType: 'Cuối kỳ', subjectName: 'Hóa Học', grade: 10, examDate: new Date('2026-12-25'), startTime: '07:30', duration: 45, room: 'Phòng 201 - 204', notes: 'Trắc nghiệm 40 câu' },
  { examName: 'Thi Cuối Kỳ 1 - Môn Tin Học', examType: 'Cuối kỳ', subjectName: 'Tin Học', grade: 10, examDate: new Date('2026-12-26'), startTime: '08:00', duration: 45, room: 'Phòng máy 1, 2', notes: 'Thực hành trên máy tính' }
];

async function seedFullData() {
  console.log('🌱 BẮT ĐẦU TẠO VÀ ĐỒNG BỘ DỮ LIỆU ĐẦY ĐỦ CHO DỰ ÁN...\n');

  // 1. Chạy seed người dùng mặc định & RBAC matrix
  await initDefaultUsers();
  await seedRbacScopeData();

  const studentRole = await prisma.role.findUnique({ where: { name: 'student' } });
  const studentPassHash = await bcrypt.hash('student123', 10);

  // 2. Tạo hoặc đồng bộ các Lớp học (Classes) và phân công GVCN
  console.log('\n🏫 1. Tạo & Đồng bộ Lớp học...');
  const classMap = new Map();

  for (const cData of CLASSES_DATA) {
    let teacher = null;
    if (cData.teacherCode) {
      teacher = await prisma.teacher.findFirst({ where: { teacherCode: cData.teacherCode } });
    }

    const cls = await prisma.class.upsert({
      where: { className: cData.className },
      update: {
        grade: cData.grade,
        academicYear: cData.academicYear,
        homeroomTeacherId: teacher ? teacher.id : null,
        status: 'active'
      },
      create: {
        className: cData.className,
        grade: cData.grade,
        academicYear: cData.academicYear,
        homeroomTeacherId: teacher ? teacher.id : null,
        status: 'active'
      }
    });

    classMap.set(cData.className, cls);
    console.log(`  ✅ Lớp ${cls.className} (Khối ${cls.grade}) - GVCN: ${teacher ? teacher.fullName : 'Chưa phân công'}`);
  }

  // 3. Tạo hoặc đồng bộ Học sinh (Students & Users)
  console.log('\n🎓 2. Tạo & Đồng bộ Danh sách Học sinh...');
  const createdStudents = [];

  for (const sData of SAMPLE_STUDENTS) {
    const targetClass = classMap.get(sData.className);
    const username = sData.code.toLowerCase();
    const email = `${username}@school.edu.vn`;

    let user = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          username,
          email,
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

    const student = await prisma.student.upsert({
      where: { studentCode: sData.code },
      update: {
        fullName: sData.name,
        gender: sData.gender,
        dateOfBirth: new Date(sData.dob),
        phone: sData.phone,
        parentName: sData.parentName,
        parentPhone: sData.parentPhone,
        classId: targetClass ? targetClass.id : null,
        userId: user.id
      },
      create: {
        userId: user.id,
        studentCode: sData.code,
        fullName: sData.name,
        gender: sData.gender,
        dateOfBirth: new Date(sData.dob),
        phone: sData.phone,
        parentName: sData.parentName,
        parentPhone: sData.parentPhone,
        classId: targetClass ? targetClass.id : null
      }
    });

    createdStudents.push(student);
  }
  console.log(`  ✅ Đã đồng bộ ${createdStudents.length} học sinh mẫu.`);

  // 4. Tạo Thời khóa biểu cho lớp 10A1, 10A2, 11A1, 12A1
  console.log('\n📅 3. Tạo Thời Khóa Biểu cho các lớp...');
  const scheduleTemplate = [
    { period: 'Tiết 1 (07:00 - 07:45)', monday: 'Toán Học', tuesday: 'Ngữ Văn', wednesday: 'Vật Lý', thursday: 'Hóa Học', friday: 'Tiếng Anh' },
    { period: 'Tiết 2 (07:50 - 08:35)', monday: 'Toán Học', tuesday: 'Ngữ Văn', wednesday: 'Vật Lý', thursday: 'Hóa Học', friday: 'Tiếng Anh' },
    { period: 'Tiết 3 (08:55 - 09:40)', monday: 'Tiếng Anh', tuesday: 'Tin Học', wednesday: 'Lịch Sử', thursday: 'Sinh Học', friday: 'Toán Học' },
    { period: 'Tiết 4 (09:45 - 10:30)', monday: 'Tiếng Anh', tuesday: 'Tin Học', wednesday: 'Địa Lý', thursday: 'GDCD', friday: 'Ngữ Văn' },
    { period: 'Tiết 5 (10:35 - 11:20)', monday: 'Chào cờ', tuesday: 'Thể dục', wednesday: 'Địa Lý', thursday: 'QPAN', friday: 'Sinh hoạt lớp' }
  ];

  for (const [className, cls] of classMap.entries()) {
    for (const item of scheduleTemplate) {
      await prisma.schedule.upsert({
        where: {
          classId_semester_period: {
            classId: cls.id,
            semester: SEMESTER,
            period: item.period
          }
        },
        update: {
          monday: item.monday,
          tuesday: item.tuesday,
          wednesday: item.wednesday,
          thursday: item.thursday,
          friday: item.friday
        },
        create: {
          classId: cls.id,
          semester: SEMESTER,
          period: item.period,
          monday: item.monday,
          tuesday: item.tuesday,
          wednesday: item.wednesday,
          thursday: item.thursday,
          friday: item.friday
        }
      });
    }
    console.log(`  ✅ Đã nạp thời khóa biểu cho lớp ${className}`);
  }

  // 5. Tạo Bảng Điểm mẫu (Grades)
  console.log('\n📊 4. Nhập Bảng Điểm thực tế cho học sinh...');
  const scoreSamples = [
    { math: 8.5, literature: 8.0, english: 9.0, physics: 8.5, chemistry: 7.5, it: 9.5 },
    { math: 9.0, literature: 8.5, english: 8.5, physics: 9.0, chemistry: 8.5, it: 9.0 },
    { math: 7.0, literature: 7.5, english: 6.5, physics: 7.0, chemistry: 6.5, it: 8.0 },
    { math: 6.5, literature: 7.0, english: 7.0, physics: 6.0, chemistry: 6.0, it: 7.5 },
    { math: 8.0, literature: 7.5, english: 8.0, physics: 8.0, chemistry: 7.5, it: 8.5 },
    { math: 9.5, literature: 9.0, english: 9.5, physics: 9.5, chemistry: 9.0, it: 10.0 }
  ];

  for (let i = 0; i < createdStudents.length; i++) {
    const student = createdStudents[i];
    if (!student.classId) continue;
    const scores = scoreSamples[i % scoreSamples.length];

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
  console.log(`  ✅ Đã cập nhật điểm số cho ${createdStudents.length} học sinh (Trạng thái: Đã khóa & Công bố).`);

  // 6. Tạo Lịch sử Điểm danh trong 5 ngày gần nhất
  console.log('\n📝 5. Tạo Lịch sử Điểm danh Chuyên cần...');
  const dates = [
    new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    new Date()
  ];

  for (const d of dates) {
    d.setHours(0, 0, 0, 0);
    for (let i = 0; i < createdStudents.length; i++) {
      const student = createdStudents[i];
      if (!student.classId) continue;

      let status = 'present';
      let note = '';
      if (i % 7 === 0) {
        status = 'late';
        note = 'Đến lớp trễ 10 phút';
      } else if (i % 13 === 0) {
        status = 'excused';
        note = 'Có đơn xin phép của phụ huynh';
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
  console.log(`  ✅ Đã tạo dữ liệu điểm danh 5 ngày gần nhất.`);

  // 7. Tạo Đợt thu học phí & Gán phiếu thu (Fee Profiles & Fee Bills)
  console.log('\n💰 6. Tạo Khoản thu Học phí & Hóa đơn...');
  const feeProfilesData = [
    { name: 'Học phí Học kỳ 1 (2026 - 2027)', amount: 3500000, academicYear: ACADEMIC_YEAR, semester: 'HK1', targetGrades: [10, 11, 12] },
    { name: 'Bảo hiểm Y tế & Thân thể học sinh', amount: 850000, academicYear: ACADEMIC_YEAR, semester: 'HK1', targetGrades: [10, 11, 12] },
    { name: 'Quỹ hoạt động Ngoại khóa & Tin học', amount: 650000, academicYear: ACADEMIC_YEAR, semester: 'HK1', targetGrades: [10, 11, 12] }
  ];

  for (const fpData of feeProfilesData) {
    let profile = await prisma.feeProfile.findFirst({
      where: { name: fpData.name, academicYear: fpData.academicYear, semester: fpData.semester }
    });

    if (!profile) {
      profile = await prisma.feeProfile.create({
        data: fpData
      });
    }

    // Gán hóa đơn cho học sinh
    for (let i = 0; i < createdStudents.length; i++) {
      const student = createdStudents[i];
      const isPaid = i % 2 === 0; // Một nửa đã đóng, một nửa chưa đóng

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
    console.log(`  ✅ Đợt thu "${fpData.name}": Đã gán cho ${createdStudents.length} học sinh.`);
  }

  // 8. Tạo Lịch thi (Exam Schedules)
  console.log('\n📝 7. Tạo Lịch thi học kỳ...');
  for (const exam of EXAMS_DATA) {
    const existing = await prisma.examSchedule.findFirst({
      where: { examName: exam.examName, grade: exam.grade, academicYear: ACADEMIC_YEAR }
    });

    if (!existing) {
      await prisma.examSchedule.create({
        data: {
          ...exam,
          academicYear: ACADEMIC_YEAR,
          semester: 'HK1'
        }
      });
    }
  }
  console.log(`  ✅ Đã tạo ${EXAMS_DATA.length} môn thi học kỳ.`);

  // 9. Tạo Thông báo (Notifications)
  console.log('\n📢 8. Tạo Thông báo Nhà trường...');
  const adminUser = await prisma.user.findFirst({ where: { username: 'admin' } });

  for (const notif of NOTIFICATIONS_DATA) {
    const existing = await prisma.notification.findFirst({
      where: { title: notif.title }
    });
    if (!existing) {
      await prisma.notification.create({
        data: {
          ...notif,
          createdById: adminUser ? adminUser.id : null
        }
      });
    }
  }
  console.log(`  ✅ Đã tạo ${NOTIFICATIONS_DATA.length} thông báo.`);

  // 10. Tạo Cấu hình Hệ thống (System Settings)
  console.log('\n⚙️ 9. Đồng bộ Cấu hình Trường học...');
  await prisma.systemSetting.upsert({
    where: { id: 'default_setting' },
    update: {
      schoolName: 'Trường THPT TTLN',
      schoolCode: 'THPT-TTLN',
      academicYear: ACADEMIC_YEAR,
      currentSemester: SEMESTER,
      isGradingLocked: false,
      principalName: 'ThS. Nguyễn Văn Quản'
    },
    create: {
      id: 'default_setting',
      schoolName: 'Trường THPT TTLN',
      schoolCode: 'THPT-TTLN',
      academicYear: ACADEMIC_YEAR,
      currentSemester: SEMESTER,
      isGradingLocked: false,
      principalName: 'ThS. Nguyễn Văn Quản'
    }
  });
  console.log('  ✅ Cấu hình trường học đã được lưu.');

  console.log('\n🎉 HOÀN TẤT TẠO VÀ ĐỒNG BỘ DỮ LIỆU ĐẦY ĐỦ 100%!');
  await prisma.$disconnect();
}

seedFullData().catch((err) => {
  console.error('❌ Lỗi seed dữ liệu:', err);
  process.exit(1);
});
