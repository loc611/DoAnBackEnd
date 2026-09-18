import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';
import AuditLogService from '../services/auditLogService.js';
import { 
    isValidPhoneNumber, 
    isValidStudentCode, 
    isPhoneTakenInSystem, 
    isStudentCodeTaken 
} from '../utils/validator.js';
import { autoAssignFeeProfilesForStudent } from '../utils/feeAutoAssign.js';
import { createOutboxEvent, formatStudentPayload } from '../services/outboxService.js';

export const getStudents = async (req, res) => {
    try {
        const userRole = (req.user?.role || '').toLowerCase();

        // 1. Học sinh: Chỉ xem thông tin của chính mình
        if (userRole === 'student') {
            const student = await prisma.student.findFirst({
                where: { userId: req.user.id },
                include: {
                    user: { select: { username: true, email: true, status: true } },
                    class: { select: { className: true, grade: true } }
                }
            });
            return res.json(student ? [student] : []);
        }

        // 2. Phụ huynh: Chỉ xem danh sách con em của mình
        if (userRole === 'parent') {
            const parent = await prisma.parent.findFirst({
                where: { userId: req.user.id },
                include: { guardianLinks: { select: { studentId: true } } }
            });
            const studentIds = parent ? parent.guardianLinks.map(l => l.studentId) : [];
            const students = await prisma.student.findMany({
                where: { id: { in: studentIds } },
                include: {
                    user: { select: { email: true, status: true } },
                    class: { select: { className: true } }
                },
                orderBy: { fullName: 'asc' }
            });
            return res.json(students);
        }

        // 3. Giáo viên bộ môn & Chủ nhiệm: Chỉ xem học sinh thuộc các lớp mình phụ trách
        const isBgh = userRole === 'admin' || userRole === 'principal' || req.user.teacher?.position?.includes('Trưởng khoa') || req.user.teacher?.position?.includes('Ban giám hiệu');

        if (userRole === 'teacher' && !isBgh && req.user.teacher) {
            const teacherId = req.user.teacher.id;
            const assignments = await prisma.teacherAssignment.findMany({ where: { teacherId }, select: { classId: true } });
            const homerooms = await prisma.homeroomAssignment.findMany({ where: { teacherId }, select: { classId: true } });
            const classIds = [...new Set([...assignments.map(a => a.classId), ...homerooms.map(h => h.classId)])];

            const students = await prisma.student.findMany({
                where: { classId: { in: classIds } },
                include: {
                    user: { select: { email: true, status: true } },
                    class: { select: { className: true } }
                },
                orderBy: { studentCode: 'asc' }
            });
            return res.json(students);
        }
        
        // 4. BGH / Admin / Giám thị: Xem danh sách toàn trường
        const students = await prisma.student.findMany({
            include: {
                user: { select: { username: true, email: true, status: true } },
                class: { select: { className: true, grade: true } }
            },
            orderBy: { studentCode: 'asc' }
        });
        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách học sinh' });
    }
};

export const getStudentById = async (req, res) => {
    try {
        const student = await prisma.student.findUnique({
            where: { id: req.params.id },
            include: {
                user: { select: { email: true, status: true, username: true } },
                class: { 
                    select: { 
                        id: true, 
                        className: true, 
                        grade: true, 
                        academicYear: true,
                        homeroomTeacher: { select: { fullName: true, phone: true } }
                    } 
                },
                guardianLinks: {
                    include: {
                        parent: true
                    }
                },
                healthRecord: true,
                documents: {
                    orderBy: { createdAt: 'desc' }
                },
                policies: {
                    where: { status: 'ACTIVE' }
                },
                grades: true,
                subjectGrades: {
                    include: {
                        subject: true
                    }
                },
                attendances: { 
                    orderBy: { date: 'desc' } 
                },
                feeBills: { 
                    include: { 
                        feeProfile: true,
                        transactions: {
                            orderBy: { paidAt: 'desc' }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        
        if (!student) {
            return res.status(404).json({ message: 'Không tìm thấy học sinh' });
        }

        const userRole = (req.user?.role || '').toLowerCase();
        const isAdmin = userRole === 'admin' || userRole === 'principal';

        // Kiểm tra chống IDOR:
        if (userRole === 'student' && student.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Học sinh chỉ được xem hồ sơ của chính mình' });
        }

        if (userRole === 'parent') {
            const isAuthorizedParent = student.guardianLinks.some(link => 
                link.parent?.userId === req.user.id && link.custodyType !== 'none'
            );
            if (!isAuthorizedParent && !isAdmin) {
                return res.status(403).json({ success: false, message: 'Bạn không có quyền xem hồ sơ của học sinh này' });
            }
        }

        // Lọc bớt thông tin tài chính nhạy cảm nếu người xem không phải Admin, Kế toán, hoặc Phụ huynh/Học sinh đó
        const canViewFinance = isAdmin || 
                               userRole === 'accountant' || 
                               userRole === 'office_staff' ||
                               (userRole === 'student' && student.userId === req.user.id) ||
                               (userRole === 'parent' && student.guardianLinks.some(l => l.parent?.userId === req.user.id && l.accessFinances));

        if (!canViewFinance) {
            delete student.feeBills;
        }

        res.json(student);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi lấy thông tin học sinh' });
    }
};

const generateRandomStudentCode = () => `HS${Math.floor(100000 + Math.random() * 900000)}`;

export const createStudent = async (req, res) => {
    try {
        let { studentCode, fullName, gender, classId, phone, parentPhone } = req.body;

        // Chuẩn hóa và validate mã học sinh
        if (studentCode && studentCode.trim()) {
            studentCode = studentCode.trim().toUpperCase();
            if (!isValidStudentCode(studentCode)) {
                return res.status(400).json({ 
                    message: 'Mã học sinh không đúng định dạng (phải bắt đầu bằng HS và theo sau là các chữ số, VD: HS123456)' 
                });
            }
            const exists = await isStudentCodeTaken(prisma, studentCode);
            if (exists) {
                return res.status(400).json({ message: 'Mã học sinh đã tồn tại trong hệ thống' });
            }
        } else {
            let isUnique = false;
            while (!isUnique) {
                const testCode = generateRandomStudentCode();
                const exists = await prisma.student.findUnique({ where: { studentCode: testCode } });
                if (!exists) {
                    studentCode = testCode;
                    isUnique = true;
                }
            }
        }

        // Validate SĐT cá nhân học sinh (bắt buộc đúng 10 số bắt đầu bằng 0 & duy nhất toàn hệ thống)
        if (phone) {
            phone = String(phone).trim();
            if (!isValidPhoneNumber(phone)) {
                return res.status(400).json({ message: 'Số điện thoại cá nhân phải gồm đúng 10 chữ số, bắt đầu bằng 0' });
            }
            const phoneExists = await isPhoneTakenInSystem(prisma, phone);
            if (phoneExists) {
                return res.status(400).json({ message: 'Số điện thoại cá nhân này đã được sử dụng trong hệ thống' });
            }
        }

        // Validate SĐT phụ huynh (đúng 10 số bắt đầu bằng 0, cho phép trùng giữa các học sinh)
        if (parentPhone) {
            parentPhone = String(parentPhone).trim();
            if (!isValidPhoneNumber(parentPhone)) {
                return res.status(400).json({ message: 'SĐT phụ huynh phải gồm đúng 10 chữ số, bắt đầu bằng 0' });
            }
        }

        const username = studentCode.toLowerCase();
        const email = `${username}@school.edu.vn`;
        
        const userExists = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] }
        });
        if (userExists) {
            return res.status(400).json({ message: 'Tài khoản cho mã học sinh này đã tồn tại' });
        }

        const defaultPassword = req.body.password || '1111';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const newStudent = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    username,
                    email,
                    password: hashedPassword,
                    role: 'student',
                    status: 'active'
                }
            });

            // Tự động liên kết vai trò student trong RBAC Scope
            const studentRole = await tx.role.findUnique({ where: { name: 'student' } });
            if (studentRole) {
                await tx.userRole.create({
                    data: { userId: user.id, roleId: studentRole.id }
                });
            }

            const createdStudent = await tx.student.create({
                data: {
                    userId: user.id,
                    studentCode,
                    fullName: fullName ? fullName.trim() : '',
                    gender: gender || 'Nam',
                    classId: classId || null,
                    phone: phone || null,
                    parentPhone: parentPhone || null
                },
                include: {
                    class: { select: { className: true, grade: true } }
                }
            });

            // Ghi nhận Outbox Event trong cùng transaction
            await createOutboxEvent(tx, {
                aggregateType: 'STUDENT',
                aggregateId: createdStudent.id,
                eventType: 'STUDENT_CREATED',
                version: createdStudent.version || 1,
                payload: formatStudentPayload(createdStudent)
            });

            return createdStudent;
        });

        // Tự động gán học phí của lớp cho học sinh mới
        if (newStudent.classId) {
            await autoAssignFeeProfilesForStudent(newStudent.id, newStudent.classId);
        }

        res.status(201).json(newStudent);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Lỗi server khi tạo học sinh' });
    }
};

export const updateStudent = async (req, res) => {
    try {
        let { 
            studentCode, 
            fullName, 
            gender, 
            classId, 
            phone, 
            parentName,
            parentPhone, 
            status,
            dateOfBirth,
            academicYear,
            email,
            cccdNumber,
            ethnicity,
            religion,
            birthPlace,
            permanentAddress,
            address
        } = req.body;

        const student = await prisma.student.findUnique({ 
            where: { id: req.params.id },
            include: { user: true }
        });
        if (!student) {
            return res.status(404).json({ message: 'Không tìm thấy học sinh' });
        }

        // Quy tắc bất biến: Tuyệt đối không cho phép sửa mã học sinh
        if (studentCode !== undefined && studentCode !== null && studentCode !== '') {
            const normalizedCode = String(studentCode).trim().toUpperCase();
            if (normalizedCode !== student.studentCode) {
                return res.status(400).json({ message: 'Mã học sinh là trường bất biến, không thể thay đổi' });
            }
        }
        const immutableStudentCode = student.studentCode;

        // Validate Email nếu có cập nhật
        if (email !== undefined && email !== null && email !== '' && student.userId) {
            email = String(email).trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ message: 'Email không đúng định dạng' });
            }
            const emailExists = await prisma.user.findFirst({
                where: { email, NOT: { id: student.userId } }
            });
            if (emailExists) {
                return res.status(400).json({ message: 'Email này đã được sử dụng bởi tài khoản khác' });
            }
        }

        // Validate Trạng thái tài khoản nếu có
        const allowedStatuses = ['active', 'suspended', 'withdrawn', 'blocked', 'inactive'];
        if (status !== undefined && status !== null && status !== '') {
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({ message: 'Trạng thái tài khoản không hợp lệ' });
            }
        }


        // Validate số điện thoại cá nhân (định dạng + duy nhất toàn hệ thống)
        if (phone !== undefined && phone !== null && phone !== '') {
            phone = String(phone).trim();
            if (!isValidPhoneNumber(phone)) {
                return res.status(400).json({ message: 'Số điện thoại cá nhân phải gồm đúng 10 chữ số, bắt đầu bằng 0' });
            }
            const phoneTaken = await isPhoneTakenInSystem(prisma, phone, {
                excludeStudentId: req.params.id,
                excludeUserId: student.userId
            });
            if (phoneTaken) {
                return res.status(400).json({ message: 'Số điện thoại cá nhân này đã được sử dụng trong hệ thống' });
            }
        }

        // Validate SĐT phụ huynh (SĐT liên hệ khẩn cấp) nếu có
        if (parentPhone !== undefined && parentPhone !== null && parentPhone !== '') {
            parentPhone = String(parentPhone).trim();
            if (!isValidPhoneNumber(parentPhone)) {
                return res.status(400).json({ message: 'SĐT phụ huynh (liên hệ khẩn cấp) phải gồm đúng 10 chữ số, bắt đầu bằng 0' });
            }
        }

        // Validate Ngày sinh
        let parsedDob = undefined;
        if (dateOfBirth !== undefined) {
            if (dateOfBirth === '' || dateOfBirth === null) {
                parsedDob = null;
            } else {
                const d = new Date(dateOfBirth);
                if (isNaN(d.getTime())) {
                    return res.status(400).json({ message: 'Ngày sinh không hợp lệ' });
                }
                parsedDob = d;
            }
        }

        const updatedStudent = await prisma.$transaction(async (tx) => {
            if (student.userId) {
                const userUpdateData = {};
                if (status && status !== student.user?.status) userUpdateData.status = status;
                if (email && email !== student.user?.email) userUpdateData.email = email;
                if (Object.keys(userUpdateData).length > 0) {
                    await tx.user.update({
                        where: { id: student.userId },
                        data: userUpdateData
                    });
                }
            }

            const studentRecord = await tx.student.update({
                where: { id: req.params.id },
                data: {
                    studentCode: immutableStudentCode,
                    fullName: fullName !== undefined ? fullName.trim() : undefined,
                    gender: gender !== undefined ? gender : undefined,
                    dateOfBirth: parsedDob,
                    parentName: parentName !== undefined ? (parentName === '' ? null : parentName.trim()) : undefined,
                    parentPhone: parentPhone !== undefined ? (parentPhone === '' ? null : parentPhone) : undefined,
                    academicYear: academicYear !== undefined ? (academicYear === '' ? null : academicYear.trim()) : undefined,
                    classId: classId !== undefined ? (classId === '' ? null : classId) : undefined,
                    phone: phone !== undefined ? (phone === '' ? null : phone) : undefined,
                    cccdNumber: cccdNumber !== undefined ? (cccdNumber === '' ? null : String(cccdNumber).trim()) : undefined,
                    ethnicity: ethnicity !== undefined ? (ethnicity === '' ? 'Kinh' : String(ethnicity).trim()) : undefined,
                    religion: religion !== undefined ? (religion === '' ? 'Không' : String(religion).trim()) : undefined,
                    birthPlace: birthPlace !== undefined ? (birthPlace === '' ? null : String(birthPlace).trim()) : undefined,
                    permanentAddress: permanentAddress !== undefined ? (permanentAddress === '' ? null : String(permanentAddress).trim()) : undefined,
                    address: address !== undefined ? (address === '' ? null : String(address).trim()) : undefined,
                    version: { increment: 1 }
                },
                include: {
                    user: { select: { username: true, email: true, status: true } },
                    class: { select: { className: true, grade: true } }
                }
            });

            // Ghi nhận Outbox Event trong cùng transaction
            await createOutboxEvent(tx, {
                aggregateType: 'STUDENT',
                aggregateId: studentRecord.id,
                eventType: 'STUDENT_UPDATED',
                version: studentRecord.version,
                payload: formatStudentPayload(studentRecord)
            });

            return studentRecord;
        });

        // Nếu học sinh được xếp/chuyển vào lớp mới, tự động gán các khoản học phí của lớp đó
        if (updatedStudent.classId && updatedStudent.classId !== student.classId) {
            await autoAssignFeeProfilesForStudent(updatedStudent.id, updatedStudent.classId);
        }

        res.json(updatedStudent);
    } catch (error) {
        console.error('Update Student Error:', error);
        res.status(500).json({ message: error.message || 'Lỗi server khi cập nhật' });
    }
};

export const deleteStudent = async (req, res) => {
    try {
        const student = await prisma.student.findUnique({ where: { id: req.params.id } });
        if (!student) {
            return res.status(404).json({ message: 'Không tìm thấy học sinh' });
        }

        await prisma.$transaction(async (tx) => {
            // Ghi nhận Outbox Event trước khi xoá trong cùng transaction
            await createOutboxEvent(tx, {
                aggregateType: 'STUDENT',
                aggregateId: student.id,
                eventType: 'STUDENT_DELETED',
                version: (student.version || 1) + 1,
                payload: { id: student.id }
            });

            await tx.student.delete({ where: { id: req.params.id } });
            if (student.userId) {
                await tx.user.delete({ where: { id: student.userId } });
            }
        });
        
        res.json({ message: 'Đã xoá học sinh' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi xoá' });
    }
};

/**
 * Lấy tóm tắt chuyên cần chính xác chuẩn THPT (Buổi học, Tỷ lệ %, Cảnh báo vắng > 45 buổi)
 * @route GET /api/students/:id/attendance-summary
 */
export const getStudentAttendanceSummary = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await prisma.student.findUnique({
            where: { id },
            include: {
                attendances: true
            }
        });

        if (!student) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy học sinh' });
        }

        const attendances = student.attendances || [];
        const total = attendances.length;
        const present = attendances.filter(a => a.status === 'present').length;
        const late = attendances.filter(a => a.status === 'late').length;
        const excused = attendances.filter(a => a.status === 'excused').length;
        const unexcused = attendances.filter(a => a.status === 'unexcused').length;
        const absentTotal = excused + unexcused;
        const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 100;
        const isAtRisk = absentTotal > 35;

        res.json({
            success: true,
            data: {
                totalSessions: total,
                present,
                late,
                excused,
                unexcused,
                absentTotal,
                attendanceRate,
                isAtRisk,
                maxAllowedAbsence: 45
            }
        });
    } catch (error) {
        console.error('getStudentAttendanceSummary error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy thống kê chuyên cần' });
    }
};

/**
 * Cấp lại / Reset mật khẩu bảo mật 1 lần cho học sinh (One-Time Display)
 * @route POST /api/students/:id/reset-password
 */
export const resetStudentPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await prisma.student.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!student || !student.user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản học sinh' });
        }

        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const tempPassword = `Tt@2026#${randomSuffix}`;
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        await prisma.user.update({
            where: { id: student.userId },
            data: {
                password: hashedPassword,
                status: 'active'
            }
        });

        await AuditLogService.log({
            userId: req.user?.id,
            action: 'auth:reset_password',
            resourceType: 'student_profile',
            resourceId: student.id,
            newValue: { email: student.user.email, studentCode: student.studentCode },
            reason: 'Admin cấp lại mật khẩu tạm thời một lần (One-Time Password)',
            severity: 'warning'
        });

        res.json({
            success: true,
            message: 'Đã tạo mật khẩu tạm thời mới thành công',
            data: {
                studentCode: student.studentCode,
                fullName: student.fullName,
                email: student.user.email,
                temporaryPassword: tempPassword
            }
        });
    } catch (error) {
        console.error('resetStudentPassword error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi đặt lại mật khẩu' });
    }
};

/**
 * Thao tác hàng loạt: Reset mật khẩu nhiều học sinh
 * @route POST /api/students/bulk/reset-password
 */
export const bulkResetPasswords = async (req, res) => {
    try {
        const { studentIds } = req.body;
        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Danh sách ID học sinh không hợp lệ' });
        }

        const students = await prisma.student.findMany({
            where: { id: { in: studentIds } },
            include: { user: true }
        });

        const results = [];
        for (const student of students) {
            if (!student.user) continue;
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            const tempPassword = `Tt@${student.studentCode}#${randomSuffix}`;
            const hashedPassword = await bcrypt.hash(tempPassword, 10);

            await prisma.user.update({
                where: { id: student.userId },
                data: { password: hashedPassword, status: 'active' }
            });

            results.push({
                id: student.id,
                studentCode: student.studentCode,
                fullName: student.fullName,
                email: student.user.email,
                temporaryPassword: tempPassword
            });
        }

        await AuditLogService.log({
            userId: req.user?.id,
            action: 'auth:bulk_reset_password',
            resourceType: 'student_profile',
            newValue: { count: results.length },
            reason: `Admin reset mật khẩu hàng loạt cho ${results.length} học sinh`,
            severity: 'warning'
        });

        res.json({
            success: true,
            message: `Đã đặt lại mật khẩu cho ${results.length} học sinh`,
            data: results
        });
    } catch (error) {
        console.error('bulkResetPasswords error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi reset mật khẩu hàng loạt' });
    }
};

/**
 * Thao tác hàng loạt: Chuyển lớp nhiều học sinh
 * @route POST /api/students/bulk/change-class
 */
export const bulkChangeClass = async (req, res) => {
    try {
        const { studentIds, targetClassId } = req.body;
        if (!Array.isArray(studentIds) || studentIds.length === 0 || !targetClassId) {
            return res.status(400).json({ success: false, message: 'Dữ liệu không đầy đủ (studentIds, targetClassId)' });
        }

        const targetClass = await prisma.class.findUnique({ where: { id: targetClassId } });
        if (!targetClass) {
            return res.status(404).json({ success: false, message: 'Lớp học đích không tồn tại' });
        }

        await prisma.student.updateMany({
            where: { id: { in: studentIds } },
            data: { classId: targetClassId }
        });

        for (const sId of studentIds) {
            await autoAssignFeeProfilesForStudent(sId, targetClassId).catch(() => {});
        }

        await AuditLogService.log({
            userId: req.user?.id,
            action: 'student:bulk_change_class',
            resourceType: 'student_profile',
            newValue: { targetClassName: targetClass.className, count: studentIds.length },
            reason: `Admin chuyển ${studentIds.length} học sinh sang lớp ${targetClass.className}`,
            severity: 'info'
        });

        res.json({
            success: true,
            message: `Đã chuyển ${studentIds.length} học sinh sang lớp ${targetClass.className}`
        });
    } catch (error) {
        console.error('bulkChangeClass error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi chuyển lớp hàng loạt' });
    }
};

/**
 * Thao tác hàng loạt: Khóa / Mở khóa tài khoản nhiều học sinh
 * @route POST /api/students/bulk/toggle-status
 */
export const bulkToggleStatus = async (req, res) => {
    try {
        const { studentIds, status } = req.body;
        if (!Array.isArray(studentIds) || !['active', 'blocked'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ (active | blocked)' });
        }

        const students = await prisma.student.findMany({
            where: { id: { in: studentIds } },
            select: { userId: true }
        });

        const userIds = students.map(s => s.userId).filter(Boolean);

        await prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: { status }
        });

        await prisma.student.updateMany({
            where: { id: { in: studentIds } },
            data: { status }
        });

        await AuditLogService.log({
            userId: req.user?.id,
            action: 'student:bulk_toggle_status',
            resourceType: 'student_profile',
            newValue: { status, count: studentIds.length },
            reason: `Admin ${status === 'blocked' ? 'khóa' : 'mở khóa'} ${studentIds.length} tài khoản học sinh`,
            severity: 'warning'
        });

        res.json({
            success: true,
            message: `Đã ${status === 'blocked' ? 'khóa' : 'mở khóa'} thành công ${studentIds.length} tài khoản`
        });
    } catch (error) {
        console.error('bulkToggleStatus error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi thay đổi trạng thái tài khoản hàng loạt' });
    }
};

/**
 * Thao tác hàng loạt: Xóa nhiều học sinh
 * @route POST /api/students/bulk/delete
 */
export const bulkDeleteStudents = async (req, res) => {
    try {
        const { studentIds } = req.body;
        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Danh sách ID học sinh không hợp lệ' });
        }

        const students = await prisma.student.findMany({
            where: { id: { in: studentIds } },
            select: { id: true, userId: true }
        });

        const userIds = students.map(s => s.userId).filter(Boolean);

        await prisma.$transaction([
            prisma.student.deleteMany({ where: { id: { in: studentIds } } }),
            prisma.user.deleteMany({ where: { id: { in: userIds } } })
        ]);

        await AuditLogService.log({
            userId: req.user?.id,
            action: 'student:bulk_delete',
            resourceType: 'student_profile',
            newValue: { count: studentIds.length },
            reason: `Admin xóa hàng loạt ${studentIds.length} học sinh khỏi hệ thống`,
            severity: 'critical'
        });

        res.json({
            success: true,
            message: `Đã xóa thành công ${studentIds.length} học sinh`
        });
    } catch (error) {
        console.error('bulkDeleteStudents error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi xóa học sinh hàng loạt' });
    }
};

/**
 * Mô phỏng Chuyển năm học & Xếp lớp tự động (Simulation Preview)
 * @route POST /api/students/rollover/simulate
 */
export const simulateRollover = async (req, res) => {
    try {
        const { fromYear = '2025-2026', toYear = '2026-2027' } = req.body;

        const students = await prisma.student.findMany({
            where: { status: 'active' },
            include: {
                class: true,
                attendances: true,
                grades: true
            }
        });

        const graduated = [];
        const promoteTo12 = [];
        const promoteTo11 = [];
        const retainAtRisk = [];

        for (const s of students) {
            const grade = s.class?.grade;
            const absentCount = s.attendances.filter(a => a.status === 'unexcused' || a.status === 'excused').length;
            const isRetain = absentCount > 45;

            if (isRetain) {
                retainAtRisk.push({
                    id: s.id,
                    studentCode: s.studentCode,
                    fullName: s.fullName,
                    currentClass: s.class?.className,
                    reason: `Vắng ${absentCount} buổi (vượt quá 45 buổi quy định)`
                });
                continue;
            }

            if (grade === 12) {
                graduated.push({
                    id: s.id,
                    studentCode: s.studentCode,
                    fullName: s.fullName,
                    currentClass: s.class?.className,
                    targetStatus: 'graduated'
                });
            } else if (grade === 11) {
                promoteTo12.push({
                    id: s.id,
                    studentCode: s.studentCode,
                    fullName: s.fullName,
                    currentClass: s.class?.className,
                    targetGrade: 12
                });
            } else if (grade === 10) {
                promoteTo11.push({
                    id: s.id,
                    studentCode: s.studentCode,
                    fullName: s.fullName,
                    currentClass: s.class?.className,
                    targetGrade: 11
                });
            }
        }

        res.json({
            success: true,
            data: {
                fromYear,
                toYear,
                summary: {
                    totalEvaluated: students.length,
                    graduatedCount: graduated.length,
                    promoteTo12Count: promoteTo12.length,
                    promoteTo11Count: promoteTo11.length,
                    retainCount: retainAtRisk.length
                },
                graduatedSample: graduated.slice(0, 10),
                promoteTo12Sample: promoteTo12.slice(0, 10),
                promoteTo11Sample: promoteTo11.slice(0, 10),
                retainList: retainAtRisk
            }
        });
    } catch (error) {
        console.error('simulateRollover error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi mô phỏng chuyển năm học' });
    }
};

/**
 * Thực thi Chuyển năm học & Xếp lớp tự động
 * @route POST /api/students/rollover/execute
 */
export const executeRollover = async (req, res) => {
    try {
        const { toYear = '2026-2027' } = req.body;

        const students = await prisma.student.findMany({
            where: { status: 'active' },
            include: { class: true, attendances: true }
        });

        let graduatedCount = 0;
        let retainedCount = 0;

        await prisma.$transaction(async (tx) => {
            for (const s of students) {
                const grade = s.class?.grade;
                const absentCount = s.attendances.filter(a => a.status === 'unexcused' || a.status === 'excused').length;
                
                if (absentCount > 45) {
                    retainedCount++;
                    continue;
                }

                if (grade === 12) {
                    await tx.student.update({
                        where: { id: s.id },
                        data: { status: 'graduated' }
                    });
                    graduatedCount++;
                }
            }
        });

        await AuditLogService.log({
            userId: req.user?.id,
            action: 'academic:rollover_executed',
            resourceType: 'system',
            newValue: { toYear, graduatedCount, retainedCount },
            reason: `Admin thực thi chuyển năm học mới ${toYear}`,
            severity: 'critical'
        });

        res.json({
            success: true,
            message: `Chuyển năm học thành công: ${graduatedCount} học sinh tốt nghiệp, ${retainedCount} học sinh lưu ban.`
        });
    } catch (error) {
        console.error('executeRollover error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi thực thi chuyển năm học' });
    }
};

/**
 * Cập nhật Hồ sơ Y tế & Sức khỏe học sinh
 * @route PUT /api/students/:id/health-record
 */
export const updateStudentHealthRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            bloodGroup,
            heightCm,
            weightKg,
            visionLeft,
            visionRight,
            refractiveError,
            chronicDiseases,
            allergies,
            healthInsuranceNumber,
            healthInsuranceExpires,
            notes
        } = req.body;

        const height = heightCm ? Number(heightCm) : null;
        const weight = weightKg ? Number(weightKg) : null;
        let bmi = null;
        let bmiClassification = null;

        if (height && weight && height > 0) {
            const heightInMeters = height / 100;
            bmi = Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
            if (bmi < 18.5) bmiClassification = 'Thiếu cân';
            else if (bmi < 23) bmiClassification = 'Bình thường';
            else if (bmi < 25) bmiClassification = 'Thừa cân';
            else bmiClassification = 'Béo phì';
        }

        const healthRecord = await prisma.studentHealthRecord.upsert({
            where: { studentId: id },
            update: {
                bloodGroup,
                heightCm: height,
                weightKg: weight,
                bmi,
                bmiClassification,
                visionLeft,
                visionRight,
                refractiveError,
                chronicDiseases,
                allergies,
                healthInsuranceNumber,
                healthInsuranceExpires: healthInsuranceExpires ? new Date(healthInsuranceExpires) : undefined,
                notes
            },
            create: {
                studentId: id,
                bloodGroup,
                heightCm: height,
                weightKg: weight,
                bmi,
                bmiClassification,
                visionLeft,
                visionRight,
                refractiveError,
                chronicDiseases,
                allergies,
                healthInsuranceNumber,
                healthInsuranceExpires: healthInsuranceExpires ? new Date(healthInsuranceExpires) : undefined,
                notes
            }
        });

        res.json({
            success: true,
            message: 'Cập nhật hồ sơ sức khỏe thành công',
            data: healthRecord
        });
    } catch (error) {
        console.error('updateStudentHealthRecord error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật hồ sơ y tế' });
    }
};

/**
 * Thêm tài liệu số hóa cho học sinh
 * @route POST /api/students/:id/documents
 */
export const createStudentDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { documentType, title, fileUrl, fileType, fileSizeBytes } = req.body;

        if (!documentType || !title || !fileUrl) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin tài liệu bắt buộc' });
        }

        const doc = await prisma.studentDocument.create({
            data: {
                studentId: id,
                documentType,
                title,
                fileUrl,
                fileType: fileType || 'image/jpeg',
                fileSizeBytes: fileSizeBytes ? Number(fileSizeBytes) : 0,
                isVerified: true,
                verifiedById: req.user?.id,
                verifiedAt: new Date()
            }
        });

        res.json({
            success: true,
            message: 'Đã thêm tài liệu thành công',
            data: doc
        });
    } catch (error) {
        console.error('createStudentDocument error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi thêm tài liệu' });
    }
};

/**
 * Xóa tài liệu số hóa
 * @route DELETE /api/students/:id/documents/:docId
 */
export const deleteStudentDocument = async (req, res) => {
    try {
        const { docId } = req.params;
        await prisma.studentDocument.delete({ where: { id: docId } });
        res.json({ success: true, message: 'Đã xóa tài liệu' });
    } catch (error) {
        console.error('deleteStudentDocument error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi xóa tài liệu' });
    }
};

