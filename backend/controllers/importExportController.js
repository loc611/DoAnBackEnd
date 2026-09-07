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

/**
 * Import danh sách học sinh theo lô (Batch Import) từ Excel/CSV
 */
export const importStudentsBatch = async (req, res) => {
    try {
        const { students, defaultClassId } = req.body;

        if (!students || !Array.isArray(students) || students.length === 0) {
            return res.status(400).json({ message: 'Danh sách học sinh nhập vào không được để trống' });
        }

        const studentRole = await prisma.role.findUnique({ where: { name: 'student' } }).catch(() => null);
        const results = {
            success: [],
            errors: []
        };

        // Cache all classes for fast lookup
        const allClasses = await prisma.class.findMany();
        const classMapByName = new Map();
        const classMapById = new Map();
        allClasses.forEach(c => {
            classMapByName.set(c.className.trim().toUpperCase(), c.id);
            classMapById.set(c.id, c.id);
        });

        for (let i = 0; i < students.length; i++) {
            const raw = students[i];
            const rowIndex = i + 1;

            try {
                let code = raw.studentCode ? String(raw.studentCode).trim().toUpperCase() : '';
                const fullName = raw.fullName ? String(raw.fullName).trim() : '';
                let phone = raw.phone ? String(raw.phone).trim() : null;
                let parentPhone = raw.parentPhone ? String(raw.parentPhone).trim() : null;
                const parentName = raw.parentName ? String(raw.parentName).trim() : null;
                const gender = raw.gender ? String(raw.gender).trim() : 'Nam';
                const dob = raw.dateOfBirth ? new Date(raw.dateOfBirth) : null;
                const className = raw.className ? String(raw.className).trim().toUpperCase() : '';

                // 1. Validate required fields
                if (!fullName) {
                    throw new Error(`Dòng ${rowIndex}: Họ và tên học sinh không được để trống`);
                }

                // 2. Validate / generate studentCode
                if (code) {
                    if (!isValidStudentCode(code)) {
                        throw new Error(`Dòng ${rowIndex}: Mã học sinh "${code}" không đúng định dạng (VD: HS123456)`);
                    }
                    const taken = await isStudentCodeTaken(prisma, code);
                    if (taken) {
                        throw new Error(`Dòng ${rowIndex}: Mã học sinh "${code}" đã tồn tại trong hệ thống`);
                    }
                } else {
                    let isUnique = false;
                    while (!isUnique) {
                        const testCode = `HS${Math.floor(100000 + Math.random() * 900000)}`;
                        const exists = await prisma.student.findUnique({ where: { studentCode: testCode } });
                        if (!exists) {
                            code = testCode;
                            isUnique = true;
                        }
                    }
                }

                // 3. Validate phone numbers
                if (phone) {
                    if (!isValidPhoneNumber(phone)) {
                        throw new Error(`Dòng ${rowIndex}: Số điện thoại học sinh "${phone}" không hợp lệ (phải đủ 10 số, bắt đầu bằng 0)`);
                    }
                    const phoneTaken = await isPhoneTakenInSystem(prisma, phone);
                    if (phoneTaken) {
                        throw new Error(`Dòng ${rowIndex}: SĐT học sinh "${phone}" đã được sử dụng trong hệ thống`);
                    }
                }

                if (parentPhone && !isValidPhoneNumber(parentPhone)) {
                    throw new Error(`Dòng ${rowIndex}: SĐT phụ huynh "${parentPhone}" không hợp lệ (phải đủ 10 số, bắt đầu bằng 0)`);
                }

                // 4. Resolve classId
                let targetClassId = null;
                if (className && classMapByName.has(className)) {
                    targetClassId = classMapByName.get(className);
                } else if (raw.classId && classMapById.has(raw.classId)) {
                    targetClassId = raw.classId;
                } else if (defaultClassId && classMapById.has(defaultClassId)) {
                    targetClassId = defaultClassId;
                }

                // 5. Account provisioning: username = code.toLowerCase(), email = code.toLowerCase()@school.edu.vn, password = code@123
                const username = code.toLowerCase();
                const email = `${username}@school.edu.vn`;
                const defaultPassword = `${code}@123`;
                const passwordHash = await bcrypt.hash(defaultPassword, 10);

                // 6. Database Transaction
                const createdStudent = await prisma.$transaction(async (tx) => {
                    const user = await tx.user.create({
                        data: {
                            username,
                            email,
                            password: passwordHash,
                            role: 'student',
                            status: 'active'
                        }
                    });

                    if (studentRole) {
                        await tx.userRole.create({
                            data: {
                                userId: user.id,
                                roleId: studentRole.id
                            }
                        });
                    }

                    const st = await tx.student.create({
                        data: {
                            userId: user.id,
                            studentCode: code,
                            fullName,
                            gender,
                            dateOfBirth: dob,
                            phone,
                            parentPhone,
                            parentName,
                            classId: targetClassId
                        },
                        include: { class: true }
                    });

                    return st;
                });

                // 7. Auto assign fee profiles
                if (createdStudent.classId) {
                    await autoAssignFeeProfilesForStudent(createdStudent.id, createdStudent.classId).catch(err => {
                        console.warn(`Fee auto-assign notice for ${createdStudent.studentCode}:`, err.message);
                    });
                }

                results.success.push({
                    rowIndex,
                    studentCode: createdStudent.studentCode,
                    fullName: createdStudent.fullName,
                    className: createdStudent.class?.className || 'Chưa xếp lớp',
                    username: username,
                    defaultPassword: defaultPassword
                });
            } catch (err) {
                results.errors.push({
                    rowIndex,
                    data: raw,
                    message: err.message
                });
            }
        }

        // Ghi Audit Log
        if (results.success.length > 0) {
            await AuditLogService.log({
                userId: req.user?.id,
                action: 'STUDENT_IMPORT_BATCH',
                module: 'student',
                resource: 'Student',
                newData: {
                    totalImported: results.success.length,
                    totalErrors: results.errors.length
                },
                reason: `Nhập danh sách học sinh từ file Excel: thành công ${results.success.length}, thất bại ${results.errors.length}`,
                req,
                severity: 'info'
            });
        }

        res.json({
            message: `Hoàn tất nhập dữ liệu: Thành công ${results.success.length}/${students.length} học sinh`,
            totalProcessed: students.length,
            successCount: results.success.length,
            errorCount: results.errors.length,
            successList: results.success,
            errorList: results.errors
        });
    } catch (error) {
        console.error('Batch import error:', error);
        res.status(500).json({ message: 'Lỗi máy chủ khi xử lý nhập danh sách học sinh: ' + error.message });
    }
};

/**
 * Lấy dữ liệu Bảng điểm đầy đủ của một lớp để xuất Excel hoặc in Phiếu báo điểm
 */
export const exportClassGrades = async (req, res) => {
    try {
        const { classId } = req.params;
        const semester = req.query.semester || 'HK1_2026';

        const cls = await prisma.class.findUnique({
            where: { id: classId },
            include: {
                homeroomTeacher: true
            }
        });

        if (!cls) {
            return res.status(404).json({ message: 'Lớp học không tồn tại' });
        }

        const students = await prisma.student.findMany({
            where: { classId },
            include: {
                grades: {
                    where: { semester }
                },
                attendances: {
                    where: { classId }
                }
            },
            orderBy: { studentCode: 'asc' }
        });

        const formattedGrades = students.map((s, idx) => {
            const g = s.grades && s.grades.length > 0 ? s.grades[0] : null;
            const math = g ? Number(g.math) : 0;
            const literature = g ? Number(g.literature) : 0;
            const english = g ? Number(g.english) : 0;
            const physics = g ? Number(g.physics) : 0;
            const chemistry = g ? Number(g.chemistry) : 0;
            const it = g ? Number(g.it) : 0;

            const scores = [math, literature, english, physics, chemistry, it];
            const hasScores = g != null;
            const avg = hasScores ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
            const gpa = avg.toFixed(2);

            let rank = 'Chưa xếp loại';
            if (hasScores) {
                if (avg >= 8.0) rank = 'Giỏi';
                else if (avg >= 6.5) rank = 'Khá';
                else if (avg >= 5.0) rank = 'Trung Bình';
                else rank = 'Yếu';
            }

            // Attendance counts
            const excusedCount = s.attendances.filter(a => a.status === 'excused').length;
            const unexcusedCount = s.attendances.filter(a => a.status === 'unexcused').length;
            const lateCount = s.attendances.filter(a => a.status === 'late').length;

            return {
                stt: idx + 1,
                id: s.id,
                studentCode: s.studentCode,
                fullName: s.fullName,
                gender: s.gender || 'Nam',
                dob: s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('vi-VN') : '',
                math: hasScores ? math : '—',
                literature: hasScores ? literature : '—',
                english: hasScores ? english : '—',
                physics: hasScores ? physics : '—',
                chemistry: hasScores ? chemistry : '—',
                it: hasScores ? it : '—',
                gpa: hasScores ? gpa : '—',
                rank: rank,
                conduct: g?.conductScore || 'Tốt',
                status: g?.status || 'draft',
                excusedAbsence: excusedCount,
                unexcusedAbsence: unexcusedCount,
                lateCount: lateCount
            };
        });

        res.json({
            classInfo: {
                id: cls.id,
                className: cls.className,
                grade: cls.grade,
                academicYear: cls.academicYear,
                homeroomTeacherName: cls.homeroomTeacher?.fullName || 'Chưa phân công',
                homeroomTeacherCode: cls.homeroomTeacher?.teacherCode || '',
                semester: semester
            },
            totalStudents: students.length,
            students: formattedGrades
        });
    } catch (error) {
        console.error('Export class grades error:', error);
        res.status(500).json({ message: 'Lỗi khi lấy dữ liệu xuất bảng điểm lớp: ' + error.message });
    }
};

/**
 * Lấy danh sách học sinh đầy đủ theo bộ lọc để xuất Excel
 */
export const exportStudentsList = async (req, res) => {
    try {
        const { classId, grade } = req.query;
        const whereClause = {};

        if (classId) {
            whereClause.classId = classId;
        } else if (grade) {
            whereClause.class = { grade: parseInt(grade, 10) };
        }

        const students = await prisma.student.findMany({
            where: whereClause,
            include: {
                class: {
                    include: {
                        homeroomTeacher: true
                    }
                }
            },
            orderBy: [{ classId: 'asc' }, { studentCode: 'asc' }]
        });

        const formatted = students.map((s, idx) => ({
            stt: idx + 1,
            studentCode: s.studentCode,
            fullName: s.fullName,
            gender: s.gender || 'Nam',
            dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('vi-VN') : '',
            phone: s.phone || '',
            className: s.class?.className || 'Chưa xếp lớp',
            grade: s.class?.grade || '',
            homeroomTeacher: s.class?.homeroomTeacher?.fullName || '',
            parentName: s.parentName || '',
            parentPhone: s.parentPhone || '',
            address: s.address || ''
        }));

        res.json({
            total: formatted.length,
            students: formatted
        });
    } catch (error) {
        console.error('Export students list error:', error);
        res.status(500).json({ message: 'Lỗi khi lấy dữ liệu danh sách học sinh: ' + error.message });
    }
};
