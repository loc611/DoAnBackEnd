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

// ============================================================================
// HẰNG SỐ CẤU HÌNH NGHIỆP VỤ (CONSTANTS)
// ============================================================================
const BCRYPT_SALT_ROUNDS = 10;
const DEFAULT_STUDENT_PASSWORD = '1111';
const MAX_ALLOWED_ABSENCE = 45;
const AT_RISK_ABSENCE_THRESHOLD = 35;
const MAX_RANDOM_CODE_ATTEMPTS = 15;
const BATCH_CHUNK_SIZE = 15;
const DEFAULT_EMAIL_DOMAIN = '@school.edu.vn';
const DEFAULT_GENDER = 'Nam';
const DEFAULT_ETHNICITY = 'Kinh';
const DEFAULT_RELIGION = 'Không';
const DEFAULT_DOCUMENT_FILE_TYPE = 'image/jpeg';
const ALLOWED_STUDENT_STATUSES = Object.freeze(['active', 'suspended', 'withdrawn', 'blocked', 'inactive']);
const ALLOWED_BULK_TOGGLE_STATUSES = Object.freeze(['active', 'blocked']);

const BMI_THRESHOLDS = Object.freeze({
    UNDERWEIGHT: 18.5,
    NORMAL: 23,
    OVERWEIGHT: 25
});

// Roles được phép xem danh sách toàn trường (BGH / Quản trị viên / Giám thị)
const SCHOOL_WIDE_VIEW_ROLES = Object.freeze([
    'admin', 
    'principal', 
    'vice_principal', 
    'supervisor', 
    'office_staff', 
    'accountant'
]);

// Roles được phép quản lý / cập nhật hồ sơ y tế & tài liệu số hóa
const STAFF_OR_ADMIN_ROLES = Object.freeze([
    'admin', 
    'principal', 
    'vice_principal', 
    'office_staff', 
    'teacher', 
    'homeroom_teacher'
]);

// ============================================================================
// CÁC HÀM TIỆN ÍCH DÙNG CHUNG (HELPER FUNCTIONS)
// ============================================================================

/**
 * Helper an toàn ghi vết kiểm toán không làm gián đoạn transaction chính
 */
const safeAuditLog = async (logData) => {
    try {
        await AuditLogService.log(logData);
    } catch (auditErr) {
        console.error('[AuditLog] Ghi vết kiểm toán thất bại:', auditErr?.message || auditErr);
    }
};

/**
 * Helper tính toán chỉ số BMI chuẩn học đường
 */
const calculateBmi = (heightCm, weightKg) => {
    const height = heightCm ? Number(heightCm) : null;
    const weight = weightKg ? Number(weightKg) : null;
    let bmi = null;
    let bmiClassification = null;

    if (height && weight && height > 0) {
        const heightInMeters = height / 100;
        bmi = Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
        if (bmi < BMI_THRESHOLDS.UNDERWEIGHT) bmiClassification = 'Thiếu cân';
        else if (bmi < BMI_THRESHOLDS.NORMAL) bmiClassification = 'Bình thường';
        else if (bmi < BMI_THRESHOLDS.OVERWEIGHT) bmiClassification = 'Thừa cân';
        else bmiClassification = 'Béo phì';
    }

    return { height, weight, bmi, bmiClassification };
};

/**
 * Sinh mã học sinh ngẫu nhiên định dạng HS + 6 chữ số
 */
const generateRandomStudentCode = () => `HS${Math.floor(100000 + Math.random() * 900000)}`;

/**
 * Helper parse ngày tháng an toàn, tránh Invalid Date gây lỗi Prisma
 */
const parseDateSafely = (dateValue) => {
    if (dateValue === undefined || dateValue === null || dateValue === '') return null;
    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? null : d;
};

/**
 * Helper kiểm tra người dùng có quyền quản trị hoặc nhân sự nhà trường
 */
const isStaffOrAdminUser = (role) => STAFF_OR_ADMIN_ROLES.includes((role || '').toLowerCase());

/**
 * Helper kiểm tra người dùng có quyền xem toàn trường
 */
const isSchoolWideRole = (role, position = '') => {
    const r = (role || '').toLowerCase();
    return SCHOOL_WIDE_VIEW_ROLES.includes(r) ||
        position.includes('Trưởng khoa') ||
        position.includes('Ban giám hiệu');
};

/**
 * Helper xử lý lỗi Prisma P2002 (Unique constraint violation) thân thiện với client
 */
const handlePrismaError = (error, res, defaultMessage) => {
    console.error(defaultMessage, error);
    if (error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target) 
            ? error.meta.target.join(', ') 
            : (error.meta?.target || 'thông tin');
        return res.status(400).json({ 
            message: `Dữ liệu bị trùng lặp (${target}). Vui lòng kiểm tra lại.` 
        });
    }
    return res.status(500).json({ message: error.message || defaultMessage });
};

// ============================================================================
// 1. TRUY VẤN DANH SÁCH HỌC SINH (RBAC + SCOPE PHÂN QUYỀN + BỘ LỌC QUERY)
// ============================================================================
export const getStudents = async (req, res) => {
    try {
        const userRole = (req.user?.role || '').toLowerCase();
        const { grade, classId, status, limit } = req.query;

        // Xây dựng bộ lọc bổ sung an toàn từ query params (giữ nguyên output dạng mảng)
        const commonFilter = {};
        if (classId) commonFilter.classId = String(classId);
        if (status) commonFilter.status = String(status);
        if (grade) commonFilter.class = { grade: Number(grade) };
        const takeLimit = limit ? Math.min(Math.max(1, Number(limit) || 500), 1000) : undefined;

        // 1. Học sinh: Chỉ xem thông tin của chính mình
        if (userRole === 'student') {
            const student = await prisma.student.findFirst({
                where: { userId: req.user.id },
                include: {
                    user: { select: { username: true, email: true, status: true } },
                    class: { select: { id: true, className: true, grade: true } }
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
            if (studentIds.length === 0) return res.json([]);

            const students = await prisma.student.findMany({
                where: { 
                    id: { in: studentIds },
                    ...commonFilter
                },
                include: {
                    user: { select: { username: true, email: true, status: true } },
                    class: { select: { id: true, className: true, grade: true } }
                },
                orderBy: { fullName: 'asc' }
            });
            return res.json(students);
        }

        // 3. Giáo viên bộ môn & Chủ nhiệm: Chỉ xem học sinh thuộc các lớp mình phụ trách
        const teacherPosition = req.user?.teacher?.position || '';
        const isBgh = isSchoolWideRole(userRole, teacherPosition);

        const isTeacherRole = userRole === 'teacher' || 
                              userRole === 'homeroom_teacher' || 
                              userRole === 'subject_teacher' ||
                              userRole.includes('teacher');

        if (isTeacherRole && !isBgh) {
            // Nạp thông tin teacher nếu chưa có trong req.user
            let teacherId = req.user?.teacher?.id;
            if (!teacherId) {
                const teacherRecord = await prisma.teacher.findFirst({ 
                    where: { userId: req.user.id },
                    select: { id: true }
                });
                teacherId = teacherRecord?.id;
            }

            if (!teacherId) {
                // Giáo viên chưa được liên kết profile teacher -> Trả về mảng rỗng thay vì làm rò rỉ toàn trường
                return res.json([]);
            }

            // Tối ưu hóa: Thực thi đồng thời 3 truy vấn phân công thay vì tuần tự
            const [assignments, homerooms, directHomerooms] = await Promise.all([
                prisma.teacherAssignment.findMany({ where: { teacherId }, select: { classId: true } }),
                prisma.homeroomAssignment.findMany({ where: { teacherId }, select: { classId: true } }),
                prisma.class.findMany({ where: { homeroomTeacherId: teacherId }, select: { id: true } })
            ]);

            const allowedClassIds = [...new Set([
                ...assignments.map(a => a.classId),
                ...homerooms.map(h => h.classId),
                ...directHomerooms.map(d => d.id)
            ])].filter(Boolean);

            if (allowedClassIds.length === 0) {
                return res.json([]);
            }

            // Nếu giáo viên yêu cầu lọc theo classId cụ thể, đảm bảo lớp đó nằm trong phạm vi được phân công
            const targetClassIds = classId 
                ? (allowedClassIds.includes(classId) ? [classId] : [])
                : allowedClassIds;

            if (targetClassIds.length === 0) {
                return res.json([]);
            }

            const students = await prisma.student.findMany({
                where: { 
                    classId: { in: targetClassIds },
                    ...(status ? { status: String(status) } : {}),
                    ...(grade ? { class: { grade: Number(grade) } } : {})
                },
                include: {
                    user: { select: { username: true, email: true, status: true } },
                    class: { select: { id: true, className: true, grade: true } }
                },
                orderBy: { studentCode: 'asc' },
                take: takeLimit
            });
            return res.json(students);
        }
        
        // 4. BGH / Admin / Giám thị / Nhân sự trường: Xem danh sách toàn trường
        if (!isBgh) {
            return res.status(403).json({ message: 'Không có quyền truy cập danh sách học sinh' });
        }

        const students = await prisma.student.findMany({
            where: commonFilter,
            include: {
                user: { select: { username: true, email: true, status: true } },
                class: { select: { id: true, className: true, grade: true } }
            },
            orderBy: { studentCode: 'asc' },
            take: takeLimit
        });
        res.json(students);
    } catch (error) {
        console.error('getStudents error:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách học sinh' });
    }
};

// ============================================================================
// 2. TRUY VẤN CHI TIẾT HỒ SƠ 360 HỌC SINH (CHỐNG IDOR & BẢO VỆ DỮ LIỆU NHẠY CẢM)
// ============================================================================
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
                    orderBy: { date: 'desc' },
                    take: 100 
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

        // Kiểm tra chống IDOR đối với Học sinh
        if (userRole === 'student' && student.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Học sinh chỉ được xem hồ sơ của chính mình' });
        }

        // Kiểm tra chống IDOR đối với Phụ huynh
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
        console.error('getStudentById error:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy thông tin học sinh' });
    }
};

// ============================================================================
// 3. TẠO MỚI HỌC SINH (TRANSACTION TOÀN VẸN & TRÁNH RACE CONDITION)
// ============================================================================
export const createStudent = async (req, res) => {
    try {
        let { 
            studentCode, 
            fullName, 
            gender, 
            classId, 
            phone, 
            parentPhone,
            parentName,
            dateOfBirth,
            academicYear,
            address,
            status
        } = req.body;

        // Chuẩn hóa và validate mã học sinh
        if (studentCode && String(studentCode).trim()) {
            studentCode = String(studentCode).trim().toUpperCase();
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
            // Tối ưu hóa: Giới hạn số lần thử sinh ngẫu nhiên để tránh treo luồng (infinite loop)
            let isUnique = false;
            let attempts = 0;
            while (!isUnique && attempts < MAX_RANDOM_CODE_ATTEMPTS) {
                attempts++;
                const testCode = generateRandomStudentCode();
                const exists = await prisma.student.findUnique({ where: { studentCode: testCode } });
                if (!exists) {
                    studentCode = testCode;
                    isUnique = true;
                }
            }
            if (!isUnique) {
                return res.status(500).json({ message: 'Không thể tự động sinh mã học sinh duy nhất. Vui lòng nhập mã học sinh thủ công.' });
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

        // Validate Ngày sinh an toàn
        let parsedDob = null;
        if (dateOfBirth) {
            parsedDob = parseDateSafely(dateOfBirth);
            if (!parsedDob) {
                return res.status(400).json({ message: 'Ngày sinh không đúng định dạng hợp lệ' });
            }
        }

        const username = studentCode.toLowerCase();
        const email = req.body.email ? String(req.body.email).trim().toLowerCase() : `${username}${DEFAULT_EMAIL_DOMAIN}`;
        
        const userExists = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] }
        });
        if (userExists) {
            return res.status(400).json({ message: 'Tài khoản cho mã học sinh hoặc email này đã tồn tại' });
        }

        const studentStatus = (status && ALLOWED_STUDENT_STATUSES.includes(status)) ? status : 'active';
        const defaultPassword = req.body.password || DEFAULT_STUDENT_PASSWORD;
        const hashedPassword = await bcrypt.hash(defaultPassword, BCRYPT_SALT_ROUNDS);

        const newStudent = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    username,
                    email,
                    password: hashedPassword,
                    role: 'student',
                    status: studentStatus
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
                    fullName: fullName ? String(fullName).trim() : '',
                    gender: gender || DEFAULT_GENDER,
                    classId: classId || null,
                    phone: phone || null,
                    parentPhone: parentPhone || null,
                    parentName: parentName ? String(parentName).trim() : null,
                    dateOfBirth: parsedDob,
                    academicYear: academicYear ? String(academicYear).trim() : null,
                    address: address ? String(address).trim() : null,
                    status: studentStatus
                },
                include: {
                    class: { select: { id: true, className: true, grade: true } }
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

        // Ghi vết kiểm toán việc tạo mới học sinh
        safeAuditLog({
            userId: req.user?.id,
            action: 'student:create',
            resourceType: 'student_profile',
            resourceId: newStudent.id,
            newValue: { studentCode: newStudent.studentCode, fullName: newStudent.fullName, classId: newStudent.classId },
            reason: `Admin thêm mới học sinh ${newStudent.fullName} (${newStudent.studentCode})`,
            severity: 'info'
        });

        // Tự động gán học phí của lớp cho học sinh mới (không làm sập phản hồi nếu việc gán học phí gặp lỗi)
        if (newStudent.classId) {
            try {
                await autoAssignFeeProfilesForStudent(newStudent.id, newStudent.classId);
            } catch (feeErr) {
                console.error('[createStudent] Tự động gán học phí thất bại:', feeErr?.message || feeErr);
            }
        }

        res.status(201).json(newStudent);
    } catch (error) {
        handlePrismaError(error, res, 'Lỗi server khi tạo học sinh');
    }
};

// ============================================================================
// 4. CẬP NHẬT THÔNG TIN HỌC SINH (BẢO VỆ TRƯỜNG BẤT BIẾN & VERSIONING)
// ============================================================================
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
        if (status !== undefined && status !== null && status !== '') {
            if (!ALLOWED_STUDENT_STATUSES.includes(status)) {
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

        // Validate Ngày sinh an toàn
        let parsedDob = undefined;
        if (dateOfBirth !== undefined) {
            if (dateOfBirth === '' || dateOfBirth === null) {
                parsedDob = null;
            } else {
                parsedDob = parseDateSafely(dateOfBirth);
                if (!parsedDob) {
                    return res.status(400).json({ message: 'Ngày sinh không hợp lệ' });
                }
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
                    fullName: fullName !== undefined ? String(fullName).trim() : undefined,
                    gender: gender !== undefined ? gender : undefined,
                    dateOfBirth: parsedDob,
                    parentName: parentName !== undefined ? (parentName === '' ? null : String(parentName).trim()) : undefined,
                    parentPhone: parentPhone !== undefined ? (parentPhone === '' ? null : parentPhone) : undefined,
                    academicYear: academicYear !== undefined ? (academicYear === '' ? null : String(academicYear).trim()) : undefined,
                    classId: classId !== undefined ? (classId === '' ? null : classId) : undefined,
                    phone: phone !== undefined ? (phone === '' ? null : phone) : undefined,
                    cccdNumber: cccdNumber !== undefined ? (cccdNumber === '' ? null : String(cccdNumber).trim()) : undefined,
                    ethnicity: ethnicity !== undefined ? (ethnicity === '' ? DEFAULT_ETHNICITY : String(ethnicity).trim()) : undefined,
                    religion: religion !== undefined ? (religion === '' ? DEFAULT_RELIGION : String(religion).trim()) : undefined,
                    birthPlace: birthPlace !== undefined ? (birthPlace === '' ? null : String(birthPlace).trim()) : undefined,
                    permanentAddress: permanentAddress !== undefined ? (permanentAddress === '' ? null : String(permanentAddress).trim()) : undefined,
                    address: address !== undefined ? (address === '' ? null : String(address).trim()) : undefined,
                    status: status !== undefined ? status : undefined,
                    version: { increment: 1 }
                },
                include: {
                    user: { select: { username: true, email: true, status: true } },
                    class: { select: { id: true, className: true, grade: true } }
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

        // Ghi vết kiểm toán việc cập nhật hồ sơ học sinh
        safeAuditLog({
            userId: req.user?.id,
            action: 'student:update',
            resourceType: 'student_profile',
            resourceId: updatedStudent.id,
            newValue: { 
                studentCode: updatedStudent.studentCode, 
                fullName: updatedStudent.fullName, 
                classId: updatedStudent.classId,
                status: updatedStudent.status 
            },
            reason: `Admin cập nhật thông tin học sinh ${updatedStudent.fullName} (${updatedStudent.studentCode})`,
            severity: 'info'
        });

        // Nếu học sinh được xếp/chuyển vào lớp mới, tự động gán các khoản học phí của lớp đó
        if (updatedStudent.classId && updatedStudent.classId !== student.classId) {
            try {
                await autoAssignFeeProfilesForStudent(updatedStudent.id, updatedStudent.classId);
            } catch (feeErr) {
                console.error('[updateStudent] Tự động gán học phí thất bại:', feeErr?.message || feeErr);
            }
        }

        res.json(updatedStudent);
    } catch (error) {
        handlePrismaError(error, res, 'Lỗi server khi cập nhật');
    }
};

// ============================================================================
// 5. XÓA HỌC SINH (TRANSACTION & XÓA CẢ TÀI KHOẢN LIÊN KẾT)
// ============================================================================
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
        
        safeAuditLog({
            userId: req.user?.id,
            action: 'student:delete',
            resourceType: 'student_profile',
            resourceId: student.id,
            oldValue: { studentCode: student.studentCode, fullName: student.fullName },
            reason: `Admin xóa học sinh ${student.fullName} (${student.studentCode})`,
            severity: 'critical'
        });

        res.json({ message: 'Đã xoá học sinh' });
    } catch (error) {
        console.error('deleteStudent error:', error);
        res.status(500).json({ message: 'Lỗi server khi xoá' });
    }
};

// ============================================================================
// 6. THỐNG KÊ CHUYÊN CẦN CHUẨN THPT (CHỐNG IDOR & TỐI ƯU SELECT FIELD)
// ============================================================================
export const getStudentAttendanceSummary = async (req, res) => {
    try {
        const { id } = req.params;

        // Tối ưu hóa: Chỉ select các trường IDOR và trạng thái attendance, không nạp toàn bộ text
        const student = await prisma.student.findUnique({
            where: { id },
            select: {
                id: true,
                userId: true,
                classId: true,
                guardianLinks: {
                    select: {
                        parent: { select: { userId: true } },
                        custodyType: true
                    }
                },
                attendances: {
                    select: { status: true }
                }
            }
        });

        if (!student) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy học sinh' });
        }

        // Kiểm tra phân quyền truy cập (Chống lộ thông tin chuyên cần)
        const userRole = (req.user?.role || '').toLowerCase();
        const isAdmin = userRole === 'admin' || userRole === 'principal';

        if (userRole === 'student' && student.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Học sinh chỉ được xem thống kê của chính mình' });
        }

        if (userRole === 'parent') {
            const isAuthorizedParent = student.guardianLinks.some(link => 
                link.parent?.userId === req.user.id && link.custodyType !== 'none'
            );
            if (!isAuthorizedParent && !isAdmin) {
                return res.status(403).json({ success: false, message: 'Bạn không có quyền xem dữ liệu của học sinh này' });
            }
        }

        const attendances = student.attendances || [];
        const total = attendances.length;

        // Tối ưu hóa: 1 vòng lặp O(N) duy nhất tính toàn bộ thống kê thay vì 4 lần filter
        let present = 0;
        let late = 0;
        let excused = 0;
        let unexcused = 0;

        for (let i = 0; i < total; i++) {
            const st = attendances[i].status;
            if (st === 'present') present++;
            else if (st === 'late') late++;
            else if (st === 'excused') excused++;
            else if (st === 'unexcused') unexcused++;
        }

        const absentTotal = excused + unexcused;
        const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 100;
        const isAtRisk = absentTotal > AT_RISK_ABSENCE_THRESHOLD;

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
                maxAllowedAbsence: MAX_ALLOWED_ABSENCE
            }
        });
    } catch (error) {
        console.error('getStudentAttendanceSummary error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy thống kê chuyên cần' });
    }
};

// ============================================================================
// 7. CẤP LẠI MẬT KHẨU TẠM THỜI (ONE-TIME DISPLAY)
// ============================================================================
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
        const hashedPassword = await bcrypt.hash(tempPassword, BCRYPT_SALT_ROUNDS);

        // Đồng bộ kích hoạt active cho cả tài khoản user và bản ghi student
        await prisma.$transaction([
            prisma.user.update({
                where: { id: student.userId },
                data: {
                    password: hashedPassword,
                    status: 'active'
                }
            }),
            prisma.student.update({
                where: { id: student.id },
                data: { status: 'active' }
            })
        ]);

        safeAuditLog({
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

// ============================================================================
// 8. ĐẶT LẠI MẬT KHẨU HÀNG LOẠT (TỐI ƯU HASH THEO CHUNK & TRÁNH NGHẼN POOL)
// ============================================================================
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

        const validStudents = students.filter(student => Boolean(student.user));
        const results = [];

        // Tối ưu hóa: Chia chunk để băm bcrypt song song có kiểm soát, tránh nghẽn luồng libuv và cạn DB connection pool
        for (let i = 0; i < validStudents.length; i += BATCH_CHUNK_SIZE) {
            const chunk = validStudents.slice(i, i + BATCH_CHUNK_SIZE);
            const chunkResults = await Promise.all(chunk.map(async (student) => {
                const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                const tempPassword = `Tt@${student.studentCode}#${randomSuffix}`;
                const hashedPassword = await bcrypt.hash(tempPassword, BCRYPT_SALT_ROUNDS);

                await prisma.user.update({
                    where: { id: student.userId },
                    data: { password: hashedPassword, status: 'active' }
                });

                return {
                    id: student.id,
                    studentCode: student.studentCode,
                    fullName: student.fullName,
                    email: student.user.email,
                    temporaryPassword: tempPassword
                };
            }));
            results.push(...chunkResults);
        }

        // Đồng bộ trạng thái active cho danh sách học sinh vừa được cấp mật khẩu
        if (results.length > 0) {
            await prisma.student.updateMany({
                where: { id: { in: results.map(r => r.id) } },
                data: { status: 'active' }
            });
        }

        safeAuditLog({
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

// ============================================================================
// 9. CHUYỂN LỚP HÀNG LOẠT (TỐI ƯU ASSIGN HỌC PHÍ THEO BATCH & ĐỒNG BỘ OUTBOX)
// ============================================================================
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

        // Đồng bộ Outbox Event hàng loạt để cập nhật lớp học mới sang Elasticsearch
        const updatedStudents = await prisma.student.findMany({
            where: { id: { in: studentIds } },
            include: { class: { select: { id: true, className: true, grade: true } } }
        });

        if (updatedStudents.length > 0) {
            await prisma.outboxEvent.createMany({
                data: updatedStudents.map(st => ({
                    aggregateType: 'STUDENT',
                    aggregateId: st.id,
                    eventType: 'STUDENT_UPDATED',
                    version: (st.version || 1) + 1,
                    payload: formatStudentPayload(st),
                    status: 'PENDING'
                }))
            });
        }

        // Tối ưu hóa: Chạy song song gán học phí theo từng batch nhỏ tránh nghẽn I/O DB
        for (let i = 0; i < studentIds.length; i += BATCH_CHUNK_SIZE) {
            const chunk = studentIds.slice(i, i + BATCH_CHUNK_SIZE);
            await Promise.all(chunk.map(sId => 
                autoAssignFeeProfilesForStudent(sId, targetClassId).catch(err => {
                    console.error(`[bulkChangeClass] Auto-assign fee profile thất bại cho HS ${sId}:`, err?.message || err);
                })
            ));
        }

        safeAuditLog({
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

// ============================================================================
// 10. KHÓA / MỞ KHÓA TÀI KHOẢN HÀNG LOẠT
// ============================================================================
export const bulkToggleStatus = async (req, res) => {
    try {
        const { studentIds, status } = req.body;
        if (!Array.isArray(studentIds) || !ALLOWED_BULK_TOGGLE_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ (active | blocked)' });
        }

        const students = await prisma.student.findMany({
            where: { id: { in: studentIds } },
            select: { id: true, userId: true, version: true }
        });

        const userIds = students.map(s => s.userId).filter(Boolean);

        await prisma.$transaction([
            prisma.user.updateMany({
                where: { id: { in: userIds } },
                data: { status }
            }),
            prisma.student.updateMany({
                where: { id: { in: studentIds } },
                data: { status }
            })
        ]);

        safeAuditLog({
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

// ============================================================================
// 11. XÓA HÀNG LOẠT HỌC SINH (KÈM ĐỒNG BỘ OUTBOX CHO TOÀN BỘ DANH SÁCH)
// ============================================================================
export const bulkDeleteStudents = async (req, res) => {
    try {
        const { studentIds } = req.body;
        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Danh sách ID học sinh không hợp lệ' });
        }

        const students = await prisma.student.findMany({
            where: { id: { in: studentIds } },
            select: { id: true, userId: true, version: true }
        });

        const userIds = students.map(s => s.userId).filter(Boolean);

        await prisma.$transaction(async (tx) => {
            // Ghi nhận Outbox Event hàng loạt để worker đồng bộ xóa bản ghi khỏi Elasticsearch
            if (students.length > 0) {
                await tx.outboxEvent.createMany({
                    data: students.map(s => ({
                        aggregateType: 'STUDENT',
                        aggregateId: s.id,
                        eventType: 'STUDENT_DELETED',
                        version: (s.version || 1) + 1,
                        payload: { id: s.id },
                        status: 'PENDING'
                    }))
                });
            }

            await tx.student.deleteMany({ where: { id: { in: studentIds } } });
            if (userIds.length > 0) {
                await tx.user.deleteMany({ where: { id: { in: userIds } } });
            }
        });

        safeAuditLog({
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

// ============================================================================
// 12. MÔ PHỎNG CHUYỂN NĂM HỌC (ROLLOVER SIMULATION)
// ============================================================================
export const simulateRollover = async (req, res) => {
    try {
        const { fromYear = '2025-2026', toYear = '2026-2027' } = req.body;

        const students = await prisma.student.findMany({
            where: { status: 'active' },
            include: {
                class: true,
                attendances: {
                    select: { status: true } // Tối ưu: Chỉ chọn status, không nạp toàn bộ cột text
                },
                grades: true // NGHI NGỜ: Quan hệ 'grades' được nạp nhưng không hề được sử dụng trong vòng lặp phân loại bên dưới
            }
        });

        const graduated = [];
        const promoteTo12 = [];
        const promoteTo11 = [];
        const retainAtRisk = [];

        for (const s of students) {
            const grade = s.class?.grade;
            const absentCount = s.attendances.filter(a => a.status === 'unexcused' || a.status === 'excused').length;
            const isRetain = absentCount > MAX_ALLOWED_ABSENCE;

            if (isRetain) {
                retainAtRisk.push({
                    id: s.id,
                    studentCode: s.studentCode,
                    fullName: s.fullName,
                    currentClass: s.class?.className,
                    reason: `Vắng ${absentCount} buổi (vượt quá ${MAX_ALLOWED_ABSENCE} buổi quy định)`
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

// ============================================================================
// 13. THỰC THI CHUYỂN NĂM HỌC (TỐI ƯU BATCH UPDATE THAY VÌ VÒNG LẶP N+1)
// ============================================================================
export const executeRollover = async (req, res) => {
    try {
        const { toYear = '2026-2027' } = req.body;

        const students = await prisma.student.findMany({
            where: { status: 'active' },
            include: { 
                class: true, 
                attendances: { select: { status: true } } // Tối ưu: Chỉ chọn status phục vụ đếm vắng
            }
        });

        const graduatingStudentIds = [];
        let retainedCount = 0;

        for (const s of students) {
            const grade = s.class?.grade;
            const absentCount = s.attendances.filter(a => a.status === 'unexcused' || a.status === 'excused').length;
            
            if (absentCount > MAX_ALLOWED_ABSENCE) {
                retainedCount++;
                continue;
            }

            if (grade === 12) {
                graduatingStudentIds.push(s.id);
            }
        }

        const graduatedCount = graduatingStudentIds.length;

        // Tối ưu hóa: 1 truy vấn updateMany duy nhất thay vì N truy vấn lặp trong transaction
        if (graduatingStudentIds.length > 0) {
            await prisma.$transaction(async (tx) => {
                await tx.student.updateMany({
                    where: { id: { in: graduatingStudentIds } },
                    data: { status: 'graduated' }
                });

                // Ghi nhận Outbox Event hàng loạt để worker đồng bộ trạng thái mới
                await tx.outboxEvent.createMany({
                    data: graduatingStudentIds.map(stId => ({
                        aggregateType: 'STUDENT',
                        aggregateId: stId,
                        eventType: 'STUDENT_UPDATED',
                        version: 1,
                        payload: { id: stId, status: 'graduated' },
                        status: 'PENDING'
                    }))
                });
            });
        }

        safeAuditLog({
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

// ============================================================================
// 14. CẬP NHẬT HỒ SƠ SỨC KHỎE (TÁCH HÀM TÍNH TOÁN BMI & KIỂM TRA PHÂN QUYỀN)
// ============================================================================
export const updateStudentHealthRecord = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra phân quyền: Chỉ cán bộ y tế, giáo viên hoặc admin mới được cập nhật hồ sơ y tế
        const userRole = req.user?.role || '';
        if (!isStaffOrAdminUser(userRole)) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền cập nhật hồ sơ sức khỏe' });
        }

        const student = await prisma.student.findUnique({ where: { id } });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy học sinh' });
        }

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

        const { height, weight, bmi, bmiClassification } = calculateBmi(heightCm, weightKg);
        const parsedInsuranceExpires = parseDateSafely(healthInsuranceExpires);

        const healthRecordPayload = {
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
            healthInsuranceExpires: parsedInsuranceExpires,
            notes
        };

        const healthRecord = await prisma.studentHealthRecord.upsert({
            where: { studentId: id },
            update: healthRecordPayload,
            create: {
                studentId: id,
                ...healthRecordPayload
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

// ============================================================================
// 15. TÀI LIỆU SỐ HÓA HỌC SINH (THÊM / XÓA CHỐNG IDOR & PHÂN QUYỀN)
// ============================================================================
export const createStudentDocument = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra phân quyền: Chỉ giáo viên hoặc cán bộ trường mới được upload hồ sơ tài liệu học sinh
        const userRole = req.user?.role || '';
        if (!isStaffOrAdminUser(userRole)) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền thêm tài liệu học sinh' });
        }

        const student = await prisma.student.findUnique({ where: { id } });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy học sinh' });
        }

        const { documentType, title, fileUrl, fileType, fileSizeBytes } = req.body;

        if (!documentType || !title || !fileUrl) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin tài liệu bắt buộc' });
        }

        const doc = await prisma.studentDocument.create({
            data: {
                studentId: id,
                documentType,
                title: String(title).trim(),
                fileUrl: String(fileUrl).trim(),
                fileType: fileType || DEFAULT_DOCUMENT_FILE_TYPE,
                fileSizeBytes: fileSizeBytes ? Math.max(0, Number(fileSizeBytes)) : 0,
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

export const deleteStudentDocument = async (req, res) => {
    try {
        const { id, docId } = req.params;

        // Kiểm tra phân quyền: Chỉ giáo viên hoặc cán bộ trường mới được xóa tài liệu học sinh
        const userRole = req.user?.role || '';
        if (!isStaffOrAdminUser(userRole)) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa tài liệu học sinh' });
        }

        // Chống IDOR: Đảm bảo tài liệu thực sự thuộc về học sinh này trước khi xóa
        const doc = await prisma.studentDocument.findFirst({
            where: { id: docId, studentId: id }
        });

        if (!doc) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài liệu tương ứng của học sinh này' });
        }

        await prisma.studentDocument.delete({ where: { id: docId } });
        res.json({ success: true, message: 'Đã xóa tài liệu' });
    } catch (error) {
        console.error('deleteStudentDocument error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi xóa tài liệu' });
    }
};
