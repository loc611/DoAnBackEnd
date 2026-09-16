import prisma from '../prismaClient.js';
import AuditLogService from '../services/auditLogService.js';
import GradePolicy from '../policies/GradePolicy.js';

export const getGradesByClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const semester = req.query.semester || 'HK1_2026';

        // Kiểm tra quyền xem điểm lớp học (grade.view)
        if (req.user && req.user.can) {
            const check = await req.user.can('grade.view', { classId });
            if (!check.allowed) {
                return res.status(403).json({ success: false, message: check.reason || 'Bạn không có quyền xem bảng điểm của lớp này' });
            }
        }

        const students = await prisma.student.findMany({
            where: { classId },
            select: {
                id: true,
                studentCode: true,
                fullName: true,
                grades: {
                    where: { semester }
                }
            },
            orderBy: { studentCode: 'asc' }
        });

        // Kiểm tra trạng thái bảng điểm tổng thể của lớp
        let overallStatus = 'draft';
        if (students.length > 0) {
            const allGrades = students.flatMap(s => s.grades);
            if (allGrades.length > 0) {
                if (allGrades.some(g => g.status === 'locked')) {
                    overallStatus = 'locked';
                } else if (allGrades.some(g => g.status === 'submitted')) {
                    overallStatus = 'submitted';
                }
            }
        }

        // Kiểm tra Cửa sổ mở khóa tạm thời (TTL) còn hiệu lực
        const now = new Date();
        const activeUnlock = await prisma.gradeUnlockRequest.findFirst({
            where: {
                classId,
                semester,
                status: 'approved',
                expiresAt: { gt: now }
            },
            include: {
                teacher: { select: { fullName: true, teacherCode: true } },
                approvedBy: { select: { username: true } }
            },
            orderBy: { expiresAt: 'desc' }
        });

        const result = students.map(student => {
            const studentGrade = student.grades.length > 0 ? student.grades[0] : null;
            return {
                id: student.studentCode,
                studentId: student.id,
                name: student.fullName,
                status: studentGrade?.status || 'draft',
                scores: studentGrade ? {
                    math: studentGrade.math,
                    literature: studentGrade.literature,
                    english: studentGrade.english,
                    physics: studentGrade.physics,
                    chemistry: studentGrade.chemistry,
                    it: studentGrade.it
                } : {
                    math: 0, literature: 0, english: 0, physics: 0, chemistry: 0, it: 0
                }
            };
        });

        res.json({
            status: overallStatus,
            isLocked: overallStatus === 'locked',
            activeUnlock: activeUnlock ? {
                id: activeUnlock.id,
                expiresAt: activeUnlock.expiresAt,
                remainingMinutes: Math.max(0, Math.ceil((new Date(activeUnlock.expiresAt) - now) / 60000)),
                durationMinutes: activeUnlock.durationMinutes,
                reason: activeUnlock.reason,
                teacherName: activeUnlock.teacher?.fullName
            } : null,
            students: result
        });
    } catch (error) {
        console.error('getGradesByClass error:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy bảng điểm' });
    }
};

export const updateClassGrades = async (req, res) => {
    try {
        const { classId } = req.params;
        const { semester = 'HK1_2026', grades, status = 'draft', reason } = req.body;

        if (!grades || !Array.isArray(grades)) {
            return res.status(400).json({ message: 'Dữ liệu bảng điểm không hợp lệ' });
        }

        const role = (req.user?.role || '').toLowerCase();
        const isAdminOrPrincipal = ['admin', 'principal', 'vice_principal'].includes(role);

        // Kiểm tra xem sổ điểm hiện tại của lớp đã bị khóa chưa
        const existingGrades = await prisma.grade.findMany({
            where: { classId, semester },
            take: 5
        });
        const isCurrentlyLocked = existingGrades.some(g => g.status === 'locked');

        // Kiểm tra cửa sổ mở khóa tạm thời (TTL)
        const now = new Date();
        const activeUnlock = await prisma.gradeUnlockRequest.findFirst({
            where: {
                classId,
                semester,
                status: 'approved',
                expiresAt: { gt: now }
            }
        });
        const hasActiveUnlock = Boolean(activeUnlock);

        // Quy định thẩm quyền:
        // 1. Nếu muốn Khóa & Công bố (status === 'locked'): Bắt buộc phải là Admin / BGH
        if (status === 'locked' && !isAdminOrPrincipal) {
            return res.status(403).json({
                success: false,
                message: 'Theo Thông tư 22/2021/TT-BGDĐT, chỉ Ban Giám Hiệu mới có thẩm quyền Khóa sổ điểm và công bố toàn trường.'
            });
        }

        // 2. Nếu sổ điểm đang bị KHÓA và không phải BGH đặc cách, thì giáo viên phải có activeUnlock
        if (isCurrentlyLocked && !isAdminOrPrincipal && !hasActiveUnlock) {
            return res.status(403).json({
                success: false,
                message: 'Sổ điểm đã bị khóa và niêm phong. Vui lòng gửi Yêu cầu mở khóa tới Ban Giám Hiệu kèm minh chứng.'
            });
        }

        // 3. Chuẩn hóa trạng thái mục tiêu
        let gradeStatus = 'draft';
        if (status === 'locked') gradeStatus = 'locked';
        else if (status === 'submitted') gradeStatus = 'submitted';

        // 4. Phân quyền ABAC bổ sung qua GradePolicy
        if (req.user && req.user.can) {
            const requiredPerm = gradeStatus === 'locked' ? 'grade.lock_publish' : 'grade.input_draft';
            const check = await req.user.can(requiredPerm, {
                classId,
                reason,
                isClassLocked: isCurrentlyLocked,
                hasActiveUnlock
            });
            if (!check.allowed) {
                return res.status(403).json({ success: false, message: check.reason });
            }
        }

        await prisma.$transaction(async (tx) => {
            for (const item of grades) {
                const uniqueInput = {
                    studentId_classId_semester: {
                        studentId: item.studentId,
                        classId: classId,
                        semester: semester
                    }
                };

                const updateData = {
                    status: gradeStatus,
                    math: Number(item.scores?.math) || 0,
                    literature: Number(item.scores?.literature) || 0,
                    english: Number(item.scores?.english) || 0,
                    physics: Number(item.scores?.physics) || 0,
                    chemistry: Number(item.scores?.chemistry) || 0,
                    it: Number(item.scores?.it) || 0
                };

                if (gradeStatus === 'locked') {
                    updateData.lockedAt = now;
                    updateData.lockedById = req.user?.id;
                }

                await tx.grade.upsert({
                    where: uniqueInput,
                    update: updateData,
                    create: {
                        studentId: item.studentId,
                        classId: classId,
                        semester: semester,
                        ...updateData
                    }
                });
            }
        });

        // Ghi vết kiểm toán (Audit Logging)
        let logAction = 'GRADE_INPUT_DRAFT';
        if (gradeStatus === 'locked') logAction = 'GRADE_LOCK_PUBLISH';
        else if (gradeStatus === 'submitted') logAction = 'GRADE_SUBMIT';
        else if (hasActiveUnlock) logAction = 'GRADE_EDIT_DURING_UNLOCK_WINDOW';

        await AuditLogService.log({
            userId: req.user?.id,
            action: logAction,
            module: 'grade',
            resource: 'Grade',
            resourceId: classId,
            newData: { 
                classId, 
                semester, 
                status: gradeStatus, 
                totalStudents: grades.length,
                activeUnlockId: activeUnlock?.id || null 
            },
            reason: reason || (
                gradeStatus === 'locked' 
                    ? 'BGH Khóa sổ & Công bố điểm chính thức' 
                    : gradeStatus === 'submitted'
                        ? 'GV Nộp bảng điểm cho BGH xét duyệt'
                        : hasActiveUnlock
                            ? 'Điều chỉnh điểm trong Cửa sổ mở khóa tạm thời'
                            : 'Lưu nháp điểm môn học'
            ),
            req,
            severity: (gradeStatus === 'locked' || hasActiveUnlock) ? 'critical' : 'info'
        });

        res.json({ 
            message: gradeStatus === 'locked' 
                ? 'Đã khóa sổ điểm và công bố chính thức cho học sinh' 
                : gradeStatus === 'submitted'
                    ? 'Đã nộp bảng điểm thành công, chờ Ban Giám Hiệu phê duyệt'
                    : 'Đã lưu bản nháp thành công',
            status: gradeStatus
        });
    } catch (error) {
        console.error('updateClassGrades error:', error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật điểm' });
    }
};

export const getMyGrades = async (req, res) => {
    try {
        const student = await prisma.student.findUnique({
            where: { userId: req.user.id },
            include: {
                class: {
                    include: {
                        homeroomTeacher: true
                    }
                }
            }
        });

        if (!student) {
            return res.status(404).json({ message: 'Không tìm thấy hồ sơ học sinh' });
        }

        const grades = await prisma.grade.findMany({
            where: { studentId: student.id },
            include: {
                class: true
            },
            orderBy: { semester: 'asc' }
        });

        res.json({ student, grades });
    } catch (error) {
        console.error('Error in getMyGrades:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy bảng điểm cá nhân' });
    }
};

/**
 * GVBM tạo yêu cầu mở khóa sổ điểm
 */
export const createUnlockRequest = async (req, res) => {
    try {
        const { classId, semester = 'HK1_2026', reason, durationMinutes = 120 } = req.body;

        if (!reason || reason.trim().length < 5) {
            return res.status(400).json({ message: 'Vui lòng cung cấp lý do giải trình chi tiết (tối thiểu 5 ký tự)' });
        }

        const teacher = await prisma.teacher.findFirst({
            where: { userId: req.user.id }
        });

        if (!teacher && !['admin', 'principal', 'vice_principal'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Chỉ giáo viên phụ trách mới có quyền gửi yêu cầu mở khóa' });
        }

        const teacherId = teacher ? teacher.id : (await prisma.teacher.findFirst())?.id;
        if (!teacherId) {
            return res.status(400).json({ message: 'Không tìm thấy thông tin giáo viên gửi yêu cầu' });
        }

        const unlockReq = await prisma.gradeUnlockRequest.create({
            data: {
                classId,
                semester,
                teacherId,
                reason: reason.trim(),
                durationMinutes: Number(durationMinutes) || 120,
                status: 'pending'
            },
            include: {
                class: true,
                teacher: true
            }
        });

        // Tạo thông báo cho Ban Giám Hiệu
        await prisma.notification.create({
            data: {
                title: `Đề xuất mở khóa sổ điểm: Lớp ${unlockReq.class?.className}`,
                content: `GV ${unlockReq.teacher?.fullName} đề xuất mở khóa sửa điểm lớp ${unlockReq.class?.className} (${semester}) trong ${unlockReq.durationMinutes} phút. Lý do: ${reason}`,
                type: 'Đề xuất mở khóa điểm',
                targetClassId: classId,
                createdById: req.user.id
            }
        });

        // Ghi vết Audit Log
        await AuditLogService.log({
            userId: req.user.id,
            action: 'GRADE_UNLOCK_REQUESTED',
            module: 'grade',
            resource: 'GradeUnlockRequest',
            resourceId: unlockReq.id,
            newData: { classId, semester, durationMinutes, reason },
            reason,
            req,
            severity: 'warning'
        });

        res.status(201).json({
            message: 'Đã gửi đề xuất mở khóa sổ điểm lên Ban Giám Hiệu xét duyệt',
            data: unlockReq
        });
    } catch (error) {
        console.error('createUnlockRequest error:', error);
        res.status(500).json({ message: 'Lỗi server khi tạo yêu cầu mở khóa sổ điểm' });
    }
};

/**
 * Lấy danh sách các yêu cầu mở khóa sổ điểm
 */
export const getUnlockRequests = async (req, res) => {
    try {
        const { classId, semester, status } = req.query;
        const role = (req.user?.role || '').toLowerCase();
        const isAdminOrPrincipal = ['admin', 'principal', 'vice_principal'].includes(role);

        const where = {};
        if (classId) where.classId = classId;
        if (semester) where.semester = semester;
        if (status) where.status = status;

        // Nếu là giáo viên, chỉ xem các yêu cầu của chính mình
        if (!isAdminOrPrincipal) {
            const teacher = await prisma.teacher.findFirst({
                where: { userId: req.user.id }
            });
            if (teacher) {
                where.teacherId = teacher.id;
            }
        }

        const requests = await prisma.gradeUnlockRequest.findMany({
            where,
            include: {
                class: { select: { id: true, className: true, grade: true } },
                teacher: { select: { id: true, fullName: true, teacherCode: true } },
                approvedBy: { select: { id: true, username: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ data: requests });
    } catch (error) {
        console.error('getUnlockRequests error:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách yêu cầu mở khóa' });
    }
};

/**
 * BGH Phê duyệt yêu cầu mở khóa (Cấp cửa sổ TTL)
 */
export const approveUnlockRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { durationMinutes = 120, reason = 'Phê chuẩn điều chỉnh theo quy định' } = req.body;

        const role = (req.user?.role || '').toLowerCase();
        if (!['admin', 'principal', 'vice_principal'].includes(role)) {
            return res.status(403).json({ message: 'Chỉ Ban Giám Hiệu mới có thẩm quyền phê duyệt mở khóa sổ điểm' });
        }

        const existingReq = await prisma.gradeUnlockRequest.findUnique({
            where: { id },
            include: { class: true, teacher: { include: { user: true } } }
        });

        if (!existingReq) {
            return res.status(404).json({ message: 'Không tìm thấy yêu cầu mở khóa' });
        }

        const now = new Date();
        const duration = Number(durationMinutes) || existingReq.durationMinutes || 120;
        const expiresAt = new Date(now.getTime() + duration * 60 * 1000);

        const updatedReq = await prisma.gradeUnlockRequest.update({
            where: { id },
            data: {
                status: 'approved',
                durationMinutes: duration,
                approvedById: req.user.id,
                approvedAt: now,
                expiresAt: expiresAt
            },
            include: { class: true, teacher: true }
        });

        // Tạo thông báo cho Giáo viên
        await prisma.notification.create({
            data: {
                title: `Đã duyệt mở khóa sổ điểm: Lớp ${updatedReq.class?.className}`,
                content: `Ban Giám Hiệu đã phê duyệt mở khóa sổ điểm lớp ${updatedReq.class?.className} trong ${duration} phút (Hiệu lực đến: ${expiresAt.toLocaleTimeString('vi-VN')}). Vui lòng hoàn tất điều chỉnh trước thời hạn.`,
                type: 'Phê duyệt mở khóa sổ điểm',
                targetClassId: updatedReq.classId,
                createdById: req.user.id
            }
        });

        // Ghi vết Audit Log
        await AuditLogService.log({
            userId: req.user.id,
            action: 'GRADE_UNLOCK_APPROVED',
            module: 'grade',
            resource: 'GradeUnlockRequest',
            resourceId: id,
            newData: { expiresAt, durationMinutes: duration, approvedAt: now },
            reason,
            req,
            severity: 'critical'
        });

        res.json({
            message: `Đã phê duyệt mở khóa sổ điểm thành công (${duration} phút)`,
            data: updatedReq
        });
    } catch (error) {
        console.error('approveUnlockRequest error:', error);
        res.status(500).json({ message: 'Lỗi server khi phê duyệt mở khóa sổ điểm' });
    }
};

/**
 * BGH Từ chối yêu cầu mở khóa
 */
export const rejectUnlockRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { rejectionReason = 'Không đủ căn cứ hoặc minh chứng chưa hợp lệ' } = req.body;

        const role = (req.user?.role || '').toLowerCase();
        if (!['admin', 'principal', 'vice_principal'].includes(role)) {
            return res.status(403).json({ message: 'Chỉ Ban Giám Hiệu mới có thẩm quyền từ chối yêu cầu mở khóa' });
        }

        const existingReq = await prisma.gradeUnlockRequest.findUnique({
            where: { id },
            include: { class: true, teacher: true }
        });

        if (!existingReq) {
            return res.status(404).json({ message: 'Không tìm thấy yêu cầu mở khóa' });
        }

        const updatedReq = await prisma.gradeUnlockRequest.update({
            where: { id },
            data: {
                status: 'rejected',
                rejectionReason: rejectionReason.trim(),
                approvedById: req.user.id,
                approvedAt: new Date()
            }
        });

        // Tạo thông báo phản hồi cho Giáo viên
        await prisma.notification.create({
            data: {
                title: `Từ chối mở khóa sổ điểm: Lớp ${existingReq.class?.className}`,
                content: `Ban Giám Hiệu từ chối yêu cầu mở khóa sửa điểm lớp ${existingReq.class?.className}. Lý do: ${rejectionReason}`,
                type: 'Từ chối mở khóa sổ điểm',
                targetClassId: existingReq.classId,
                createdById: req.user.id
            }
        });

        // Ghi vết Audit Log
        await AuditLogService.log({
            userId: req.user.id,
            action: 'GRADE_UNLOCK_REJECTED',
            module: 'grade',
            resource: 'GradeUnlockRequest',
            resourceId: id,
            reason: rejectionReason,
            req,
            severity: 'warning'
        });

        res.json({
            message: 'Đã từ chối yêu cầu mở khóa sổ điểm',
            data: updatedReq
        });
    } catch (error) {
        console.error('rejectUnlockRequest error:', error);
        res.status(500).json({ message: 'Lỗi server khi từ chối yêu cầu mở khóa' });
    }
};
