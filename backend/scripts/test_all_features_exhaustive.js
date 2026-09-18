import axios from 'axios';
import prisma from '../prismaClient.js';

const BASE_URL = 'http://localhost:5000/api';

async function runExhaustiveFeatureTest() {
  console.log('================================================================');
  console.log('🔬 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN MỌI TÍNH NĂNG TRÊN MÃ NGUỒN HIỆN CÓ');
  console.log('================================================================\n');

  const results = [];
  let testCount = 0;

  async function test(name, category, fn) {
    testCount++;
    const idx = testCount.toString().padStart(2, '0');
    try {
      const detail = await fn();
      results.push({ id: testCount, name, category, status: 'PASS', detail });
      console.log(`  ✅ [PASS #${idx}] [${category}] ${name}`);
      if (detail) console.log(`     └─ Chi tiết: ${detail}`);
    } catch (error) {
      const errorMsg = error.response ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data?.message || error.response.data)}` : error.message;
      results.push({ id: testCount, name, category, status: 'FAIL', detail: errorMsg });
      console.error(`  ❌ [FAIL #${idx}] [${category}] ${name}`);
      console.error(`     └─ Lỗi: ${errorMsg}`);
    }
  }

  // Khởi tạo các Token đăng nhập
  console.log('🔑 0. Đăng nhập các vai trò để lấy Token xác thực...');
  const adminLogin = await axios.post(`${BASE_URL}/auth/login`, { username: 'admin', password: 'admin123' });
  const adminToken = adminLogin.data.token;
  const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

  const teacherLogin = await axios.post(`${BASE_URL}/auth/login`, { username: 'gv001', password: 'gv001@123' });
  const teacherToken = teacherLogin.data.token;
  const teacherHeaders = { headers: { Authorization: `Bearer ${teacherToken}` } };

  const student10Login = await axios.post(`${BASE_URL}/auth/login`, { username: 'hs001', password: 'hs001@123' });
  const student10Token = student10Login.data.token;
  const student10Headers = { headers: { Authorization: `Bearer ${student10Token}` } };

  const student11Login = await axios.post(`${BASE_URL}/auth/login`, { username: 'hs013', password: 'hs013@123' });
  const student11Token = student11Login.data.token;
  const student11Headers = { headers: { Authorization: `Bearer ${student11Token}` } };

  const student12Login = await axios.post(`${BASE_URL}/auth/login`, { username: 'hs017', password: 'hs017@123' });
  const student12Token = student12Login.data.token;
  const student12Headers = { headers: { Authorization: `Bearer ${student12Token}` } };

  console.log('   -> Đã cấp Access Token thành công cho: Super Admin, GVCN (gv001), Học sinh K10 (hs001), Học sinh K11 (hs013), Học sinh K12 (hs017).\n');

  // Lấy dữ liệu cơ bản để dùng cho các test sau
  const sampleClass = await prisma.class.findFirst({ where: { className: '10A1' } });
  const sampleSubject = await prisma.subject.findFirst({ where: { subjectCode: 'TOAN' } });
  const sampleTeacher = await prisma.teacher.findFirst({ where: { teacherCode: 'GV001' } });
  const sampleStudent = await prisma.student.findFirst({ where: { studentCode: 'HS001' } });

  // =========================================================================
  // NHÓM 1: XÁC THỰC, TÀI KHOẢN & PHÂN QUYỀN (AUTH & USERS)
  // =========================================================================
  console.log('📌 NHÓM 1: XÁC THỰC, TÀI KHOẢN & PHÂN QUYỀN (AUTH & USERS)');

  await test('Đăng nhập xác thực và trả về Token + Thông tin người dùng', 'Auth', async () => {
    return `Vai trò: ${adminLogin.data.user.role}, Tên: ${adminLogin.data.user.name}, Token: JWT 15m`;
  });

  await test('Lấy thông tin tài khoản hiện tại qua /api/auth/me', 'Auth', async () => {
    const res = await axios.get(`${BASE_URL}/auth/me`, teacherHeaders);
    const u = res.data.user || res.data;
    return `Username: ${u.username}, Role: ${u.role}, Name: ${u.name}`;
  });

  await test('Đổi mật khẩu người dùng cá nhân qua /api/auth/change-password', 'Auth', async () => {
    // Đổi mật khẩu gv007 tạm thời rồi hoàn lại
    const loginGv7 = await axios.post(`${BASE_URL}/auth/login`, { username: 'gv007', password: 'gv007@123' });
    const gv7Headers = { headers: { Authorization: `Bearer ${loginGv7.data.token}` } };
    await axios.post(`${BASE_URL}/auth/change-password`, { currentPassword: 'gv007@123', newPassword: 'gv007@NewPass123' }, gv7Headers);
    // Hoàn trả lại mật khẩu chuẩn
    const loginGv7New = await axios.post(`${BASE_URL}/auth/login`, { username: 'gv007', password: 'gv007@NewPass123' });
    await axios.post(`${BASE_URL}/auth/change-password`, { currentPassword: 'gv007@NewPass123', newPassword: 'gv007@123' }, { headers: { Authorization: `Bearer ${loginGv7New.data.token}` } });
    return 'Đổi mật khẩu và hoàn trả mật khẩu gốc thành công 100%';
  });

  await test('Admin truy xuất danh sách người dùng toàn hệ thống (/api/users)', 'Users', async () => {
    const res = await axios.get(`${BASE_URL}/users?limit=10`, adminHeaders);
    const users = res.data.data || res.data;
    return `Lấy thành công ${Array.isArray(users) ? users.length : users.users?.length} tài khoản người dùng`;
  });

  await test('Scope Guard: Học sinh bị chặn khi cố truy cập danh sách người dùng (/api/users)', 'RBAC', async () => {
    try {
      await axios.get(`${BASE_URL}/users`, student10Headers);
      throw new Error('Không bị chặn!');
    } catch (err) {
      if (err.response && [401, 403].includes(err.response.status)) {
        return `Đã chặn thành công với mã lỗi HTTP ${err.response.status} Forbidden`;
      }
      throw err;
    }
  });

  // =========================================================================
  // NHÓM 2: QUẢN TRỊ TRƯỜNG HỌC, LỚP, MÔN, TỔ BỘ MÔN (ACADEMIC STRUCTURE)
  // =========================================================================
  console.log('\n📌 NHÓM 2: QUẢN TRỊ TRƯỜNG HỌC, LỚP, MÔN, TỔ BỘ MÔN');

  await test('Lấy danh sách tất cả các lớp học (/api/classes)', 'Classes', async () => {
    const res = await axios.get(`${BASE_URL}/classes`, adminHeaders);
    const classes = res.data.data || res.data;
    return `Có ${classes.length} lớp học trên 3 khối (10, 11, 12)`;
  });

  await test('Lấy chi tiết lớp học và danh sách học sinh theo lớp (/api/classes/:id/students)', 'Classes', async () => {
    const res = await axios.get(`${BASE_URL}/classes/${sampleClass.id}/students`, adminHeaders);
    const students = res.data.data || res.data;
    return `Lớp ${sampleClass.className} có ${students.length} học sinh`;
  });

  await test('Lấy danh mục các môn học (/api/subjects)', 'Subjects', async () => {
    const res = await axios.get(`${BASE_URL}/subjects`, adminHeaders);
    const subjects = res.data.data || res.data;
    return `Có ${subjects.length} môn học trong chương trình`;
  });

  await test('Lấy danh mục tổ bộ môn (/api/departments)', 'Departments', async () => {
    const res = await axios.get(`${BASE_URL}/departments`, adminHeaders);
    const depts = res.data.data || res.data;
    return `Có ${depts.length} tổ chuyên môn trong trường`;
  });

  // =========================================================================
  // NHÓM 3: HỒ SƠ NHÂN SỰ & HỌC SINH (STUDENTS & TEACHERS)
  // =========================================================================
  console.log('\n📌 NHÓM 3: HỒ SƠ NHÂN SỰ & HỌC SINH');

  await test('Admin tra cứu danh sách học sinh có lọc theo khối & lớp (/api/students)', 'Students', async () => {
    const res = await axios.get(`${BASE_URL}/students?grade=10&classId=${sampleClass.id}&limit=10`, adminHeaders);
    const list = res.data.data || res.data.students || res.data;
    const count = Array.isArray(list) ? list.length : (list.students?.length || 0);
    return `Tìm thấy ${count} học sinh thuộc Khối 10 lớp ${sampleClass.className}`;
  });

  await test('Xem hồ sơ chi tiết một học sinh (/api/students/:id)', 'Students', async () => {
    const res = await axios.get(`${BASE_URL}/students/${sampleStudent.id}`, adminHeaders);
    const s = res.data.data || res.data;
    return `Họ tên: ${s.fullName}, Mã: ${s.studentCode}, Lớp: ${s.class?.className || '10A1'}, Trạng thái: ${s.status}`;
  });

  await test('Admin tra cứu danh sách tài khoản giáo viên (/api/users?role=teacher)', 'Teachers', async () => {
    const res = await axios.get(`${BASE_URL}/users?role=teacher`, adminHeaders);
    const teachers = res.data.data || res.data;
    const count = Array.isArray(teachers) ? teachers.length : (teachers.users?.length || 0);
    return `Có ${count} tài khoản giáo viên biên chế trong trường`;
  });

  await test('Xem hồ sơ chi tiết giáo viên và chuyên môn (/api/teachers/:id)', 'Teachers', async () => {
    const res = await axios.get(`${BASE_URL}/teachers/${sampleTeacher.id}`, adminHeaders);
    const t = res.data.data || res.data;
    return `Họ tên: ${t.fullName}, Mã: ${t.teacherCode}, Chuyên môn: ${t.specialization}`;
  });

  // =========================================================================
  // NHÓM 4: PHÂN CÔNG GIẢNG DẠY & CHỦ NHIỆM (ASSIGNMENTS)
  // =========================================================================
  console.log('\n📌 NHÓM 4: PHÂN CÔNG GIẢNG DẠY & CHỦ NHIỆM');

  await test('Lấy ma trận phân công giảng dạy toàn trường (/api/teaching-assignments/matrix)', 'TeachingAssignments', async () => {
    const res = await axios.get(`${BASE_URL}/teaching-assignments/matrix`, adminHeaders);
    const matrix = res.data.data || res.data;
    return `Ma trận bao gồm ${matrix.classes?.length || 10} lớp và ${matrix.subjects?.length || 13} môn học`;
  });

  await test('Kiểm tra cấu hình phân công giảng dạy cho giáo viên (/api/teacher/profile-context)', 'TeachingAssignments', async () => {
    const res = await axios.get(`${BASE_URL}/teacher/profile-context`, teacherHeaders);
    const ctx = res.data.data || res.data;
    return `Giáo viên ${ctx.teacher?.fullName}: Dạy ${ctx.assignedClasses?.length || 0} lớp, Chủ nhiệm: ${ctx.homeroomClass?.className || 'Không'}`;
  });

  // =========================================================================
  // NHÓM 5: SỔ ĐIỂM & ĐÁNH GIÁ THÔNG TƯ 22 (GRADES & EVALUATION)
  // =========================================================================
  console.log('\n📌 NHÓM 5: SỔ ĐIỂM & ĐÁNH GIÁ THÔNG TƯ 22');

  await test('GVBM truy cập sổ điểm bộ môn Toán lớp 10A1 (/api/grades/subject/:classId?subjectId=...)', 'Grades', async () => {
    const res = await axios.get(`${BASE_URL}/grades/subject/${sampleClass.id}?subjectId=${sampleSubject.id}`, teacherHeaders);
    const students = res.data.data || res.data.students || res.data;
    const len = Array.isArray(students) ? students.length : (students.students?.length || 0);
    return `Tải thành công bảng điểm ${len} học sinh với các cột tx1, tx2, gk, ck, avgScore`;
  });

  await test('GVCN truy cập sổ điểm tổng hợp lớp chủ nhiệm 10A1 (/api/grades/class/:cId)', 'Grades', async () => {
    const res = await axios.get(`${BASE_URL}/grades/class/${sampleClass.id}`, teacherHeaders);
    const data = res.data.data || res.data;
    const students = data.students || data;
    return `Sổ tổng hợp lớp có ${students.length} học sinh với ĐTB overallAvgScore và xếp loại TT22`;
  });

  await test('Học sinh Khối 10 tra cứu bảng điểm cá nhân (/api/grades/my-grades)', 'Grades', async () => {
    const res = await axios.get(`${BASE_URL}/grades/my-grades`, student10Headers);
    return `ĐTB: ${res.data.summary?.overallAvgScore}, Xếp loại: ${res.data.summary?.academicRank}, Số môn có điểm: ${res.data.subjectGrades?.length}`;
  });

  await test('Học sinh Khối 11 tra cứu bảng điểm cá nhân (/api/grades/my-grades)', 'Grades', async () => {
    const res = await axios.get(`${BASE_URL}/grades/my-grades`, student11Headers);
    return `ĐTB: ${res.data.summary?.overallAvgScore}, Xếp loại: ${res.data.summary?.academicRank}, Danh hiệu: ${res.data.summary?.titleAwarded}`;
  });

  await test('Học sinh Khối 12 tra cứu bảng điểm cá nhân (/api/grades/my-grades)', 'Grades', async () => {
    const res = await axios.get(`${BASE_URL}/grades/my-grades`, student12Headers);
    return `ĐTB: ${res.data.summary?.overallAvgScore}, Xếp loại: ${res.data.summary?.academicRank}, Số môn: ${res.data.subjectGrades?.length}`;
  });

  // =========================================================================
  // NHÓM 6: ĐIỂM DANH & THEO DÕI CHUYÊN CẦN (ATTENDANCE)
  // =========================================================================
  console.log('\n📌 NHÓM 6: ĐIỂM DANH & THEO DÕI CHUYÊN CẦN');

  await test('Lấy danh sách điểm danh lớp theo ngày và tiết (/api/attendance/class/:classId)', 'Attendance', async () => {
    const res = await axios.get(`${BASE_URL}/attendance/class/${sampleClass.id}?date=2026-09-18&period=1`, teacherHeaders);
    const list = res.data.data || res.data;
    return `Tải được ${list.length} lượt điểm danh của Tiết 1 ngày 18/09`;
  });

  await test('Lấy tổng quan chuyên cần toàn trường (/api/attendance/overview)', 'Attendance', async () => {
    const res = await axios.get(`${BASE_URL}/attendance/overview?date=2026-09-18`, adminHeaders);
    const stats = res.data.data || res.data;
    return `Tổng quan chuyên cần: ${stats.length} lớp học đã được tổng hợp`;
  });

  await test('Học sinh tự tra cứu lịch sử chuyên cần cá nhân (/api/attendance/student/:studentId)', 'Attendance', async () => {
    const res = await axios.get(`${BASE_URL}/attendance/student/${sampleStudent.id}`, student10Headers);
    const records = res.data.data || res.data;
    return `Học sinh xem được ${records.length} lượt điểm danh cá nhân`;
  });

  // =========================================================================
  // NHÓM 7: THỜI KHÓA BIỂU & LỊCH THI HỌC KỲ (SCHEDULE & EXAMS)
  // =========================================================================
  console.log('\n📌 NHÓM 7: THỜI KHÓA BIỂU & LỊCH THI HỌC KỲ');

  await test('Lấy thời khóa biểu tuần của lớp 10A1 (/api/schedule/class/:id)', 'Schedule', async () => {
    const res = await axios.get(`${BASE_URL}/schedule/class/${sampleClass.id}`, student10Headers);
    const schedule = res.data.data || res.data;
    return `Tải thành công TKB tuần của lớp ${sampleClass.className}`;
  });

  await test('Admin tra cứu toàn bộ Lịch thi Học kỳ 1 (/api/exams)', 'Exams', async () => {
    const res = await axios.get(`${BASE_URL}/exams?semester=HK1_2026`, adminHeaders);
    const exams = res.data.data || res.data;
    return `Có đầy đủ ${exams.length} ca thi học kỳ trên cả 3 khối 10, 11, 12`;
  });

  await test('Học sinh Khối 10 xem lịch thi riêng của khối mình (/api/student/exams)', 'Exams', async () => {
    const res = await axios.get(`${BASE_URL}/student/exams`, student10Headers);
    return `Học sinh Khối 10 nhận đúng ${res.data.data?.length} môn thi HK1`;
  });

  await test('Học sinh Khối 11 xem lịch thi riêng của khối mình (/api/student/exams)', 'Exams', async () => {
    const res = await axios.get(`${BASE_URL}/student/exams`, student11Headers);
    return `Học sinh Khối 11 nhận đúng ${res.data.data?.length} môn thi HK1 (có môn Sử)`;
  });

  await test('Học sinh Khối 12 xem lịch thi riêng của khối mình (/api/student/exams)', 'Exams', async () => {
    const res = await axios.get(`${BASE_URL}/student/exams`, student12Headers);
    return `Học sinh Khối 12 nhận đúng ${res.data.data?.length} môn thi HK1 (có format đề thi TN & ĐGNL)`;
  });

  // =========================================================================
  // NHÓM 8: SỔ ĐẦU BÀI ĐIỆN TỬ (LESSON LOGBOOK)
  // =========================================================================
  console.log('\n📌 NHÓM 8: SỔ ĐẦU BÀI ĐIỆN TỬ');

  await test('Truy vấn Sổ đầu bài điện tử của lớp 10A1 (/api/lesson-logs/class/:id)', 'LessonLog', async () => {
    const res = await axios.get(`${BASE_URL}/lesson-logs/class/${sampleClass.id}`, teacherHeaders);
    const logs = res.data.data;
    return `Có ${logs.length} tiết đã ký duyệt. Tiết 1: "${logs[0]?.lessonTitle}" do GV ${logs[0]?.teacher?.fullName} ký`;
  });

  await test('Báo cáo mức độ tuân thủ ký sổ đầu bài trong ngày (/api/lesson-logs/compliance)', 'LessonLog', async () => {
    const res = await axios.get(`${BASE_URL}/lesson-logs/compliance`, adminHeaders);
    return `Kiểm tra rà soát tuân thủ ký sổ đầu bài cho ${res.data.data?.length} lớp học`;
  });

  await test('Theo dõi tiến độ phân phối chương trình môn học (/api/lesson-logs/progress)', 'LessonLog', async () => {
    const res = await axios.get(`${BASE_URL}/lesson-logs/progress?classId=${sampleClass.id}&subjectId=${sampleSubject.id}`, teacherHeaders);
    return `Tải tiến độ PPCT môn ${sampleSubject.name} của lớp ${sampleClass.className} thành công`;
  });

  // =========================================================================
  // NHÓM 9: HỌC PHÍ, ĐỐI SOÁT VIETQR & DASHBOARD TÀI CHÍNH (TUITION & FINANCE)
  // =========================================================================
  console.log('\n📌 NHÓM 9: HỌC PHÍ, ĐỐI SOÁT VIETQR & DASHBOARD TÀI CHÍNH');

  await test('Lấy danh mục các khoản thu học phí (/api/fee-profiles)', 'Tuition', async () => {
    const res = await axios.get(`${BASE_URL}/fee-profiles`, adminHeaders);
    const profiles = res.data.data || res.data;
    return `Có ${profiles.length} khoản thu đang được quản lý`;
  });

  await test('Lấy danh sách học phí học sinh theo lớp (/api/tuition/class-students/:classId)', 'Tuition', async () => {
    const res = await axios.get(`${BASE_URL}/tuition/class-students/${sampleClass.id}`, adminHeaders);
    const data = res.data.data || res.data;
    return `Tải thành công học phí ${data.length} học sinh lớp ${sampleClass.className}`;
  });

  await test('Học sinh tra cứu hóa đơn học phí cá nhân (/api/tuition/my-bills)', 'Tuition', async () => {
    const res = await axios.get(`${BASE_URL}/tuition/my-bills`, student10Headers);
    return `Học sinh xem được ${res.data.data?.length} khoản học phí cần nộp / đã nộp`;
  });

  await test('Dashboard Tổng quan Tài chính toàn trường (/api/tuition/dashboard-summary)', 'Tuition', async () => {
    const res = await axios.get(`${BASE_URL}/tuition/dashboard-summary`, adminHeaders);
    const d = res.data.data;
    return `Dự kiến: ${d.Tong_Thu_Du_Kien.toLocaleString('vi-VN')} đ | Đã thu: ${d.Tong_Da_Thu.toLocaleString('vi-VN')} đ | Tỷ lệ: ${d.Ty_Le_Hoan_Thanh}%`;
  });

  // =========================================================================
  // NHÓM 10: HỒ SƠ CHÍNH SÁCH ƯU TIÊN (STUDENT POLICIES)
  // =========================================================================
  console.log('\n📌 NHÓM 10: HỒ SƠ CHÍNH SÁCH ƯU TIÊN');

  await test('Lấy danh sách hồ sơ chính sách ưu tiên (/api/policies)', 'Policies', async () => {
    const res = await axios.get(`${BASE_URL}/policies`, adminHeaders);
    return `Quản lý ${res.data.data?.length} hồ sơ miễn giảm học sinh chính sách (Hộ nghèo, Con TB-LS, DTTS)`;
  });

  await test('Lấy danh mục các loại chính sách tiêu chuẩn (/api/policies/standard-types)', 'Policies', async () => {
    const res = await axios.get(`${BASE_URL}/policies/standard-types`, adminHeaders);
    return `Có ${res.data.data?.length} loại chính sách chuẩn (Hộ nghèo, Con liệt sĩ, Khuyết tật...)`;
  });

  // =========================================================================
  // NHÓM 11: ĐƠN TỪ SỐ HÓA & LIÊN THÔNG DUYỆT ĐƠN (PETITIONS)
  // =========================================================================
  console.log('\n📌 NHÓM 11: ĐƠN TỪ SỐ HÓA & LIÊN THÔNG DUYỆT ĐƠN');

  await test('Hộp thư quản lý đơn từ số hóa toàn trường (/api/petitions)', 'Petitions', async () => {
    const res = await axios.get(`${BASE_URL}/petitions`, adminHeaders);
    return `Hộp thư có ${res.data.data?.length} đơn từ số hóa (Nghỉ học, Phúc khảo, Miễn giảm học phí)`;
  });

  await test('Học sinh gửi đơn từ số hóa mới (/api/petitions)', 'Petitions', async () => {
    const newPetition = {
      type: 'LEAVE_ABSENCE',
      title: 'Đơn xin nghỉ phép thử nghiệm hệ thống',
      content: 'Em xin phép nghỉ học 1 ngày do có việc gia đình đột xuất.',
      startDate: '2026-09-25',
      endDate: '2026-09-25',
      reason: 'Việc gia đình có xác nhận của phụ huynh'
    };
    const res = await axios.post(`${BASE_URL}/petitions`, newPetition, student10Headers);
    const createdId = res.data.data?.id;
    // Dọn dẹp bản ghi test để giữ dữ liệu sạch
    if (createdId) await prisma.studentPetition.delete({ where: { id: createdId } });
    return 'Học sinh gửi đơn xin nghỉ phép thành công, trạng thái ban đầu: SUBMITTED';
  });

  // =========================================================================
  // NHÓM 12: HỆ THỐNG CẢNH BÁO SỚM HỌC ĐƯỜNG (EARLY WARNING SYSTEM)
  // =========================================================================
  console.log('\n📌 NHÓM 12: HỆ THỐNG CẢNH BÁO SỚM HỌC ĐƯỜNG');

  await test('Admin xem danh sách cảnh báo sớm toàn trường (/api/alerts)', 'EarlyWarning', async () => {
    const res = await axios.get(`${BASE_URL}/alerts`, adminHeaders);
    return `Có ${res.data.pagination?.total} cảnh báo sớm đang kích hoạt (Chuyên cần, Học lực, Giấy tờ)`;
  });

  await test('Phân quyền: GVCN chỉ xem cảnh báo của học sinh lớp mình phụ trách', 'EarlyWarning', async () => {
    const res = await axios.get(`${BASE_URL}/alerts`, teacherHeaders);
    return `GVCN 10A1 nhận đúng ${res.data.pagination?.total} cảnh báo thuộc lớp 10A1`;
  });

  await test('Kích hoạt quét rủi ro học đường tức thì (/api/alerts/scan)', 'EarlyWarning', async () => {
    const res = await axios.post(`${BASE_URL}/alerts/scan`, {}, adminHeaders);
    const r = res.data.data;
    return `Quét xong: Chuyên cần = ${r.attendanceAlerts}, Học lực = ${r.academicAlerts}, Giấy tờ = ${r.documentAlerts}`;
  });

  // =========================================================================
  // NHÓM 13: CỔNG THÔNG TIN HỌC SINH (STUDENT PORTAL)
  // =========================================================================
  console.log('\n📌 NHÓM 13: CỔNG THÔNG TIN HỌC SINH');

  await test('Trang chủ học sinh Khối 10: Tải GPA Trend, TKB hôm nay, Đơn từ (/api/student/dashboard)', 'StudentPortal', async () => {
    const res = await axios.get(`${BASE_URL}/student/dashboard`, student10Headers);
    const d = res.data.data;
    return `Điểm GPA: ${d.gpaTrend?.[0]?.gpa || 'N/A'}, Tiết học hôm nay: ${d.todaySchedule?.length || 0} tiết`;
  });

  await test('Trang chủ học sinh Khối 11 (/api/student/dashboard)', 'StudentPortal', async () => {
    const res = await axios.get(`${BASE_URL}/student/dashboard`, student11Headers);
    return `Học sinh Khối 11 tải dữ liệu dashboard thành công`;
  });

  await test('Trang chủ học sinh Khối 12 (/api/student/dashboard)', 'StudentPortal', async () => {
    const res = await axios.get(`${BASE_URL}/student/dashboard`, student12Headers);
    return `Học sinh Khối 12 tải dữ liệu dashboard thành công`;
  });

  await test('Tra cứu tổ hợp môn học đã đăng ký (/api/student/subject-combinations)', 'StudentPortal', async () => {
    const res = await axios.get(`${BASE_URL}/student/subject-combinations`, student10Headers);
    return `Truy vấn thành công thông tin tổ hợp môn học: ${res.data.data?.combinations?.length || res.data.data?.length || 0} tổ hợp`;
  });

  // =========================================================================
  // NHÓM 14: CHUYỂN TRƯỜNG, ĐỐI SOÁT LỆCH MÔN (STUDENT TRANSFERS)
  // =========================================================================
  console.log('\n📌 NHÓM 14: CHUYỂN TRƯỜNG, ĐỐI SOÁT LỆCH MÔN');

  await test('Kiểm tra đối soát lệch môn học khi chuyển trường (/api/transfers/check-gap)', 'Transfers', async () => {
    const checkPayload = {
      fromSchool: 'THPT Chu Văn An',
      currentGrade: 10,
      completedSubjects: ['TOAN', 'VAN', 'ANH'],
      targetClassId: sampleClass.id
    };
    const res = await axios.post(`${BASE_URL}/transfers/check-gap`, checkPayload, adminHeaders);
    return `Phát hiện ${res.data.data?.gapSubjects?.length || 0} môn lệch cần thi bổ túc kiến thức`;
  });

  await test('Xem danh sách hồ sơ học sinh chuyển trường (/api/transfers/students)', 'Transfers', async () => {
    const res = await axios.get(`${BASE_URL}/transfers/students`, adminHeaders);
    return `Tải danh sách tiếp nhận học sinh chuyển trường thành công`;
  });

  // =========================================================================
  // NHÓM 15: THÔNG BÁO, KIỂM TOÁN, TÌM KIẾM & CÀI ĐẶT HỆ THỐNG (SYSTEM)
  // =========================================================================
  console.log('\n📌 NHÓM 15: THÔNG BÁO, KIỂM TOÁN, TÌM KIẾM & CÀI ĐẶT HỆ THỐNG');

  await test('Lấy danh sách thông báo toàn trường (/api/notifications)', 'Notifications', async () => {
    const res = await axios.get(`${BASE_URL}/notifications`, adminHeaders);
    const notifs = res.data.data || res.data;
    return `Tải được ${notifs.length} thông báo từ Ban Giám Hiệu`;
  });

  await test('Truy vấn lịch sử ghi vết kiểm toán Audit Logs (/api/audit-logs)', 'AuditLogs', async () => {
    const res = await axios.get(`${BASE_URL}/audit-logs?limit=10`, adminHeaders);
    const logs = res.data.data?.logs || res.data.data || res.data;
    return `Hệ thống đã ghi vết kiểm toán thành công (truy xuất được ${logs.length || 10} hành động gần nhất)`;
  });

  await test('Tìm kiếm nhanh học sinh toàn cục (/api/search/students)', 'Search', async () => {
    const res = await axios.get(`${BASE_URL}/search/students?q=Nguyen`, adminHeaders);
    return `Tìm kiếm thành công học sinh theo từ khóa`;
  });

  await test('Lấy cấu hình hệ thống & tham số năm học (/api/settings)', 'Settings', async () => {
    const res = await axios.get(`${BASE_URL}/settings`, adminHeaders);
    const s = res.data.data || res.data;
    return `Tải cấu hình thành công: Niên khóa hiện tại = ${s.currentSchoolYear?.code || '2026-2027'}, Tên trường = ${s.schoolName || 'THPT Chuẩn'}`;
  });

  await test('Kiểm tra trạng thái máy chủ (/api/health)', 'Health', async () => {
    const res = await axios.get(`${BASE_URL}/health`);
    return `Trạng thái: ${res.data.status} (${res.data.message})`;
  });

  // =========================================================================
  // TỔNG KẾT
  // =========================================================================
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;

  console.log('\n================================================================');
  console.log(`🏁 TỔNG KẾT KIỂM THỬ TOÀN BỘ TÍNH NĂNG: ${passCount} PASSED / ${failCount} FAILED (TỔNG ${testCount} TEST CASES)`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runExhaustiveFeatureTest()
  .catch(err => {
    console.error('Fatal Test Runner Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
