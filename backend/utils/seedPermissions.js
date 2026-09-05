import prisma from '../prismaClient.js';

export const SYSTEM_ROLES = [
  { name: 'principal', displayName: 'Hiệu trưởng', description: 'Toàn quyền điều hành, phê duyệt điểm và quyết định kỷ luật/khen thưởng toàn trường' },
  { name: 'vice_principal', displayName: 'Phó Hiệu trưởng', description: 'Phụ trách chuyên môn hoặc công tác học sinh, duyệt khóa sổ điểm và chuyển trường' },
  { name: 'academic_affairs', displayName: 'Phòng Giáo Vụ / Đào Tạo', description: 'Quản lý thời khóa biểu, phân lớp, xử lý học sinh chuyển trường, lưu ban, lớp chuyên' },
  { name: 'student_affairs', displayName: 'Phòng Công Tác Học Sinh / Giám Thị', description: 'Quản lý nề nếp, điểm danh, kỷ luật và học sinh đang bị đình chỉ' },
  { name: 'department_head', displayName: 'Trưởng Bộ Môn', description: 'Quản lý giáo viên trong tổ bộ môn, giám sát tiến độ nhập điểm và phân công chuyên môn' },
  { name: 'homeroom_teacher', displayName: 'Giáo Viên Chủ Nhiệm', description: 'Quản lý toàn diện học sinh lớp chủ nhiệm (điểm tổng kết, hạnh kiểm, điểm danh, phụ huynh)' },
  { name: 'teacher', displayName: 'Giáo Viên Bộ Môn', description: 'Nhập điểm, đánh giá và điểm danh các lớp/môn học được phân công' },
  { name: 'guest_teacher', displayName: 'Giáo Viên Thỉnh Giảng', description: 'Giáo viên hợp đồng có thời hạn, chỉ được thao tác trong thời gian hợp đồng có hiệu lực' },
  { name: 'counselor', displayName: 'Cán Bộ Tham Vấn Tâm Lý', description: 'Tiếp cận hồ sơ nhạy cảm (học sinh khuyết tật, tâm lý, hoàn cảnh đặc biệt), bảo mật cao' },
  { name: 'accountant', displayName: 'Kế Toán / Tài Vụ', description: 'Quản lý danh mục học phí, đợt thu, miễn giảm và thu tiền' },
  { name: 'librarian', displayName: 'Cán Bộ Thư Viện', description: 'Quản lý mượn trả tài liệu, sách giáo khoa và tra cứu học sinh phục vụ thư viện' },
  { name: 'it_admin', displayName: 'Quản Trị Hệ Thống CNTT', description: 'Quản trị tài khoản, phân quyền, kiểm tra Audit Log và bảo mật hệ thống' },
  { name: 'parent', displayName: 'Phụ Huynh Học Sinh', description: 'Xem điểm, hạnh kiểm, học phí, điểm danh của con dựa theo quyền giám hộ (custody)' },
  { name: 'student', displayName: 'Học Sinh', description: 'Xem thời khóa biểu, kết quả học tập cá nhân đã công bố, thông báo' },
  { name: 'alumni', displayName: 'Cựu Học Sinh', description: 'Tra cứu lịch sử học bạ, bảng điểm quá khứ (chỉ đọc)' }
];

export const SYSTEM_PERMISSIONS = [
  // 1. Module Điểm số (grade)
  { name: 'grade.view', module: 'grade', action: 'view', displayName: 'Xem điểm số', supportedScopes: ['own', 'child', 'class', 'subject', 'department', 'grade_level', 'school'] },
  { name: 'grade.input_draft', module: 'grade', action: 'edit', displayName: 'Nhập & Lưu nháp điểm', supportedScopes: ['class', 'subject', 'department', 'school'] },
  { name: 'grade.lock_publish', module: 'grade', action: 'publish', displayName: 'Khóa & Công bố điểm', supportedScopes: ['class', 'subject', 'department', 'school'] },
  { name: 'grade.unlock', module: 'grade', action: 'edit', displayName: 'Mở khóa bảng điểm', supportedScopes: ['department', 'school'] },
  { name: 'grade.override', module: 'grade', action: 'override', displayName: 'Đặc cách sửa điểm sau công bố', supportedScopes: ['school'] },

  // 2. Module Điểm danh (attendance)
  { name: 'attendance.view', module: 'attendance', action: 'view', displayName: 'Xem điểm danh', supportedScopes: ['own', 'child', 'class', 'department', 'school'] },
  { name: 'attendance.mark', module: 'attendance', action: 'create', displayName: 'Ghi nhận điểm danh', supportedScopes: ['class', 'subject', 'school'] },
  { name: 'attendance.edit_excused', module: 'attendance', action: 'edit', displayName: 'Duyệt phép / sửa trạng thái vắng', supportedScopes: ['class', 'school'] },
  { name: 'attendance.report', module: 'attendance', action: 'view', displayName: 'Báo cáo chuyên cần', supportedScopes: ['class', 'grade_level', 'school'] },

  // 3. Module Hạnh kiểm & Kỷ luật (conduct)
  { name: 'conduct.view', module: 'conduct', action: 'view', displayName: 'Xem hạnh kiểm & kỷ luật', supportedScopes: ['own', 'child', 'class', 'school'] },
  { name: 'conduct.evaluate_term', module: 'conduct', action: 'edit', displayName: 'Đánh giá hạnh kiểm học kỳ/năm', supportedScopes: ['class', 'school'] },
  { name: 'conduct.discipline_record', module: 'conduct', action: 'create', displayName: 'Ghi nhận vi phạm / biên bản', supportedScopes: ['class', 'school'] },
  { name: 'conduct.suspend_student', module: 'conduct', action: 'override', displayName: 'Quyết định đình chỉ học tập', supportedScopes: ['school'] },

  // 4. Module Hồ sơ học sinh (profile)
  { name: 'profile.view_basic', module: 'profile', action: 'view', displayName: 'Xem hồ sơ cơ bản học sinh', supportedScopes: ['own', 'child', 'class', 'department', 'school'] },
  { name: 'profile.view_sensitive', module: 'profile', action: 'view', displayName: 'Xem hồ sơ nhạy cảm (khuyết tật, gia cảnh)', supportedScopes: ['own', 'child', 'class', 'school'] },
  { name: 'profile.edit', module: 'profile', action: 'edit', displayName: 'Chỉnh sửa hồ sơ học sinh', supportedScopes: ['class', 'school'] },
  { name: 'profile.transfer_process', module: 'profile', action: 'edit', displayName: 'Xử lý chuyển trường / lưu ban', supportedScopes: ['school'] },

  // 5. Module Thời khóa biểu & Lịch thi (schedule)
  { name: 'schedule.view', module: 'schedule', action: 'view', displayName: 'Xem thời khóa biểu & lịch thi', supportedScopes: ['own', 'child', 'class', 'subject', 'school'] },
  { name: 'schedule.create', module: 'schedule', action: 'create', displayName: 'Lập thời khóa biểu', supportedScopes: ['school'] },
  { name: 'schedule.modify', module: 'schedule', action: 'edit', displayName: 'Điều chỉnh lịch học / lịch thi', supportedScopes: ['school'] },
  { name: 'schedule.assign_teacher', module: 'schedule', action: 'edit', displayName: 'Phân công giáo viên dạy thay', supportedScopes: ['department', 'school'] },

  // 6. Module Học phí (tuition)
  { name: 'tuition.view', module: 'tuition', action: 'view', displayName: 'Tra cứu học phí & hóa đơn', supportedScopes: ['own', 'child', 'class', 'school'] },
  { name: 'tuition.create_fee', module: 'tuition', action: 'create', displayName: 'Tạo đợt thu học phí', supportedScopes: ['school'] },
  { name: 'tuition.collect_payment', module: 'tuition', action: 'edit', displayName: 'Ghi nhận thanh toán & in biên lai', supportedScopes: ['school'] },
  { name: 'tuition.exempt_discount', module: 'tuition', action: 'override', displayName: 'Phê duyệt miễn giảm học phí', supportedScopes: ['school'] },

  // 7. Module Thông báo (notification)
  { name: 'notification.send_class', module: 'notification', action: 'create', displayName: 'Gửi thông báo cấp lớp', supportedScopes: ['class'] },
  { name: 'notification.send_department', module: 'notification', action: 'create', displayName: 'Gửi thông báo tổ bộ môn', supportedScopes: ['department'] },
  { name: 'notification.send_school', module: 'notification', action: 'create', displayName: 'Gửi thông báo toàn trường', supportedScopes: ['school'] },

  // 8. Module Báo cáo & Thống kê (report)
  { name: 'report.view_class', module: 'report', action: 'view', displayName: 'Báo cáo tổng kết cấp lớp', supportedScopes: ['class', 'school'] },
  { name: 'report.view_department', module: 'report', action: 'view', displayName: 'Báo cáo chuyên môn tổ', supportedScopes: ['department', 'school'] },
  { name: 'report.view_school_statistic', module: 'report', action: 'view', displayName: 'Báo cáo thống kê toàn trường', supportedScopes: ['school'] }
];

// Ma trận gán quyền mặc định cho từng Role
export const ROLE_PERMISSION_MAPPINGS = {
  principal: [
    { perm: 'grade.view', scope: 'school' },
    { perm: 'grade.lock_publish', scope: 'school' },
    { perm: 'grade.unlock', scope: 'school' },
    { perm: 'grade.override', scope: 'school' },
    { perm: 'attendance.view', scope: 'school' },
    { perm: 'attendance.report', scope: 'school' },
    { perm: 'conduct.view', scope: 'school' },
    { perm: 'conduct.evaluate_term', scope: 'school' },
    { perm: 'conduct.discipline_record', scope: 'school' },
    { perm: 'conduct.suspend_student', scope: 'school' },
    { perm: 'profile.view_basic', scope: 'school' },
    { perm: 'profile.view_sensitive', scope: 'school' },
    { perm: 'profile.edit', scope: 'school' },
    { perm: 'profile.transfer_process', scope: 'school' },
    { perm: 'schedule.view', scope: 'school' },
    { perm: 'tuition.view', scope: 'school' },
    { perm: 'tuition.exempt_discount', scope: 'school' },
    { perm: 'notification.send_school', scope: 'school' },
    { perm: 'report.view_school_statistic', scope: 'school' }
  ],
  vice_principal: [
    { perm: 'grade.view', scope: 'school' },
    { perm: 'grade.lock_publish', scope: 'school' },
    { perm: 'grade.unlock', scope: 'school' },
    { perm: 'attendance.view', scope: 'school' },
    { perm: 'attendance.report', scope: 'school' },
    { perm: 'conduct.view', scope: 'school' },
    { perm: 'conduct.discipline_record', scope: 'school' },
    { perm: 'profile.view_basic', scope: 'school' },
    { perm: 'profile.view_sensitive', scope: 'school' },
    { perm: 'profile.transfer_process', scope: 'school' },
    { perm: 'schedule.view', scope: 'school' },
    { perm: 'notification.send_school', scope: 'school' },
    { perm: 'report.view_school_statistic', scope: 'school' }
  ],
  academic_affairs: [
    { perm: 'grade.view', scope: 'school' },
    { perm: 'profile.view_basic', scope: 'school' },
    { perm: 'profile.edit', scope: 'school' },
    { perm: 'profile.transfer_process', scope: 'school' },
    { perm: 'schedule.view', scope: 'school' },
    { perm: 'schedule.create', scope: 'school' },
    { perm: 'schedule.modify', scope: 'school' },
    { perm: 'notification.send_school', scope: 'school' },
    { perm: 'report.view_school_statistic', scope: 'school' }
  ],
  student_affairs: [
    { perm: 'attendance.view', scope: 'school' },
    { perm: 'attendance.mark', scope: 'school' },
    { perm: 'attendance.edit_excused', scope: 'school' },
    { perm: 'attendance.report', scope: 'school' },
    { perm: 'conduct.view', scope: 'school' },
    { perm: 'conduct.discipline_record', scope: 'school' },
    { perm: 'profile.view_basic', scope: 'school' },
    { perm: 'notification.send_school', scope: 'school' }
  ],
  department_head: [
    { perm: 'grade.view', scope: 'department' },
    { perm: 'grade.input_draft', scope: 'department' },
    { perm: 'grade.lock_publish', scope: 'department' },
    { perm: 'grade.unlock', scope: 'department' },
    { perm: 'schedule.view', scope: 'department' },
    { perm: 'schedule.assign_teacher', scope: 'department' },
    { perm: 'notification.send_department', scope: 'department' },
    { perm: 'report.view_department', scope: 'department' }
  ],
  homeroom_teacher: [
    { perm: 'grade.view', scope: 'class' },
    { perm: 'attendance.view', scope: 'class' },
    { perm: 'attendance.mark', scope: 'class' },
    { perm: 'attendance.edit_excused', scope: 'class' },
    { perm: 'attendance.report', scope: 'class' },
    { perm: 'conduct.view', scope: 'class' },
    { perm: 'conduct.evaluate_term', scope: 'class' },
    { perm: 'conduct.discipline_record', scope: 'class' },
    { perm: 'profile.view_basic', scope: 'class' },
    { perm: 'profile.view_sensitive', scope: 'class' },
    { perm: 'profile.edit', scope: 'class' },
    { perm: 'schedule.view', scope: 'class' },
    { perm: 'tuition.view', scope: 'class' },
    { perm: 'notification.send_class', scope: 'class' },
    { perm: 'report.view_class', scope: 'class' }
  ],
  teacher: [
    { perm: 'grade.view', scope: 'subject' },
    { perm: 'grade.input_draft', scope: 'subject' },
    { perm: 'grade.lock_publish', scope: 'subject' },
    { perm: 'attendance.view', scope: 'subject' },
    { perm: 'attendance.mark', scope: 'subject' },
    { perm: 'profile.view_basic', scope: 'class' },
    { perm: 'schedule.view', scope: 'own' }
  ],
  guest_teacher: [
    { perm: 'grade.view', scope: 'subject' },
    { perm: 'grade.input_draft', scope: 'subject' },
    { perm: 'attendance.mark', scope: 'subject' },
    { perm: 'schedule.view', scope: 'own' }
  ],
  counselor: [
    { perm: 'profile.view_basic', scope: 'school' },
    { perm: 'profile.view_sensitive', scope: 'school' },
    { perm: 'conduct.view', scope: 'school' }
  ],
  accountant: [
    { perm: 'tuition.view', scope: 'school' },
    { perm: 'tuition.create_fee', scope: 'school' },
    { perm: 'tuition.collect_payment', scope: 'school' },
    { perm: 'profile.view_basic', scope: 'school' },
    { perm: 'report.view_school_statistic', scope: 'school' }
  ],
  librarian: [
    { perm: 'profile.view_basic', scope: 'school' }
  ],
  it_admin: [
    // IT Admin có toàn quyền hệ thống để quản trị kỹ thuật
    { perm: 'grade.view', scope: 'school' },
    { perm: 'attendance.view', scope: 'school' },
    { perm: 'conduct.view', scope: 'school' },
    { perm: 'profile.view_basic', scope: 'school' },
    { perm: 'schedule.view', scope: 'school' },
    { perm: 'tuition.view', scope: 'school' },
    { perm: 'notification.send_school', scope: 'school' }
  ],
  parent: [
    { perm: 'grade.view', scope: 'child' },
    { perm: 'attendance.view', scope: 'child' },
    { perm: 'conduct.view', scope: 'child' },
    { perm: 'profile.view_basic', scope: 'child' },
    { perm: 'schedule.view', scope: 'child' },
    { perm: 'tuition.view', scope: 'child' }
  ],
  student: [
    { perm: 'grade.view', scope: 'own' },
    { perm: 'attendance.view', scope: 'own' },
    { perm: 'conduct.view', scope: 'own' },
    { perm: 'profile.view_basic', scope: 'own' },
    { perm: 'schedule.view', scope: 'own' },
    { perm: 'tuition.view', scope: 'own' }
  ],
  alumni: [
    { perm: 'grade.view', scope: 'own' },
    { perm: 'profile.view_basic', scope: 'own' }
  ]
};

export const seedRbacAndPermissions = async () => {
  try {
    console.log('🔄 Seeding 15 System Roles & Permissions...');

    // 1. Seed Roles
    const roleMap = {};
    for (const roleDef of SYSTEM_ROLES) {
      const r = await prisma.role.upsert({
        where: { name: roleDef.name },
        update: { displayName: roleDef.displayName, description: roleDef.description },
        create: roleDef
      });
      roleMap[roleDef.name] = r.id;
    }

    // 2. Seed Permissions
    const permMap = {};
    for (const permDef of SYSTEM_PERMISSIONS) {
      const p = await prisma.permission.upsert({
        where: { name: permDef.name },
        update: {
          resourceType: permDef.module,
          action: permDef.action,
          displayName: permDef.displayName
        },
        create: {
          name: permDef.name,
          resourceType: permDef.module,
          action: permDef.action,
          displayName: permDef.displayName
        }
      });
      permMap[permDef.name] = p.id;
    }

    // 3. Seed RolePermission mappings
    for (const [roleName, mappings] of Object.entries(ROLE_PERMISSION_MAPPINGS)) {
      const roleId = roleMap[roleName];
      if (!roleId) continue;

      for (const item of mappings) {
        const permId = permMap[item.perm];
        if (!permId) continue;

        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId, permissionId: permId }
          },
          update: {},
          create: {
            roleId,
            permissionId: permId
          }
        });
      }
    }

    console.log('✅ Successfully seeded 15 Roles and Permissions Matrix for High School Management.');
  } catch (error) {
    console.error('❌ Error seeding RBAC Permissions:', error);
  }
};
