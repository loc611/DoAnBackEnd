// docs/teacher-portal/teacherGuards.ts
// TypeScript Permission Guards Middleware cho Teacher Portal (Node.js/Express + Prisma)

import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedUser {
  id: string;          // User ID
  teacherId?: string;  // Teacher ID (nếu user là Giáo viên)
  email: string;
  role: UserRole;
  fullName?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  teacherAssignment?: any;
  homeroomClass?: any;
}

/**
 * 1. GUARD CHO GIÁO VIÊN BỘ MÔN (Subject Teacher):
 * Đảm bảo chỉ giáo viên được phân công giảng dạy đúng môn (subjectId) tại lớp (classId)
 * trong năm học cụ thể mới có quyền nhập/sửa điểm.
 * Hỗ trợ Bypass cho Quản trị viên (ADMIN) và Ban Giám Hiệu (PRINCIPAL).
 */
export const canManageSubjectGrades = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập để truy cập' });
      return;
    }

    // Bypass quyền nếu là Quản trị viên hoặc Hiệu trưởng / Phó hiệu trưởng
    if (user.role === UserRole.ADMIN || user.role === UserRole.PRINCIPAL) {
      return next();
    }

    const classId = (req.params.classId || req.body.classId || req.query.classId) as string;
    const subjectId = (req.params.subjectId || req.body.subjectId || req.query.subjectId) as string;
    const academicYear = (req.body.academicYear || req.query.academicYear || '2025-2026') as string;

    if (!classId || !subjectId) {
      res.status(400).json({
        success: false,
        message: 'Thiếu thông tin classId hoặc subjectId trong yêu cầu để kiểm tra thẩm quyền'
      });
      return;
    }

    // Xác định teacherId từ user ID
    let teacherId = user.teacherId;
    if (!teacherId) {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: user.id },
        select: { id: true }
      });
      if (!teacher) {
        res.status(403).json({
          success: false,
          message: 'Tài khoản người dùng chưa được liên kết với hồ sơ Giáo viên'
        });
        return;
      }
      teacherId = teacher.id;
    }

    // Kiểm tra phân công trong TeacherAssignment
    const assignment = await prisma.teacherAssignment.findFirst({
      where: {
        teacherId,
        classId,
        subjectId,
        academicYear
      }
    });

    if (!assignment) {
      res.status(403).json({
        success: false,
        message: 'Từ chối quyền: Bạn không được phân công giảng dạy môn học này tại lớp được yêu cầu'
      });
      return;
    }

    // Gắn thông tin phân công vào request
    req.teacherAssignment = assignment;
    next();
  } catch (error: any) {
    console.error('Error in canManageSubjectGrades guard:', error);
    res.status(500).json({ success: false, message: 'Lỗi xác minh quyền hạn bộ môn' });
  }
};

/**
 * 2. GUARD CHO GIÁO VIÊN CHỦ NHIỆM (Homeroom Teacher):
 * Đảm bảo chỉ giáo viên chủ nhiệm của lớp đó mới có quyền điểm danh, nhận xét rèn luyện, đánh giá hạnh kiểm.
 * Hỗ trợ Bypass cho Quản trị viên (ADMIN) và Ban Giám Hiệu (PRINCIPAL).
 */
export const isHomeroomTeacher = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập để truy cập' });
      return;
    }

    // Bypass quyền nếu là Quản trị viên hoặc Hiệu trưởng
    if (user.role === UserRole.ADMIN || user.role === UserRole.PRINCIPAL) {
      return next();
    }

    const classId = (req.params.classId || req.body.classId || req.query.classId) as string;
    if (!classId) {
      res.status(400).json({
        success: false,
        message: 'Thiếu mã lớp học (classId) để kiểm tra thẩm quyền chủ nhiệm'
      });
      return;
    }

    let teacherId = user.teacherId;
    if (!teacherId) {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: user.id },
        select: { id: true }
      });
      if (!teacher) {
        res.status(403).json({
          success: false,
          message: 'Tài khoản người dùng chưa được liên kết với hồ sơ Giáo viên'
        });
        return;
      }
      teacherId = teacher.id;
    }

    // Kiểm tra lớp có homeroomTeacherId tương ứng
    const homeroomClass = await prisma.class.findFirst({
      where: {
        id: classId,
        homeroomTeacherId: teacherId
      }
    });

    if (!homeroomClass) {
      res.status(403).json({
        success: false,
        message: 'Từ chối quyền: Bạn không phải là Giáo viên chủ nhiệm của lớp này'
      });
      return;
    }

    req.homeroomClass = homeroomClass;
    next();
  } catch (error: any) {
    console.error('Error in isHomeroomTeacher guard:', error);
    res.status(500).json({ success: false, message: 'Lỗi xác minh quyền Giáo viên chủ nhiệm' });
  }
};
