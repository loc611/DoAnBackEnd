import prisma from '../prismaClient.js';

export const CORE_ROLES = [
  { name: 'admin', displayName: 'Ban Giám Hiệu / Quản trị viên', description: 'Toàn quyền điều hành toàn trường và đặc cách mở/sửa dữ liệu' },
  { name: 'homeroom_teacher', displayName: 'Giáo viên chủ nhiệm (GVCN)', description: 'Quản lý học sinh lớp chủ nhiệm, xem điểm các môn và đánh giá hạnh kiểm' },
  { name: 'subject_teacher', displayName: 'Giáo viên bộ môn', description: 'Nhập/sửa điểm và điểm danh các môn học/lớp được phân công giảng dạy' },
  { name: 'supervisor', displayName: 'Giám thị', description: 'Quản lý nề nếp, điểm danh và ghi nhận biên bản vi phạm toàn trường' },
  { name: 'office_staff', displayName: 'Văn phòng / Kế toán', description: 'Quản lý hồ sơ, học phí và có quyền xuất báo cáo Excel toàn trường' },
  { name: 'student', displayName: 'Học sinh', description: 'Xem thời khóa biểu, điểm cá nhân đã công bố' },
  { name: 'parent', displayName: 'Phụ huynh', description: 'Xem kết quả học tập và thông tin của con dựa theo quan hệ giám hộ' }
];

export const CORE_PERMISSIONS = [
  // Điểm số
  { name: 'grade:read', action: 'read', resourceType: 'grade', displayName: 'Xem bảng điểm' },
  { name: 'grade:write', action: 'write', resourceType: 'grade', displayName: 'Nhập & sửa điểm số' },
  { name: 'grade:override', action: 'override', resourceType: 'grade', displayName: 'Đặc cách sửa điểm sau khi khóa' },

  // Hạnh kiểm
  { name: 'conduct:read', action: 'read', resourceType: 'conduct', displayName: 'Xem hạnh kiểm' },
  { name: 'conduct:write', action: 'write', resourceType: 'conduct', displayName: 'Đánh giá hạnh kiểm' },

  // Điểm danh
  { name: 'attendance:read', action: 'read', resourceType: 'attendance', displayName: 'Xem điểm danh' },
  { name: 'attendance:write', action: 'write', resourceType: 'attendance', displayName: 'Ghi nhận điểm danh' },

  // Hồ sơ học sinh
  { name: 'student_profile:read', action: 'read', resourceType: 'student_profile', displayName: 'Xem hồ sơ học sinh' },
  { name: 'student_profile:write', action: 'write', resourceType: 'student_profile', displayName: 'Chỉnh sửa hồ sơ học sinh' },

  // Xuất dữ liệu hàng loạt
  { name: 'export:batch', action: 'batch', resourceType: 'export', displayName: 'Xuất dữ liệu Excel toàn trường' },

  // Thời khóa biểu & Học phí
  { name: 'schedule:read', action: 'read', resourceType: 'schedule', displayName: 'Xem thời khóa biểu' },
  { name: 'schedule:write', action: 'write', resourceType: 'schedule', displayName: 'Lập thời khóa biểu' },
  { name: 'tuition:read', action: 'read', resourceType: 'tuition', displayName: 'Xem học phí' },
  { name: 'tuition:write', action: 'write', resourceType: 'tuition', displayName: 'Quản lý thu học phí' }
];

export const CORE_ROLE_PERMISSION_MATRIX = {
  admin: [
    'grade:read', 'grade:write', 'grade:override',
    'conduct:read', 'conduct:write',
    'attendance:read', 'attendance:write',
    'student_profile:read', 'student_profile:write',
    'export:batch',
    'schedule:read', 'schedule:write',
    'tuition:read', 'tuition:write'
  ],
  homeroom_teacher: [
    'grade:read',
    'conduct:read', 'conduct:write',
    'attendance:read', 'attendance:write',
    'student_profile:read', 'student_profile:write',
    'schedule:read',
    'tuition:read'
  ],
  subject_teacher: [
    'grade:read', 'grade:write',
    'attendance:read', 'attendance:write',
    'student_profile:read',
    'schedule:read'
  ],
  supervisor: [
    'attendance:read', 'attendance:write',
    'conduct:read', 'conduct:write',
    'student_profile:read',
    'schedule:read'
  ],
  office_staff: [
    'student_profile:read', 'student_profile:write',
    'tuition:read', 'tuition:write',
    'export:batch',
    'schedule:read'
  ],
  student: [
    'grade:read',
    'conduct:read',
    'attendance:read',
    'student_profile:read',
    'schedule:read',
    'tuition:read'
  ],
  parent: [
    'grade:read',
    'conduct:read',
    'attendance:read',
    'student_profile:read',
    'schedule:read',
    'tuition:read'
  ]
};

export const seedRbacScopeData = async () => {
  try {
    console.log('🔄 Seeding Core Roles, Permissions & Matrix (2-tier RBAC + Scope)...');

    // 1. Seed Roles
    const roleMap = {};
    for (const r of CORE_ROLES) {
      const record = await prisma.role.upsert({
        where: { name: r.name },
        update: { displayName: r.displayName, description: r.description },
        create: r
      });
      roleMap[r.name] = record.id;
    }

    // 2. Seed Permissions
    const permMap = {};
    for (const p of CORE_PERMISSIONS) {
      const record = await prisma.permission.upsert({
        where: { name: p.name },
        update: { action: p.action, resourceType: p.resourceType, displayName: p.displayName },
        create: p
      });
      permMap[p.name] = record.id;
    }

    // 3. Seed Matrix
    for (const [roleName, permList] of Object.entries(CORE_ROLE_PERMISSION_MATRIX)) {
      const roleId = roleMap[roleName];
      if (!roleId) continue;

      for (const permName of permList) {
        const permId = permMap[permName];
        if (!permId) continue;

        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId, permissionId: permId }
          },
          update: {},
          create: { roleId, permissionId: permId }
        });
      }
    }

    // 4. Seed Niên khóa hiện tại & Cửa sổ nhập điểm mẫu nếu chưa có
    const currentSchoolYear = await prisma.schoolYear.upsert({
      where: { code: '2025-2026' },
      update: { isCurrent: true },
      create: {
        code: '2025-2026',
        name: 'Năm học 2025 - 2026',
        startDate: new Date('2025-09-05'),
        endDate: new Date('2026-05-31'),
        isCurrent: true
      }
    });

    await prisma.gradingWindow.upsert({
      where: {
        schoolYearId_semester: {
          schoolYearId: currentSchoolYear.id,
          semester: 'HK1'
        }
      },
      update: {},
      create: {
        schoolYearId: currentSchoolYear.id,
        semester: 'HK1',
        status: 'open',
        notes: 'Cửa sổ nhập điểm Học kỳ 1 (Đang mở)'
      }
    });

    console.log('✅ Successfully seeded 2-Tier RBAC + Scope-based Authorization Data.');
  } catch (error) {
    console.error('❌ Error seeding RBAC Scope data:', error);
  }
};
