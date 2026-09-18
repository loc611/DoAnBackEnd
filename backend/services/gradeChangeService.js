import prisma from '../prismaClient.js';
import AuditLogService from './auditLogService.js';
import { calculateSubjectSemesterAverage } from '../utils/gradeCalculator.js';

/**
 * Service quản lý quy trình sửa điểm sau khi khóa sổ theo cơ chế Two-Man Rule
 * 1. GVBM tạo yêu cầu (status: PENDING_HOMEROOM)
 * 2. GVCN kiểm tra & xác nhận (status: PENDING_ADMIN)
 * 3. Admin / BGH phê duyệt cấp cuối (status: APPROVED) -> Tự động update điểm & ghi Audit Log
 */
class GradeChangeService {
    /**
     * GVBM khởi tạo yêu cầu sửa điểm
     */
    static async createRequest({
        userId,
        studentId,
        subjectId,
        classId,
        semester = 'HK1_2026',
        columnKey,
        newScore,
        reason,
        proofUrl
    }) {
        if (!['tx1', 'tx2', 'tx3', 'tx4', 'gk', 'ck'].includes(columnKey)) {
            throw new Error(`Cột điểm '${columnKey}' không hợp lệ. Chỉ chấp nhận: tx1, tx2, tx3, tx4, gk, ck`);
        }

        const scoreVal = parseFloat(newScore);
        if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > 10) {
            throw new Error('Điểm số mới phải nằm trong thang điểm từ 0.0 đến 10.0');
        }

        if (!reason || reason.trim().length < 5) {
            throw new Error('Lý do sửa điểm phải từ 5 ký tự trở lên');
        }

        // Lấy điểm hiện tại của học sinh
        const currentGrade = await prisma.subjectGrade.findUnique({
            where: {
                studentId_subjectId_classId_semester: {
                    studentId,
                    subjectId,
                    classId,
                    semester
                }
            }
        });

        const oldScore = currentGrade ? currentGrade[columnKey] : null;

        // Tạo yêu cầu sửa điểm
        const request = await prisma.gradeChangeRequest.create({
            data: {
                studentId,
                subjectId,
                classId,
                semester,
                columnKey,
                oldScore: oldScore !== null ? Number(oldScore) : null,
                newScore: scoreVal,
                reason: reason.trim(),
                proofUrl: proofUrl || null,
                status: 'PENDING_HOMEROOM',
                requestedById: userId
            },
            include: {
                student: { select: { fullName: true, studentCode: true } },
                subject: { select: { name: true, subjectCode: true } },
                class: { select: { className: true } },
                requestedBy: { select: { username: true, email: true } }
            }
        });

        return request;
    }

    /**
     * Lấy danh sách yêu cầu sửa điểm theo bộ lọc và phân quyền
     */
    static async getRequests({ user, status, classId, subjectId, page = 1, limit = 20 }) {
        const take = Math.max(1, Math.min(parseInt(limit) || 20, 100));
        const skip = (Math.max(1, parseInt(page) || 1) - 1) * take;

        const where = {};
        if (status) where.status = status;
        if (classId) where.classId = classId;
        if (subjectId) where.subjectId = subjectId;

        // Phân quyền theo vai trò người dùng
        const userRoles = user.userRoles ? user.userRoles.map(r => r.role?.name || r.name) : [user.role];
        const isAdmin = userRoles.includes('admin') || userRoles.includes('principal') || userRoles.includes('vice_principal') || user.role === 'admin';

        if (!isAdmin) {
            // Nếu là GVCN: lấy các đơn của lớp mình chủ nhiệm
            // Nếu là GVBM: lấy các đơn do chính mình tạo
            const teacher = await prisma.teacher.findUnique({
                where: { userId: user.id },
                include: { homeroomClasses: true }
            });

            if (teacher) {
                const homeroomClassIds = teacher.homeroomClasses.map(c => c.id);
                where.OR = [
                    { requestedById: user.id },
                    ...(homeroomClassIds.length > 0 ? [{ classId: { in: homeroomClassIds } }] : [])
                ];
            } else {
                where.requestedById = user.id;
            }
        }

        const [total, requests] = await Promise.all([
            prisma.gradeChangeRequest.count({ where }),
            prisma.gradeChangeRequest.findMany({
                where,
                include: {
                    student: { select: { id: true, fullName: true, studentCode: true } },
                    subject: { select: { id: true, name: true, subjectCode: true } },
                    class: { select: { id: true, className: true } },
                    requestedBy: { select: { id: true, username: true } },
                    homeroomConfirmedBy: { select: { id: true, username: true } },
                    approvedBy: { select: { id: true, username: true } },
                    rejectedBy: { select: { id: true, username: true } }
                },
                orderBy: { createdAt: 'desc' },
                take,
                skip
            })
        ]);

        return {
            total,
            page: parseInt(page) || 1,
            totalPages: Math.ceil(total / take),
            data: requests
        };
    }

    /**
     * Cấp 1: GVCN xác nhận tính hợp lệ của yêu cầu sửa điểm
     */
    static async confirmByHomeroom({ requestId, userId, note }) {
        const request = await prisma.gradeChangeRequest.findUnique({
            where: { id: requestId },
            include: { class: true }
        });

        if (!request) {
            throw new Error('Không tìm thấy yêu cầu sửa điểm');
        }

        if (request.status !== 'PENDING_HOMEROOM') {
            throw new Error(`Không thể xác nhận yêu cầu ở trạng thái: ${request.status}`);
        }

        // Cập nhật trạng thái chuyển tiếp sang PENDING_ADMIN
        const updated = await prisma.gradeChangeRequest.update({
            where: { id: requestId },
            data: {
                status: 'PENDING_ADMIN',
                homeroomConfirmedById: userId,
                homeroomNote: note ? note.trim() : 'GVCN đã kiểm tra và xác nhận tính hợp lệ',
                homeroomConfirmedAt: new Date()
            },
            include: {
                student: { select: { fullName: true } },
                subject: { select: { name: true } }
            }
        });

        return updated;
    }

    /**
     * Cấp 2: Admin / BGH phê duyệt cấp cuối
     * Thực thi Transaction: Đổi trạng thái -> Cập nhật SubjectGrade -> Tính lại avgScore -> Ghi Audit Log
     */
    static async approveByAdmin({ requestId, adminId, note, req = null }) {
        const request = await prisma.gradeChangeRequest.findUnique({
            where: { id: requestId },
            include: {
                student: { select: { id: true, fullName: true, studentCode: true } },
                subject: { select: { id: true, name: true } },
                class: { select: { id: true, className: true } }
            }
        });

        if (!request) {
            throw new Error('Không tìm thấy yêu cầu sửa điểm');
        }

        if (request.status !== 'PENDING_ADMIN' && request.status !== 'PENDING_HOMEROOM') {
            throw new Error(`Chỉ có thể phê duyệt yêu cầu đang chờ duyệt. Trạng thái hiện tại: ${request.status}`);
        }

        const { studentId, subjectId, classId, semester, columnKey, oldScore, newScore } = request;

        // Chạy Transaction nguyên tử
        const result = await prisma.$transaction(async (tx) => {
            // 1. Cập nhật SubjectGrade
            const currentGrade = await tx.subjectGrade.findUnique({
                where: {
                    studentId_subjectId_classId_semester: {
                        studentId,
                        subjectId,
                        classId,
                        semester
                    }
                }
            });

            const updateFields = { [columnKey]: newScore };
            
            // Tính lại điểm trung bình môn học kỳ (ĐTBmhk) theo Thông tư 22
            if (currentGrade) {
                const calcObj = {
                    tx1: currentGrade.tx1,
                    tx2: currentGrade.tx2,
                    tx3: currentGrade.tx3,
                    tx4: currentGrade.tx4,
                    gk: currentGrade.gk,
                    ck: currentGrade.ck,
                    ...updateFields
                };
                const newAvg = calculateSubjectSemesterAverage(calcObj);
                if (newAvg !== null) {
                    updateFields.avgScore = newAvg;
                }
            }

            const updatedGrade = await tx.subjectGrade.upsert({
                where: {
                    studentId_subjectId_classId_semester: {
                        studentId,
                        subjectId,
                        classId,
                        semester
                    }
                },
                update: updateFields,
                create: {
                    studentId,
                    subjectId,
                    classId,
                    semester,
                    status: 'locked',
                    ...updateFields
                }
            });

            // 2. Cập nhật trạng thái yêu cầu sửa điểm thành APPROVED
            const approvedRequest = await tx.gradeChangeRequest.update({
                where: { id: requestId },
                data: {
                    status: 'APPROVED',
                    approvedById: adminId,
                    adminNote: note ? note.trim() : 'Ban Giám Hiệu phê duyệt điều chỉnh điểm',
                    approvedAt: new Date()
                }
            });

            return { approvedRequest, updatedGrade };
        });

        // 3. Ghi vết Audit Log bảo mật (Snapshot Before / After)
        await AuditLogService.log({
            userId: adminId,
            action: 'grade:override_approved',
            module: 'grade',
            resource: request.subject.name,
            resourceId: request.id,
            oldValue: { column: columnKey, score: oldScore },
            newValue: { column: columnKey, score: newScore },
            reason: `Phê duyệt sửa điểm cho HS ${request.student.fullName} (${request.student.studentCode}) môn ${request.subject.name}: ${oldScore} -> ${newScore}. Lý do: ${request.reason}`,
            req,
            severity: 'critical'
        });

        return result;
    }

    /**
     * Từ chối yêu cầu sửa điểm (GVCN hoặc Admin)
     */
    static async rejectRequest({ requestId, userId, reason }) {
        if (!reason || reason.trim().length < 3) {
            throw new Error('Cần cung cấp lý do từ chối yêu cầu sửa điểm');
        }

        const request = await prisma.gradeChangeRequest.findUnique({
            where: { id: requestId }
        });

        if (!request) {
            throw new Error('Không tìm thấy yêu cầu sửa điểm');
        }

        if (request.status === 'APPROVED' || request.status === 'REJECTED') {
            throw new Error(`Không thể từ chối yêu cầu đã ở trạng thái: ${request.status}`);
        }

        const updated = await prisma.gradeChangeRequest.update({
            where: { id: requestId },
            data: {
                status: 'REJECTED',
                rejectedById: userId,
                rejectionReason: reason.trim(),
                rejectedAt: new Date()
            }
        });

        return updated;
    }
}

export default GradeChangeService;
