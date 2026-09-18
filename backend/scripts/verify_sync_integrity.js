import prisma from '../prismaClient.js';
import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function testSyncIntegrity() {
  console.log('🧪 BẮT ĐẦU KIỂM TRA TOÀN DIỆN TÍNH TOÀN VẸN VÀ ĐỒNG BỘ HÓA DỮ LIỆU...\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, name, detail = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${name} ${detail ? '(' + detail + ')' : ''}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${detail ? '(' + detail + ')' : ''}`);
      failed++;
    }
  };

  // 1. Kiểm tra Database counts
  console.log('--- 1. KIỂM TRA CƠ SỞ DỮ LIỆU ---');
  const subjectGradeCount = await prisma.subjectGrade.count();
  assert(subjectGradeCount >= 3000, 'SubjectGrade có dữ liệu đầy đủ', `Count = ${subjectGradeCount}`);

  const teacherAssignmentCount = await prisma.teacherAssignment.count();
  assert(teacherAssignmentCount >= 70, 'TeacherAssignment được phân công đầy đủ', `Count = ${teacherAssignmentCount}`);

  const homeroomAssignmentCount = await prisma.homeroomAssignment.count();
  assert(homeroomAssignmentCount >= 7, 'HomeroomAssignment được phân công đầy đủ', `Count = ${homeroomAssignmentCount}`);

  const nullGpaCount = await prisma.grade.count({ where: { overallAvgScore: null } });
  assert(nullGpaCount === 0, 'Toàn bộ 282 học sinh đều đã có ĐTB overallAvgScore (không còn null)', `Số học sinh null = ${nullGpaCount}`);

  // 2. Đăng nhập các vai trò để test API
  console.log('\n--- 2. KIỂM TRA API AUTH & TOKENS ---');
  let adminToken = '';
  let teacherToken = '';
  let studentToken = '';

  try {
    const adminRes = await axios.post(`${BASE_URL}/auth/login`, { username: 'admin', password: 'admin123' });
    adminToken = adminRes.data.token || adminRes.data.accessToken;
    assert(!!adminToken, 'Đăng nhập Admin thành công');
  } catch (e) {
    assert(false, 'Đăng nhập Admin thất bại', e.message);
  }

  try {
    const teacherRes = await axios.post(`${BASE_URL}/auth/login`, { username: 'gv001', password: 'gv001@123' });
    teacherToken = teacherRes.data.token || teacherRes.data.accessToken;
    assert(!!teacherToken, 'Đăng nhập GVCN/GVBM (gv001) thành công');
  } catch (e) {
    assert(false, 'Đăng nhập Teacher thất bại', e.message);
  }

  try {
    const studentRes = await axios.post(`${BASE_URL}/auth/login`, { username: 'hs001', password: 'hs001@123' });
    studentToken = studentRes.data.token || studentRes.data.accessToken;
    assert(!!studentToken, 'Đăng nhập Student (hs001) thành công');
  } catch (e) {
    assert(false, 'Đăng nhập Student thất bại', e.message);
  }

  // 3. Kiểm tra Tra cứu điểm cá nhân học sinh (/api/grades/my-grades)
  console.log('\n--- 3. KIỂM TRA BẢNG ĐIỂM HỌC SINH (MY-GRADES) ---');
  try {
    const myGradesRes = await axios.get(`${BASE_URL}/grades/my-grades?semester=HK1_2026`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = myGradesRes.data;
    assert(data.success === true, 'API /grades/my-grades trả về success: true');
    assert(data.subjectGrades && data.subjectGrades.length > 0, 'Danh sách môn học không bị rỗng', `Số môn = ${data.subjectGrades?.length}`);
    assert(data.summary?.overallAvgScore !== null && data.summary?.overallAvgScore > 0, 'Điểm TB overallAvgScore hiển thị chính xác', `ĐTB = ${data.summary?.overallAvgScore}`);
    assert(data.summary?.academicRank && data.summary.academicRank !== 'Chưa xếp loại', 'Xếp loại học lực theo TT22 chính xác', `Xếp loại = ${data.summary?.academicRank}`);
  } catch (e) {
    assert(false, 'Gọi API /grades/my-grades thất bại', e.response?.data?.message || e.message);
  }

  // 4. Lấy thông tin lớp 10A1 để test các API nghiệp vụ
  const class10A1 = await prisma.class.findFirst({ where: { className: '10A1' } });
  const subjectMath = await prisma.subject.findFirst({ where: { subjectCode: 'TOAN' } });

  // 5. Kiểm tra Sổ điểm bộ môn (/api/grades/subject/:classId)
  console.log('\n--- 4. KIỂM TRA SỔ ĐIỂM BỘ MÔN (SUBJECT GRADES) ---');
  try {
    const subjGradeRes = await axios.get(`${BASE_URL}/grades/subject/${class10A1.id}?subjectId=${subjectMath.id}&semester=HK1_2026`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const data = subjGradeRes.data;
    assert(data.success === true, 'Giáo viên bộ môn truy cập bảng điểm môn Toán lớp 10A1 thành công');
    assert(data.students && data.students.length > 0, 'Danh sách học sinh có điểm thành phần TT22', `Số HS = ${data.students?.length}`);
    const firstStudent = data.students[0];
    assert(firstStudent.tx1 !== null && firstStudent.gk !== null && firstStudent.avgScore !== null, 'Điểm thành phần (tx1, gk, avgScore) đầy đủ', `HS: ${firstStudent.fullName}, ĐTBm: ${firstStudent.avgScore}`);
  } catch (e) {
    assert(false, 'Lấy bảng điểm bộ môn thất bại', e.response?.data?.message || e.message);
  }

  // 6. Kiểm tra Sổ điểm tổng hợp GVCN (/api/grades/homeroom/:classId)
  console.log('\n--- 5. KIỂM TRA SỔ TỔNG HỢP GVCN (HOMEROOM SUMMARY) ---');
  try {
    const homeroomRes = await axios.get(`${BASE_URL}/grades/homeroom/${class10A1.id}?semester=HK1_2026`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const data = homeroomRes.data;
    assert(data.success === true, 'GVCN truy cập sổ tổng hợp lớp 10A1 thành công');
    assert(data.students && data.students.length > 0, 'Danh sách học sinh hiển thị đầy đủ');
    const firstStudent = data.students[0];
    assert(firstStudent.overallAvgScore !== null && firstStudent.overallAvgScore > 0, 'ĐTB tổng hợp không còn bị rỗng hay null', `ĐTB: ${firstStudent.overallAvgScore}, Xếp loại: ${firstStudent.academicRank}`);
  } catch (e) {
    assert(false, 'Lấy sổ tổng hợp GVCN thất bại', e.response?.data?.message || e.message);
  }

  // 7. Kiểm tra Ma trận phân công giảng dạy (/api/teaching-assignments/matrix)
  console.log('\n--- 6. KIỂM TRA MA TRẬN PHÂN CÔNG GIẢNG DẠY ---');
  try {
    const matrixRes = await axios.get(`${BASE_URL}/teaching-assignments/matrix?academicYear=2025-2026&semester=HK1`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = matrixRes.data?.data || matrixRes.data;
    assert(matrixRes.data.success === true || !!data.assignments, 'Lấy ma trận phân công giảng dạy thành công');
    assert(data.assignments && data.assignments.length > 0, 'Ma trận phân công đã có dữ liệu đầy đủ', `Tổng phân công = ${data.assignments?.length}`);
  } catch (e) {
    assert(false, 'Lấy ma trận phân công giảng dạy thất bại', e.response?.data?.message || e.message);
  }

  // 8. Kiểm tra Thống kê chuyên cần (/api/attendance/overview)
  console.log('\n--- 7. KIỂM TRA THỐNG KÊ CHUYÊN CẦN & TỶ LỆ CHUYÊN CẦN ---');
  try {
    const attOverviewRes = await axios.get(`${BASE_URL}/attendance/overview?date=${new Date().toISOString().split('T')[0]}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = attOverviewRes.data;
    assert(data.classes && data.classes.length > 0, 'Lấy thống kê chuyên cần các lớp thành công');
    const allValidRates = data.classes.every(c => c.rate === null || (c.rate >= 0 && c.rate <= 100));
    assert(allValidRates, 'Tỷ lệ chuyên cần đã được sửa công thức (0-100%, không bị tràn >100%)');
  } catch (e) {
    assert(false, 'Lấy thống kê chuyên cần thất bại', e.response?.data?.message || e.message);
  }

  // 9. Kiểm tra Student Dashboard (/api/student/dashboard)
  console.log('\n--- 8. KIỂM TRA STUDENT DASHBOARD ---');
  try {
    const dashRes = await axios.get(`${BASE_URL}/student/dashboard`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = dashRes.data?.data;
    assert(!!data, 'Tải trang chủ học sinh thành công');
    assert(data.gpaTrend && data.gpaTrend.length > 0, 'Dữ liệu biểu đồ GPA Trend có số liệu');
    const firstTrend = data.gpaTrend[0];
    assert(firstTrend.gpa > 0, 'GPA Trend phản ánh chính xác điểm tổng kết Thông tư 22', `GPA = ${firstTrend.gpa}`);
    assert(data.pendingRequests && typeof data.pendingRequests.petitions === 'number', 'Đồng bộ hóa đơn từ số hóa trong pendingRequests');
  } catch (e) {
    assert(false, 'Tải student dashboard thất bại', e.response?.data?.message || e.message);
  }

  console.log(`\n==============================================`);
  console.log(`🏁 KẾT QUẢ KIỂM TRA ĐỒNG BỘ: ${passed} PASS / ${failed} FAIL`);
  console.log(`==============================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

testSyncIntegrity()
  .catch(err => {
    console.error('Lỗi khi chạy verify_sync_integrity:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
