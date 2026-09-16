import prisma from '../prismaClient.js';
import AuditLogService from '../services/auditLogService.js';

/**
 * Middleware requireStudentContext:
 * 1. Đảm bảo người dùng đã xác thực là Học sinh (role: 'student').
 * 2. Tự động truy vấn và gắn đối tượng `req.student`, `req.studentId`, `req.classId` từ CSDL.
 * 3. Bảo vệ chống IDOR tuyệt đối: Mọi endpoint học sinh truy vấn trực tiếp qua `req.studentId`,
 *    không phụ thuộc vào bất kỳ ID nào từ URL params hay Body phía client gửi lên.
 */
export const requireStudentContext = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Vui lòng đăng nhập để truy cập cổng thông tin học sinh'
            });
        }

        if (req.user.role !== 'student') {
            return res.status(403).json({
                success: false,
                message: 'Khu vực chỉ dành riêng cho Học sinh'
            });
        }

        // Tìm kiếm hồ sơ học sinh liên kết với User
        const student = await prisma.student.findUnique({
            where: { userId: req.user.id },
            include: {
                class: {
                    include: {
                        homeroomTeacher: {
                            select: {
                                id: true,
                                fullName: true,
                                phone: true,
                                teacherCode: true
                            }
                        }
                    }
                }
            }
        });

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hồ sơ học sinh tương ứng với tài khoản này'
            });
        }

        if (student.status === 'SUSPENDED') {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản học sinh của bạn đang bị đình chỉ'
            });
        }

        // Gắn context an toàn
        req.student = student;
        req.studentId = student.id;
        req.classId = student.classId;

        next();
    } catch (error) {
        console.error('Lỗi requireStudentContext middleware:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi xác thực quyền hạn học sinh: ' + error.message
        });
    }
};

/**
 * Helper kiểm tra quyền sở hữu tài nguyên (Chống IDOR cho các thực thể con như đơn phúc khảo, đơn nghỉ phép)
 */
export const verifyResourceOwnership = async (resourceStudentId, req, resourceType, resourceId) => {
    if (resourceStudentId !== req.studentId) {
        // Ghi nhận cảnh báo xâm nhập IDOR vào AuditLog
        try {
            await AuditLogService.logAction({
                userId: req.user?.id,
                action: 'IDOR_ATTEMPT_BLOCKED',
                resourceType: resourceType || 'Unknown',
                resourceId: resourceId || null,
                severity: 'warning',
                reason: `Học sinh ${req.student?.studentCode || req.studentId} cố gắng truy cập tài nguyên của học sinh ${resourceStudentId}`,
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.headers['user-agent']
            });
        } catch (logErr) {
            console.warn('AuditLog IDOR logging notice:', logErr.message);
        }
        return false;
    }
    return true;
};
