import prisma from '../prismaClient.js';

// Helper to normalize date to start of day (UTC/Local)
const parseDateOnly = (dateStr) => {
    if (!dateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    }
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d;
};

// ==========================================
// 1️⃣ Lấy danh sách các tiết học hợp lệ trong ngày theo Thời Khóa Biểu
// ==========================================
export const getPeriodsByDate = async (req, res) => {
    try {
        const { classId, date, semester = 'HK1_2026' } = req.query;

        if (!classId) {
            return res.status(400).json({ message: 'Thiếu classId' });
        }

        const targetDate = parseDateOnly(date);
        const dayOfWeek = targetDate.getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat

        const dayFieldMap = {
            1: 'monday',
            2: 'tuesday',
            3: 'wednesday',
            4: 'thursday',
            5: 'friday'
        };
        const dayField = dayFieldMap[dayOfWeek];
        const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

        if (!dayField) {
            return res.json({
                date: targetDate.toISOString().split('T')[0],
                dayOfWeek,
                dayName: dayNames[dayOfWeek],
                periods: [],
                message: 'Không có thời khóa biểu vào cuối tuần'
            });
        }

        // Lấy thời khóa biểu của lớp
        const schedules = await prisma.schedule.findMany({
            where: { classId, semester }
        });

        // Lấy tất cả môn học để đối chiếu loại môn (Bắt buộc / Tự chọn)
        const subjects = await prisma.subject.findMany({
            include: { teacher: { select: { fullName: true } } }
        });
        const subjectMap = new Map();
        subjects.forEach(s => {
            subjectMap.set(s.name.trim().toLowerCase(), s);
            subjectMap.set(s.subjectCode.trim().toLowerCase(), s);
        });

        // Lấy các tiết đã được điểm danh trong ngày này
        const existingAttendances = await prisma.attendance.findMany({
            where: {
                classId,
                date: {
                    gte: targetDate,
                    lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
                }
            },
            select: { periodNumber: true }
        });
        const markedPeriodNumbers = new Set(existingAttendances.map(a => a.periodNumber));

        const availablePeriods = [];
        for (const sch of schedules) {
            const subjectName = sch[dayField]?.trim();
            if (subjectName && subjectName !== '-' && subjectName !== '') {
                const match = sch.period.match(/\d+/);
                const periodNum = match ? parseInt(match[0], 10) : 1;
                const foundSubject = subjectMap.get(subjectName.toLowerCase());

                availablePeriods.push({
                    periodNumber: periodNum,
                    periodName: sch.period,
                    subjectName: foundSubject ? foundSubject.name : subjectName,
                    subjectId: foundSubject ? foundSubject.id : null,
                    subjectType: foundSubject ? foundSubject.type : 'Bắt buộc',
                    teacherName: foundSubject?.teacher?.fullName || 'Chưa phân công',
                    isMarked: markedPeriodNumbers.has(periodNum)
                });
            }
        }

        // Sắp xếp theo thứ tự tiết tăng dần
        availablePeriods.sort((a, b) => a.periodNumber - b.periodNumber);

        res.json({
            date: targetDate.toISOString().split('T')[0],
            dayOfWeek,
            dayName: dayNames[dayOfWeek],
            periods: availablePeriods
        });
    } catch (error) {
        console.error('Lỗi getPeriodsByDate:', error);
        res.status(500).json({ message: 'Lỗi server khi tải tiết học theo thời khóa biểu' });
    }
};

// ==========================================
// 2️⃣ Lấy danh sách điểm danh theo Lớp & Tiết học (hoặc theo Buổi)
// ==========================================
export const getClassAttendance = async (req, res) => {
    try {
        const { classId } = req.params;
        const { date, session = 'morning', periodNumber, semester = 'HK1_2026' } = req.query;

        const targetDate = parseDateOnly(date);
        const hasPeriod = periodNumber !== undefined && periodNumber !== null && periodNumber !== '';
        const periodNum = hasPeriod ? parseInt(periodNumber, 10) : 1;

        // Lấy thông tin lớp
        const classData = await prisma.class.findUnique({
            where: { id: classId },
            include: {
                homeroomTeacher: { select: { fullName: true } }
            }
        });

        if (!classData) {
            return res.status(404).json({ message: 'Không tìm thấy thông tin lớp học' });
        }

        // Kiểm tra môn học của tiết này trên Thời Khóa Biểu
        let currentSubjectInfo = null;
        if (hasPeriod) {
            const dayOfWeek = targetDate.getDay();
            const dayFieldMap = { 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday' };
            const dayField = dayFieldMap[dayOfWeek];

            if (dayField) {
                const schedules = await prisma.schedule.findMany({
                    where: { classId, semester }
                });
                const targetSch = schedules.find(s => {
                    const match = s.period.match(/\d+/);
                    return match && parseInt(match[0], 10) === periodNum;
                });

                if (targetSch && targetSch[dayField] && targetSch[dayField] !== '-') {
                    const subjName = targetSch[dayField].trim();
                    const foundSubj = await prisma.subject.findFirst({
                        where: {
                            OR: [
                                { name: { equals: subjName, mode: 'insensitive' } },
                                { subjectCode: { equals: subjName, mode: 'insensitive' } }
                            ]
                        },
                        include: { teacher: { select: { fullName: true } } }
                    });

                    currentSubjectInfo = {
                        name: foundSubj ? foundSubj.name : subjName,
                        id: foundSubj ? foundSubj.id : null,
                        type: foundSubj ? foundSubj.type : 'Bắt buộc',
                        teacherName: foundSubj?.teacher?.fullName || 'Chưa phân công'
                    };
                }
            }
        }

        // Lọc danh sách học sinh:
        // Nếu là môn TỰ CHỌN và có subjectId: Chỉ lấy học sinh có đăng ký môn trong SubjectEnrollment
        let targetStudents = [];
        if (currentSubjectInfo && currentSubjectInfo.type === 'Tự chọn' && currentSubjectInfo.id) {
            const enrollments = await prisma.subjectEnrollment.findMany({
                where: {
                    subjectId: currentSubjectInfo.id,
                    student: { classId }
                },
                include: {
                    student: {
                        select: {
                            id: true,
                            studentCode: true,
                            fullName: true,
                            gender: true,
                            phone: true,
                            parentPhone: true
                        }
                    }
                }
            });

            if (enrollments.length > 0) {
                targetStudents = enrollments.map(e => e.student);
            } else {
                // Nếu chưa cấu hình đăng ký riêng, mặc định lấy toàn bộ học sinh lớp
                targetStudents = await prisma.student.findMany({
                    where: { classId },
                    select: {
                        id: true,
                        studentCode: true,
                        fullName: true,
                        gender: true,
                        phone: true,
                        parentPhone: true
                    },
                    orderBy: { fullName: 'asc' }
                });
            }
        } else {
            // Môn Bắt buộc hoặc điểm danh theo buổi: Lấy toàn bộ học sinh của lớp
            targetStudents = await prisma.student.findMany({
                where: { classId },
                select: {
                    id: true,
                    studentCode: true,
                    fullName: true,
                    gender: true,
                    phone: true,
                    parentPhone: true
                },
                orderBy: { fullName: 'asc' }
            });
        }

        // Lấy các bản ghi điểm danh hiện có cho ngày & (tiết hoặc buổi)
        let attendanceFilter = {
            classId,
            date: {
                gte: targetDate,
                lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
            }
        };

        if (hasPeriod) {
            attendanceFilter.periodNumber = periodNum;
        } else {
            attendanceFilter.session = session;
        }

        const existingAttendances = await prisma.attendance.findMany({
            where: attendanceFilter
        });

        const attendanceMap = new Map();
        existingAttendances.forEach(att => {
            attendanceMap.set(att.studentId, att);
        });

        // Kết hợp học sinh với bản ghi điểm danh
        const records = targetStudents.map(student => {
            const att = attendanceMap.get(student.id);
            return {
                studentId: student.id,
                studentCode: student.studentCode,
                fullName: student.fullName,
                gender: student.gender,
                phone: student.phone,
                parentPhone: student.parentPhone,
                status: att ? att.status : 'present',
                note: att ? (att.note || '') : '',
                attendanceId: att ? att.id : null,
                isSaved: !!att
            };
        });

        // Thống kê nhanh
        const stats = {
            total: records.length,
            present: records.filter(r => r.status === 'present').length,
            late: records.filter(r => r.status === 'late').length,
            excused: records.filter(r => r.status === 'excused').length,
            unexcused: records.filter(r => r.status === 'unexcused').length,
        };

        res.json({
            classId: classData.id,
            className: classData.className,
            grade: classData.grade,
            homeroomTeacher: classData.homeroomTeacher?.fullName || 'Chưa phân công',
            date: targetDate.toISOString().split('T')[0],
            session,
            periodNumber: hasPeriod ? periodNum : null,
            subjectInfo: currentSubjectInfo,
            stats,
            records
        });
    } catch (error) {
        console.error('Lỗi getClassAttendance:', error);
        res.status(500).json({ message: 'Lỗi server khi tải dữ liệu điểm danh' });
    }
};

// ==========================================
// 3️⃣ Lưu điểm danh hàng loạt (Hỗ trợ theo Tiết học & Buổi)
// ==========================================
export const saveClassAttendance = async (req, res) => {
    try {
        const {
            classId,
            date,
            session = 'morning',
            periodNumber,
            periodName,
            subjectName = '',
            subjectId = null,
            records
        } = req.body;
        const markedById = req.user?.id || null;

        if (!classId || !records || !Array.isArray(records)) {
            return res.status(400).json({ message: 'Dữ liệu điểm danh không hợp lệ' });
        }

        const targetDate = parseDateOnly(date);
        const periodNum = (periodNumber !== undefined && periodNumber !== null) ? Number(periodNumber) : 1;
        const pName = periodName || `Tiết ${periodNum}`;

        await prisma.$transaction(async (tx) => {
            for (const item of records) {
                await tx.attendance.upsert({
                    where: {
                        studentId_classId_date_periodNumber: {
                            studentId: item.studentId,
                            classId,
                            date: targetDate,
                            periodNumber: periodNum
                        }
                    },
                    update: {
                        status: item.status || 'present',
                        note: item.note || null,
                        markedById,
                        periodName: pName,
                        subjectName: subjectName || '',
                        subjectId: subjectId || null,
                        session: session || 'morning'
                    },
                    create: {
                        studentId: item.studentId,
                        classId,
                        date: targetDate,
                        periodNumber: periodNum,
                        periodName: pName,
                        subjectName: subjectName || '',
                        subjectId: subjectId || null,
                        session: session || 'morning',
                        status: item.status || 'present',
                        note: item.note || null,
                        markedById
                    }
                });
            }
        });

        res.json({ message: 'Lưu điểm danh thành công', count: records.length });
    } catch (error) {
        console.error('Lỗi saveClassAttendance:', error);
        res.status(500).json({ message: 'Lỗi server khi lưu điểm danh' });
    }
};

// ==========================================
// 4️⃣ Lấy lịch sử và tỷ lệ chuyên cần của một học sinh
// ==========================================
export const getStudentAttendance = async (req, res) => {
    try {
        let studentId = req.params.studentId;

        if (req.user?.role === 'student' || studentId === 'me') {
            const studentRecord = await prisma.student.findUnique({
                where: { userId: req.user.id }
            });
            if (!studentRecord) {
                return res.status(404).json({ message: 'Không tìm thấy hồ sơ học sinh' });
            }
            studentId = studentRecord.id;
        }

        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: {
                class: true
            }
        });

        if (!student) {
            return res.status(404).json({ message: 'Không tìm thấy thông tin học sinh' });
        }

        const history = await prisma.attendance.findMany({
            where: { studentId },
            orderBy: [{ date: 'desc' }, { periodNumber: 'asc' }]
        });

        const totalSessions = history.length;
        const presentCount = history.filter(h => h.status === 'present').length;
        const lateCount = history.filter(h => h.status === 'late').length;
        const excusedCount = history.filter(h => h.status === 'excused').length;
        const unexcusedCount = history.filter(h => h.status === 'unexcused').length;

        const attendanceRate = totalSessions > 0 
            ? Math.round(((presentCount + lateCount * 0.8) / totalSessions) * 100)
            : 100;

        res.json({
            student: {
                id: student.id,
                fullName: student.fullName,
                studentCode: student.studentCode,
                className: student.class?.className || 'Chưa có lớp'
            },
            stats: {
                totalSessions,
                presentCount,
                lateCount,
                excusedCount,
                unexcusedCount,
                attendanceRate
            },
            history: history.map(item => ({
                id: item.id,
                date: item.date.toISOString().split('T')[0],
                periodNumber: item.periodNumber,
                periodName: item.periodName,
                subjectName: item.subjectName || 'Chung',
                session: item.session === 'morning' ? 'Buổi Sáng' : 'Buổi Chiều',
                status: item.status,
                note: item.note
            }))
        });
    } catch (error) {
        console.error('Lỗi getStudentAttendance:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy lịch sử điểm danh' });
    }
};

// ==========================================
// 5️⃣ Thống kê tổng quan chuyên cần toàn trường / theo lớp (Admin)
// ==========================================
export const getAttendanceOverview = async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = parseDateOnly(date);

        const classes = await prisma.class.findMany({
            include: {
                _count: {
                    select: { students: true }
                },
                attendances: {
                    where: {
                        date: {
                            gte: targetDate,
                            lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
                        }
                    }
                }
            }
        });

        const summary = classes.map(c => {
            const totalStudents = c._count.students;
            const records = c.attendances;
            const marked = records.length > 0;
            const present = records.filter(r => r.status === 'present').length;
            const absent = records.filter(r => r.status === 'excused' || r.status === 'unexcused').length;
            const late = records.filter(r => r.status === 'late').length;

            return {
                classId: c.id,
                className: c.className,
                grade: c.grade,
                totalStudents,
                marked,
                present,
                absent,
                late,
                rate: totalStudents > 0 && marked ? Math.round((present / totalStudents) * 100) : null
            };
        });

        res.json({
            date: targetDate.toISOString().split('T')[0],
            classes: summary
        });
    } catch (error) {
        console.error('Lỗi getAttendanceOverview:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy thống kê chuyên cần' });
    }
};
