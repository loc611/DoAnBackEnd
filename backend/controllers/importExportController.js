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
import { generateMasterGradebook, generateMoetSyncPayload } from '../utils/moetReportExporter.js';

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

        // 1. Bulk Cache tất cả Lớp, Mã HS và SĐT để kiểm tra trong bộ nhớ O(1)
        const [allClasses, existingStudents, existingUsers] = await Promise.all([
            prisma.class.findMany({ select: { id: true, className: true } }),
            prisma.student.findMany({ select: { studentCode: true, phone: true } }),
            prisma.user.findMany({ select: { username: true, email: true } })
        ]);

        const classMapByName = new Map();
        const classMapById = new Map();
        allClasses.forEach(c => {
            classMapByName.set(c.className.trim().toUpperCase(), c.id);
            classMapById.set(c.id, c.id);
        });

        const knownCodes = new Set(existingStudents.map(s => s.studentCode.trim().toUpperCase()));
        const knownPhones = new Set(existingStudents.map(s => s.phone).filter(Boolean));
        const knownUsernames = new Set(existingUsers.map(u => u.username.toLowerCase()));

        // 2. Chia thành các chunk (25 học sinh/lô) để xử lý song song, tránh nghẽn Event Loop
        const CHUNK_SIZE = 25;
        for (let cIdx = 0; cIdx < students.length; cIdx += CHUNK_SIZE) {
            const chunk = students.slice(cIdx, cIdx + CHUNK_SIZE);

            await Promise.all(chunk.map(async (raw, i) => {
                const rowIndex = cIdx + i + 1;

                try {
                    let code = raw.studentCode ? String(raw.studentCode).trim().toUpperCase() : '';
                    const fullName = raw.fullName ? String(raw.fullName).trim() : '';
                    let phone = raw.phone ? String(raw.phone).trim() : null;
                    let parentPhone = raw.parentPhone ? String(raw.parentPhone).trim() : null;
                    const parentName = raw.parentName ? String(raw.parentName).trim() : null;
                    const gender = raw.gender ? String(raw.gender).trim() : 'Nam';
                    const dob = raw.dateOfBirth ? new Date(raw.dateOfBirth) : null;
                    const className = raw.className ? String(raw.className).trim().toUpperCase() : '';

                    // Validate required fields
                    if (!fullName) {
                        throw new Error(`Dòng ${rowIndex}: Họ và tên học sinh không được để trống`);
                    }

                    // Validate / sinh mã học sinh duy nhất trong Set
                    if (code) {
                        if (!isValidStudentCode(code)) {
                            throw new Error(`Dòng ${rowIndex}: Mã học sinh "${code}" không đúng định dạng (VD: HS123456)`);
                        }
                        if (knownCodes.has(code)) {
                            throw new Error(`Dòng ${rowIndex}: Mã học sinh "${code}" đã tồn tại trong hệ thống`);
                        }
                    } else {
                        let testCode = '';
                        do {
                            testCode = `HS${Math.floor(100000 + Math.random() * 900000)}`;
                        } while (knownCodes.has(testCode));
                        code = testCode;
                    }
                    knownCodes.add(code);

                    // Validate phone numbers
                    if (phone) {
                        if (!isValidPhoneNumber(phone)) {
                            throw new Error(`Dòng ${rowIndex}: Số điện thoại "${phone}" không hợp lệ (phải đủ 10 số, bắt đầu bằng 0)`);
                        }
                        if (knownPhones.has(phone)) {
                            throw new Error(`Dòng ${rowIndex}: Số điện thoại "${phone}" đã được sử dụng trong hệ thống`);
                        }
                        knownPhones.add(phone);
                    }

                    if (parentPhone && !isValidPhoneNumber(parentPhone)) {
                        throw new Error(`Dòng ${rowIndex}: SĐT phụ huynh "${parentPhone}" không hợp lệ (phải đủ 10 số, bắt đầu bằng 0)`);
                    }

                    // Resolve classId
                    let targetClassId = null;
                    if (className && classMapByName.has(className)) {
                        targetClassId = classMapByName.get(className);
                    } else if (raw.classId && classMapById.has(raw.classId)) {
                        targetClassId = raw.classId;
                    } else if (defaultClassId && classMapById.has(defaultClassId)) {
                        targetClassId = defaultClassId;
                    }

                    const username = code.toLowerCase();
                    if (knownUsernames.has(username)) {
                        throw new Error(`Dòng ${rowIndex}: Tài khoản "${username}" đã tồn tại`);
                    }
                    knownUsernames.add(username);

                    const email = `${username}@school.edu.vn`;
                    const defaultPassword = `${code}@123`;
                    const passwordHash = await bcrypt.hash(defaultPassword, 10);

                    // Ghi Database Transaction cho từng học sinh
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
                                data: { userId: user.id, roleId: studentRole.id }
                            });
                        }

                        return await tx.student.create({
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
                    });

                    // Gán học phí tự động chạy bất đồng bộ
                    if (createdStudent.classId) {
                        autoAssignFeeProfilesForStudent(createdStudent.id, createdStudent.classId).catch(() => {});
                    }

                    results.success.push({
                        rowIndex,
                        studentCode: createdStudent.studentCode,
                        fullName: createdStudent.fullName,
                        className: createdStudent.class?.className || 'Chưa xếp lớp',
                        username,
                        defaultPassword
                    });
                } catch (err) {
                    results.errors.push({
                        rowIndex,
                        data: raw,
                        message: err.message
                    });
                }
            }));
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

/**
 * Xuất Sổ gọi tên và ghi điểm (Sổ Cái) chuẩn Bộ GD&ĐT
 */
export const getMasterGradebookReport = async (req, res) => {
    try {
        const { classId } = req.params;
        const { semester } = req.query;
        const reportData = await generateMasterGradebook(classId, semester || 'HK1_2026');
        res.json({
            success: true,
            data: reportData
        });
    } catch (error) {
        console.error('Error generating master gradebook:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi kết xuất Sổ Cái: ' + error.message });
    }
};

/**
 * Tạo gói dữ liệu chuẩn liên thông Cơ sở dữ liệu ngành (moet.gov.vn)
 */
export const getMoetSyncPackage = async (req, res) => {
    try {
        const { academicYear, semester } = req.query;
        const syncPayload = await generateMoetSyncPayload(academicYear || '2026-2027', semester || 'HK1_2026');
        res.json({
            success: true,
            data: syncPayload
        });
    } catch (error) {
        console.error('Error generating MOET sync package:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi tạo gói dữ liệu ngành: ' + error.message });
    }
};
