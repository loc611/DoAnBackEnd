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

// Lấy danh sách điểm danh của một lớp theo ngày & buổi
export const getClassAttendance = async (req, res) => {
    try {
        const { classId } = req.params;
        const { date, session = 'morning' } = req.query;

        const targetDate = parseDateOnly(date);

        // Lấy thông tin lớp và học sinh
        const classData = await prisma.class.findUnique({
            where: { id: classId },
            include: {
                students: {
                    select: {
                        id: true,
                        studentCode: true,
                        fullName: true,
                        gender: true,
                        phone: true,
                        parentPhone: true
                    },
                    orderBy: { fullName: 'asc' }
                },
                homeroomTeacher: {
                    select: { fullName: true }
                }
            }
        });

        if (!classData) {
            return res.status(404).json({ message: 'Không tìm thấy thông tin lớp học' });
        }

        // Lấy các bản ghi điểm danh hiện có cho ngày và buổi này
        const existingAttendances = await prisma.attendance.findMany({
            where: {
                classId,
                session,
                date: {
                    gte: targetDate,
                    lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
                }
            }
        });

        const attendanceMap = new Map();
        existingAttendances.forEach(att => {
            attendanceMap.set(att.studentId, att);
        });

        // Kết hợp học sinh với bản ghi điểm danh (hoặc mặc định 'present')
        const records = classData.students.map(student => {
            const att = attendanceMap.get(student.id);
            return {
                studentId: student.id,
                studentCode: student.studentCode,
                fullName: student.fullName,
                gender: student.gender,
                phone: student.phone,
                status: att ? att.status : 'present',
                note: att ? (att.note || '') : '',
                attendanceId: att ? att.id : null,
                isSaved: !!att
            };
        });

        // Tính toán thống kê nhanh
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
            stats,
            records
        });
    } catch (error) {
        console.error('Lỗi getClassAttendance:', error);
        res.status(500).json({ message: 'Lỗi server khi tải dữ liệu điểm danh' });
    }
};

// Lưu / Cập nhật điểm danh hàng loạt của một lớp
export const saveClassAttendance = async (req, res) => {
    try {
        const { classId, date, session = 'morning', records } = req.body;
        const markedById = req.user?.id || null;

        if (!classId || !records || !Array.isArray(records)) {
            return res.status(400).json({ message: 'Dữ liệu điểm danh không hợp lệ' });
        }

        const targetDate = parseDateOnly(date);

        await prisma.$transaction(async (tx) => {
            for (const item of records) {
                // Upsert theo (studentId, classId, date, session)
                await tx.attendance.upsert({
                    where: {
                        studentId_classId_date_session: {
                            studentId: item.studentId,
                            classId,
                            date: targetDate,
                            session
                        }
                    },
                    update: {
                        status: item.status || 'present',
                        note: item.note || null,
                        markedById
                    },
                    create: {
                        studentId: item.studentId,
                        classId,
                        date: targetDate,
                        session,
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

// Lấy lịch sử và tỷ lệ chuyên cần của một học sinh
export const getStudentAttendance = async (req, res) => {
    try {
        let studentId = req.params.studentId;

        // Nếu học sinh tự tra cứu (hoặc lấy từ token)
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
            orderBy: { date: 'desc' }
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

// Thống kê tổng quan chuyên cần toàn trường / theo lớp (Admin)
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
