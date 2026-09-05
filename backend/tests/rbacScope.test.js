import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { checkPermission } from '../middlewares/rbacScopeGuard.js';
import prisma from '../prismaClient.js';

/**
 * Test Suite: 2-Tier RBAC + Scope-based Authorization Guard
 */
describe('2-Tier RBAC + Scope Authorization Suite', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123' },
      body: {},
      params: {},
      query: {},
      headers: {},
      ip: '127.0.0.1'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------
  // TEST CASE 1: GVCN LỚP A CỐ SỬA ĐIỂM LỚP B (PHẢI FAIL 403)
  // -------------------------------------------------------------
  it('Case 1: GVCN lớp A cố sửa điểm của lớp B -> Phải trả về 403 Forbidden', async () => {
    // Mock user có role homeroom_teacher
    jest.spyOn(prisma.userRole, 'findMany').mockResolvedValue([
      {
        role: {
          name: 'homeroom_teacher',
          rolePermissions: [
            { permission: { name: 'grade:read' } } // GVCN không có grade:write
          ]
        }
      }
    ]);

    mockReq.params.classId = 'class-B-uuid';
    mockReq.body.subjectId = 'math-uuid';

    const middleware = checkPermission('write', 'grade');
    await middleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------
  // TEST CASE 2: GIÁO VIÊN BỘ MÔN SỬA ĐIỂM NGOÀI MÔN MÌNH DẠY (PHẢI FAIL 403)
  // -------------------------------------------------------------
  it('Case 2: Giáo viên bộ môn Toán cố sửa điểm môn Văn -> Phải fail 403', async () => {
    // Mock user có role subject_teacher với permission grade:write
    jest.spyOn(prisma.userRole, 'findMany').mockResolvedValue([
      {
        role: {
          name: 'subject_teacher',
          rolePermissions: [{ permission: { name: 'grade:write' } }]
        }
      }
    ]);

    // Mock không tìm thấy phân công dạy môn Văn
    jest.spyOn(prisma.schoolYear, 'findFirst').mockResolvedValue({ id: 'year-2025' });
    jest.spyOn(prisma.gradingWindow, 'findFirst').mockResolvedValue({ status: 'open' });
    jest.spyOn(prisma.teacherAssignment, 'findFirst').mockResolvedValue(null);

    mockReq.params.classId = 'class-10A1';
    mockReq.body.subjectId = 'literature-uuid'; // Môn Văn (không dạy)

    const middleware = checkPermission('write', 'grade');
    await middleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------
  // TEST CASE 3: PHỤ HUYNH XEM ĐIỂM CON NGƯỜI KHÁC (PHẢI FAIL 403)
  // -------------------------------------------------------------
  it('Case 3: Phụ huynh xem điểm học sinh không có trong guardian_links -> Phải fail 403', async () => {
    jest.spyOn(prisma.userRole, 'findMany').mockResolvedValue([
      {
        role: {
          name: 'parent',
          rolePermissions: [{ permission: { name: 'grade:read' } }]
        }
      }
    ]);

    // Mock không có quan hệ giám hộ
    jest.spyOn(prisma.guardianLink, 'findFirst').mockResolvedValue(null);

    mockReq.params.studentId = 'student-other-child';

    const middleware = checkPermission('read', 'grade');
    await middleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------
  // TEST CASE 4: SỬA ĐIỂM KHI CỬA SỔ NHẬP ĐIỂM ĐÃ KHÓA (PHẢI FAIL 403)
  // -------------------------------------------------------------
  it('Case 4: Giáo viên sửa điểm khi grading_window = locked -> Phải fail 403', async () => {
    jest.spyOn(prisma.userRole, 'findMany').mockResolvedValue([
      {
        role: {
          name: 'subject_teacher',
          rolePermissions: [{ permission: { name: 'grade:write' } }]
        }
      }
    ]);

    // Mock cửa sổ nhập điểm đã khóa
    jest.spyOn(prisma.schoolYear, 'findFirst').mockResolvedValue({ id: 'year-2025' });
    jest.spyOn(prisma.gradingWindow, 'findFirst').mockResolvedValue({
      status: 'locked',
      semester: 'HK1'
    });

    mockReq.params.classId = 'class-10A1';
    mockReq.body.subjectId = 'math-uuid';
    mockReq.body.semester = 'HK1';

    const middleware = checkPermission('write', 'grade');
    await middleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Cửa sổ nhập điểm của học kỳ này đã bị khóa')
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------
  // TEST CASE 5: GVCN SỬA HẠNH KIỂM LỚP MÌNH CHỦ NHIỆM (PHẢI PASS)
  // -------------------------------------------------------------
  it('Case 5: GVCN sửa hạnh kiểm lớp mình chủ nhiệm -> Phải Pass (next())', async () => {
    jest.spyOn(prisma.userRole, 'findMany').mockResolvedValue([
      {
        role: {
          name: 'homeroom_teacher',
          rolePermissions: [{ permission: { name: 'conduct:write' } }]
        }
      }
    ]);

    // Mock có liên kết chủ nhiệm hợp lệ
    jest.spyOn(prisma.schoolYear, 'findFirst').mockResolvedValue({ id: 'year-2025' });
    jest.spyOn(prisma.homeroomAssignment, 'findFirst').mockResolvedValue({
      id: 'homeroom-assign-1',
      classId: 'class-10A1'
    });

    mockReq.params.classId = 'class-10A1';

    const middleware = checkPermission('write', 'conduct');
    await middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalledWith(403);
  });

  // -------------------------------------------------------------
  // TEST CASE 6: GIÁO VIÊN BỘ MÔN XUẤT EXCEL TOÀN TRƯỜNG (PHẢI FAIL 403)
  // -------------------------------------------------------------
  it('Case 6: Giáo viên bộ môn gọi API export:batch toàn trường -> Phải fail 403', async () => {
    jest.spyOn(prisma.userRole, 'findMany').mockResolvedValue([
      {
        role: {
          name: 'subject_teacher',
          rolePermissions: [{ permission: { name: 'grade:read' } }] // Không có export:batch
        }
      }
    ]);

    const middleware = checkPermission('batch', 'export');
    await middleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
