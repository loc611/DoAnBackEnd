import prisma from '../prismaClient.js';
import AuditLogService from '../services/auditLogService.js';

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

        let isClassGradingLocked = false;
        if (students.length > 0) {
            const hasGrades = students.some(s => s.grades.length > 0);
            if (hasGrades) {
                // If any grade is locked or all grades are locked
                isClassGradingLocked = students.every(s => s.grades.length > 0 && s.grades[0].status === 'locked');
            }
        }

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
            status: isClassGradingLocked ? 'locked' : 'draft',
            students: result
        });
    } catch (error) {
        console.error(error);
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

        const gradeStatus = status === 'locked' ? 'locked' : 'draft';
        const requiredPerm = gradeStatus === 'locked' ? 'grade.lock_publish' : 'grade.input_draft';

        // Kiểm tra phân quyền ABAC
        if (req.user && req.user.can) {
            const check = await req.user.can(requiredPerm, { classId, reason });
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

                await tx.grade.upsert({
                    where: uniqueInput,
                    update: {
                        status: gradeStatus,
                        math: Number(item.scores?.math) || 0,
                        literature: Number(item.scores?.literature) || 0,
                        english: Number(item.scores?.english) || 0,
                        physics: Number(item.scores?.physics) || 0,
                        chemistry: Number(item.scores?.chemistry) || 0,
                        it: Number(item.scores?.it) || 0
                    },
                    create: {
                        studentId: item.studentId,
                        classId: classId,
                        semester: semester,
                        status: gradeStatus,
                        math: Number(item.scores?.math) || 0,
                        literature: Number(item.scores?.literature) || 0,
                        english: Number(item.scores?.english) || 0,
                        physics: Number(item.scores?.physics) || 0,
                        chemistry: Number(item.scores?.chemistry) || 0,
                        it: Number(item.scores?.it) || 0
                    }
                });
            }
        });

        // Ghi vết kiểm toán (Audit Logging)
        await AuditLogService.log({
            userId: req.user?.id,
            action: gradeStatus === 'locked' ? 'GRADE_LOCK_PUBLISH' : 'GRADE_INPUT_DRAFT',
            module: 'grade',
            resource: 'Grade',
            resourceId: classId,
            newData: { classId, semester, status: gradeStatus, totalStudents: grades.length },
            reason: reason || (gradeStatus === 'locked' ? 'Khóa & Công bố điểm lớp' : 'Lưu nháp điểm'),
            req,
            severity: gradeStatus === 'locked' ? 'critical' : 'info'
        });

        res.json({ 
            message: gradeStatus === 'locked' 
                ? 'Đã khóa bảng điểm và công bố cho học sinh' 
                : 'Đã lưu nháp bảng điểm thành công',
            status: gradeStatus
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật điểm' });
    }
};

export const unlockClassGrades = async (req, res) => {
    try {
        const { classId } = req.params;
        const { semester = 'HK1_2026', reason } = req.body;

        // Chỉ Admin, Ban Giám Hiệu, hoặc Quản Khoa mới có quyền mở khóa bảng điểm
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { teacher: true, admin: true }
        });

        const isAdmin = user?.role === 'admin' || !!user?.admin;
        const isManagement = user?.teacher?.position === 'Trưởng khoa / Quản khoa' || 
                             user?.teacher?.position === 'Ban giám hiệu';

        if (!isAdmin && !isManagement) {
            return res.status(403).json({ 
                message: 'Chỉ Ban Giám Hiệu, Quản Khoa hoặc Quản trị viên mới có quyền mở khóa bảng điểm đã niêm phong' 
            });
        }

        if (!reason || !reason.trim()) {
            return res.status(400).json({ 
                message: 'Vui lòng cung cấp lý do mở khóa bảng điểm để ghi nhật ký kiểm toán (Audit Log)' 
            });
        }

        await prisma.grade.updateMany({
            where: {
                classId: classId,
                semester: semester
            },
            data: {
                status: 'draft'
            }
        });

        // Ghi vết kiểm toán (Audit Logging)
        await AuditLogService.log({
            userId: req.user.id,
            action: 'GRADE_UNLOCK',
            module: 'grade',
            resource: 'Grade',
            resourceId: classId,
            newData: { classId, semester, status: 'draft' },
            reason: reason.trim(),
            req,
            severity: 'critical'
        });

        res.json({
            message: 'Đã mở khóa bảng điểm thành công. Giáo viên có thể chỉnh sửa lại điểm số.',
            status: 'draft'
        });
    } catch (error) {
        console.error('Error unlocking grades:', error);
        res.status(500).json({ message: 'Lỗi server khi mở khóa bảng điểm' });
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

        const rawGrades = await prisma.grade.findMany({
            where: { studentId: student.id },
            include: {
                class: true
            },
            orderBy: { semester: 'asc' }
        });

        // Chỉ công bố điểm số thực tế khi status === 'locked' (Đã khóa & công bố)
        // Nếu status === 'draft', học sinh thấy thông báo chờ công bố
        const grades = rawGrades.map(g => {
            const isLocked = g.status === 'locked';
            return {
                id: g.id,
                studentId: g.studentId,
                classId: g.classId,
                semester: g.semester,
                status: g.status,
                isLocked: isLocked,
                math: isLocked ? g.math : null,
                literature: isLocked ? g.literature : null,
                english: isLocked ? g.english : null,
                physics: isLocked ? g.physics : null,
                chemistry: isLocked ? g.chemistry : null,
                it: isLocked ? g.it : null,
                conductScore: g.conductScore,
                createdAt: g.createdAt,
                updatedAt: g.updatedAt,
                class: g.class
            };
        });

        res.json({ student, grades });
    } catch (error) {
        console.error('Error in getMyGrades:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy bảng điểm cá nhân' });
    }
};

