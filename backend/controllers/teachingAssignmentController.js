import prisma from '../prismaClient.js';
import AuditLogService from '../services/auditLogService.js';

/**
 * GET /api/teaching-assignments/matrix
 * Trả về toàn bộ dữ liệu ma trận phân công: Lớp x Môn, kèm danh sách Giáo viên và thước đo định mức KPI
 */
export const getTeachingAssignmentMatrix = async (req, res) => {
    try {
        const { academicYear = '2025-2026', semester = 'HK1', grade, departmentId } = req.query;

        // 1. Tìm hoặc lấy Niên khóa
        let schoolYear = await prisma.schoolYear.findFirst({
            where: {
                OR: [
                    { code: academicYear },
                    { name: { contains: academicYear } }
                ]
            }
        });

        if (!schoolYear) {
            schoolYear = await prisma.schoolYear.findFirst({
                where: { isCurrent: true }
            }) || await prisma.schoolYear.findFirst();
        }

        const schoolYearId = schoolYear?.id;

        // 2. Lấy danh sách Lớp học
        const classFilter = { status: 'active' };
        if (grade && grade !== 'all' && grade !== '0') {
            classFilter.grade = parseInt(grade, 10);
        }
        const classes = await prisma.class.findMany({
            where: classFilter,
            orderBy: [{ grade: 'asc' }, { className: 'asc' }],
            select: {
                id: true,
                className: true,
                grade: true,
                academicYear: true,
                homeroomTeacherId: true,
                homeroomTeacher: {
                    select: {
                        id: true,
                        teacherCode: true,
                        fullName: true
                    }
                },
                _count: {
                    select: { students: true }
                }
            }
        });

        // 3. Lấy danh sách Môn học
        const subjectFilter = {};
        if (departmentId && departmentId !== 'all') {
            subjectFilter.departmentId = departmentId;
        }
        const subjects = await prisma.subject.findMany({
            where: subjectFilter,
            orderBy: { name: 'asc' },
            select: {
                id: true,
                subjectCode: true,
                name: true,
                grade: true,
                periodsPerWeek: true,
                type: true,
                departmentId: true,
                department: {
                    select: { id: true, name: true, code: true }
                }
            }
        });

        // 4. Lấy tất cả phân công hiện tại trong học kỳ & niên khóa
        const assignmentWhere = {
            ...(schoolYearId ? { schoolYearId } : {}),
            OR: [
                { semester: semester },
                { semester: 'All' }
            ]
        };

        const assignments = await prisma.teacherAssignment.findMany({
            where: assignmentWhere,
            select: {
                id: true,
                classId: true,
                subjectId: true,
                teacherId: true,
                periodsPerWeek: true,
                semester: true,
                note: true,
                teacher: {
                    select: {
                        id: true,
                        teacherCode: true,
                        fullName: true,
                        specialization: true
                    }
                }
            }
        });

        // 5. Lấy danh sách Giáo viên và tính toán định mức tiết dạy
        const teachers = await prisma.teacher.findMany({
            where: {
                workStatus: { in: ['working', 'maternity_leave'] }
            },
            orderBy: { fullName: 'asc' },
            select: {
                id: true,
                teacherCode: true,
                fullName: true,
                specialization: true,
                position: true,
                academicDegree: true,
                teacherType: true,
                workStatus: true,
                departmentId: true,
                baseQuotas: true,
                quotaReduction: true,
                reductionReason: true,
                department: {
                    select: { id: true, code: true, name: true }
                },
                homeroomClasses: {
                    select: { id: true, className: true }
                }
            }
        });

        // Tính tổng số tiết đã được phân công cho từng giáo viên
        const teacherWorkloadMap = {};
        assignments.forEach(a => {
            const tId = a.teacherId;
            if (!teacherWorkloadMap[tId]) {
                teacherWorkloadMap[tId] = 0;
            }
            teacherWorkloadMap[tId] += (a.periodsPerWeek || 2);
        });

        const enrichedTeachers = teachers.map(t => {
            const assignedPeriods = teacherWorkloadMap[t.id] || 0;
            const actualQuota = Math.max(0, (t.baseQuotas || 17) - (t.quotaReduction || 0));
            const delta = assignedPeriods - actualQuota;

            let status = 'normal';
            if (assignedPeriods < actualQuota) {
                status = 'under_quota';
            } else if (assignedPeriods > actualQuota) {
                status = 'over_quota';
            }

            return {
                ...t,
                assignedPeriods,
                actualQuota,
                delta,
                status
            };
        });

        // Lấy danh sách Tổ chuyên môn để lọc
        const departments = await prisma.department.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, code: true, name: true }
        });

        res.json({
            success: true,
            data: {
                academicYear: schoolYear?.code || academicYear,
                semester,
                schoolYearId,
                classes,
                subjects,
                departments,
                teachers: enrichedTeachers,
                assignments
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy ma trận phân công giảng dạy:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tải ma trận phân công' });
    }
};

/**
 * POST /api/teaching-assignments/batch
 * Lưu toàn bộ ma trận phân công giảng dạy (Giao dịch an toàn Prisma Transaction)
 */
export const batchSaveTeachingAssignments = async (req, res) => {
    try {
        const { academicYear = '2025-2026', semester = 'HK1', assignments = [] } = req.body;

        // 1. Xác định schoolYearId
        let schoolYear = await prisma.schoolYear.findFirst({
            where: {
                OR: [
                    { code: academicYear },
                    { name: { contains: academicYear } }
                ]
            }
        });

        if (!schoolYear) {
            schoolYear = await prisma.schoolYear.findFirst() || await prisma.schoolYear.create({
                data: {
                    code: academicYear,
                    name: `Năm học ${academicYear}`,
                    startDate: new Date('2025-09-05'),
                    endDate: new Date('2026-05-30'),
                    isCurrent: true
                }
            });
        }

        const schoolYearId = schoolYear.id;

        // 2. Thực hiện cập nhật ma trận trong $transaction
        await prisma.$transaction(async (tx) => {
            for (const item of assignments) {
                const { classId, subjectId, teacherId, periodsPerWeek = 2, note } = item;

                if (!classId || !subjectId) continue;

                // Nếu teacherId rỗng hoặc "unassigned", tiến hành gỡ phân công
                if (!teacherId || teacherId === 'unassigned' || teacherId === '') {
                    await tx.teacherAssignment.deleteMany({
                        where: {
                            classId,
                            subjectId,
                            schoolYearId,
                            semester
                        }
                    });
                } else {
                    // Xóa phân công cũ của môn đó tại lớp đó (1 môn 1 lớp 1 GV chính)
                    await tx.teacherAssignment.deleteMany({
                        where: {
                            classId,
                            subjectId,
                            schoolYearId,
                            semester
                        }
                    });

                    // Tạo phân công mới
                    await tx.teacherAssignment.create({
                        data: {
                            classId,
                            subjectId,
                            teacherId,
                            schoolYearId,
                            semester,
                            periodsPerWeek: parseInt(periodsPerWeek, 10) || 2,
                            note: note || null
                        }
                    });
                }
            }
        });

        // Ghi vết kiểm toán
        if (req.user?.id) {
            await AuditLogService.log({
                userId: req.user.id,
                action: 'assignment:batch_update',
                module: 'teaching_assignment',
                resource: 'schedule',
                resourceId: schoolYearId,
                newValue: { assignmentsCount: assignments.length, academicYear, semester },
                reason: `Cập nhật ma trận phân công giảng dạy cho ${assignments.length} vị trí môn-lớp (${semester})`,
                req,
                severity: 'info'
            }).catch(e => console.warn('AuditLog error:', e.message));
        }

        res.json({
            success: true,
            message: `Lưu thành công ${assignments.length} phân công giảng dạy`
        });
    } catch (error) {
        console.error('Lỗi khi lưu ma trận phân công giảng dạy:', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật phân công giảng dạy' });
    }
};

/**
 * POST /api/teaching-assignments/single
 * Gán hoặc cập nhật 1 phân công đơn lẻ
 */
export const updateSingleAssignment = async (req, res) => {
    try {
        const { classId, subjectId, teacherId, periodsPerWeek, semester = 'HK1', academicYear = '2025-2026', note } = req.body;

        if (!classId || !subjectId) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin Lớp hoặc Môn học' });
        }

        let schoolYear = await prisma.schoolYear.findFirst({
            where: {
                OR: [{ code: academicYear }, { isCurrent: true }]
            }
        }) || await prisma.schoolYear.findFirst();

        const schoolYearId = schoolYear?.id;

        if (!teacherId || teacherId === 'unassigned') {
            await prisma.teacherAssignment.deleteMany({
                where: { classId, subjectId, schoolYearId, semester }
            });
            return res.json({ success: true, message: 'Đã hủy phân công cho lớp học này' });
        }

        // Xóa cũ & tạo mới
        await prisma.teacherAssignment.deleteMany({
            where: { classId, subjectId, schoolYearId, semester }
        });

        const created = await prisma.teacherAssignment.create({
            data: {
                classId,
                subjectId,
                teacherId,
                schoolYearId,
                semester,
                periodsPerWeek: parseInt(periodsPerWeek, 10) || 2,
                note: note || null
            }
        });

        res.json({ success: true, data: created, message: 'Cập nhật phân công thành công' });
    } catch (error) {
        console.error('Lỗi khi cập nhật phân công đơn lẻ:', error);
        res.status(500).json({ success: false, message: 'Không thể cập nhật phân công' });
    }
};
