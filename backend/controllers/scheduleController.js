import prisma from '../prismaClient.js';

const defaultPeriods = [
    // Buổi Sáng
    'Tiết 1 (07:00 - 07:45)',
    'Tiết 2 (07:50 - 08:35)',
    'Tiết 3 (08:55 - 09:40)',
    'Tiết 4 (09:45 - 10:30)',
    'Tiết 5 (10:35 - 11:20)',
    // Buổi Chiều
    'Tiết 6 (13:00 - 13:45)',
    'Tiết 7 (13:50 - 14:35)',
    'Tiết 8 (14:55 - 15:40)',
    'Tiết 9 (15:45 - 16:30)',
    'Tiết 10 (16:35 - 17:20)',
    // Buổi Tối
    'Tiết 11 (17:45 - 18:30)',
    'Tiết 12 (18:35 - 19:20)',
    'Tiết 13 (19:25 - 20:10)'
];

// Trợ lý xác định phòng học thông minh theo môn và tên lớp
export const getRoomForClassAndSubject = (className = '', subjectName = '') => {
    const s = (subjectName || '').toLowerCase().trim();
    if (!s || s === '-') return '';
    if (s.includes('tin học') || s.includes('tin')) return 'P. Máy 1';
    if (s.includes('hóa') || s.includes('sinh') || s.includes('vật lý') || s.includes('khtn')) return 'Lab Thực Hành';
    if (s.includes('thể dục') || s.includes('gdtc') || s.includes('qpan')) return 'Sân Đa Năng';
    if (s.includes('tiếng anh') || s.includes('ngoại ngữ')) return 'P. Ngoại Ngữ';
    if (s.includes('chào cờ')) return 'Sân Trường';
    
    // Phòng văn hóa theo khối lớp
    const match = className.match(/(\d+)([A-Z]\d*)/i);
    if (match) {
        const grade = match[1]; // 10, 11, 12
        const sub = match[2].toUpperCase(); // A1, A2, B1
        const num = sub.replace(/\D/g, '') || '1';
        return `P.${grade === '10' ? '20' : grade === '11' ? '30' : '40'}${num}`;
    }
    return `P.${className || '101'}`;
};

// Chuẩn hóa tên môn để so khớp không dấu/khoảng trắng
const normalizeName = (name = '') => {
    return name.toLowerCase().replace(/\s+/g, '').replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
        .replace(/[èéẹẻẽêềếệểễ]/g, 'e').replace(/[ìíịỉĩ]/g, 'i')
        .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o').replace(/[ùúụủũưừứựửữ]/g, 'u')
        .replace(/[ỳýỵỷỹ]/g, 'y').replace(/đ/g, 'd');
};

export const getScheduleByClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const semester = req.query.semester || 'HK1_2026';

        const classInfo = await prisma.class.findUnique({
            where: { id: classId },
            include: {
                homeroomTeacher: true,
                teacherAssignments: {
                    include: {
                        teacher: true,
                        subject: true
                    }
                }
            }
        });
        if (!classInfo) {
            return res.status(404).json({ message: 'Không tìm thấy lớp học' });
        }

        // Tạo map môn học -> giáo viên bộ môn
        const subjectTeacherMap = {};
        if (classInfo.teacherAssignments) {
            classInfo.teacherAssignments.forEach(ta => {
                if (ta.subject?.name && ta.teacher?.fullName) {
                    subjectTeacherMap[normalizeName(ta.subject.name)] = ta.teacher.fullName;
                }
            });
        }

        const schedules = await prisma.schedule.findMany({
            where: { classId, semester }
        });

        const existingMap = new Map(schedules.map(s => [s.period, s]));

        const fullSchedules = defaultPeriods.map(period => {
            const rowData = existingMap.get(period) || {
                monday: '-',
                tuesday: '-',
                wednesday: '-',
                thursday: '-',
                friday: '-',
                saturday: '-'
            };

            const buildCellDetail = (val) => {
                if (!val || val === '-') return null;
                const norm = normalizeName(val);
                let teacherName = subjectTeacherMap[norm];
                if (!teacherName) {
                    if (val.includes('Chào cờ') || val.includes('Sinh hoạt')) {
                        teacherName = classInfo.homeroomTeacher?.fullName || 'GV Chủ nhiệm';
                    } else {
                        teacherName = 'GV Bộ môn';
                    }
                }
                return {
                    subject: val,
                    teacherName,
                    room: getRoomForClassAndSubject(classInfo.className, val),
                    className: classInfo.className,
                    classId: classInfo.id
                };
            };

            return {
                id: rowData.id || `${classId}_${period}`,
                classId,
                className: classInfo.className,
                semester,
                period,
                monday: rowData.monday || '-',
                tuesday: rowData.tuesday || '-',
                wednesday: rowData.wednesday || '-',
                thursday: rowData.thursday || '-',
                friday: rowData.friday || '-',
                saturday: rowData.saturday || '-',
                details: {
                    monday: buildCellDetail(rowData.monday),
                    tuesday: buildCellDetail(rowData.tuesday),
                    wednesday: buildCellDetail(rowData.wednesday),
                    thursday: buildCellDetail(rowData.thursday),
                    friday: buildCellDetail(rowData.friday),
                    saturday: buildCellDetail(rowData.saturday)
                }
            };
        });

        res.json(fullSchedules);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi lấy thời khóa biểu' });
    }
};

// Lấy Thời Khóa Biểu Giảng Dạy Cá Nhân Của Giáo Viên (Teacher-centric View)
export const getMyTeachingSchedule = async (req, res) => {
    try {
        const semester = req.query.semester || 'HK1_2026';
        let teacherId = req.params.teacherId;

        // Nếu không truyền teacherId thì lấy từ tài khoản đang đăng nhập
        if (!teacherId) {
            teacherId = req.user?.teacher?.id;
            if (!teacherId && req.user?.id) {
                const teacherRecord = await prisma.teacher.findFirst({
                    where: { userId: req.user.id }
                });
                if (teacherRecord) teacherId = teacherRecord.id;
            }
        }

        // Nếu vẫn chưa tìm thấy và user là admin, cho phép lấy giáo viên đầu tiên để xem demo
        if (!teacherId && (req.user?.role === 'admin' || req.user?.role === 'teacher')) {
            const firstTeacher = await prisma.teacher.findFirst({
                include: { user: true }
            });
            if (firstTeacher) teacherId = firstTeacher.id;
        }

        if (!teacherId) {
            return res.status(404).json({ message: 'Không tìm thấy hồ sơ giáo viên tương ứng' });
        }

        const teacher = await prisma.teacher.findUnique({
            where: { id: teacherId },
            include: {
                user: true,
                homeroomClasses: true,
                teacherAssignments: {
                    include: {
                        class: true,
                        subject: true
                    }
                }
            }
        });

        if (!teacher) {
            return res.status(404).json({ message: 'Không tìm thấy thông tin giáo viên' });
        }

        // Lấy danh sách phân công: môn học + lớp học
        const assignments = teacher.teacherAssignments || [];
        const assignedClassIds = [...new Set(assignments.map(a => a.classId))];
        
        // Thêm lớp chủ nhiệm nếu có
        if (teacher.homeroomClasses) {
            teacher.homeroomClasses.forEach(c => {
                if (!assignedClassIds.includes(c.id)) assignedClassIds.push(c.id);
            });
        }

        // Map môn học được phân công theo lớp: [classId_normSubject] = true
        const assignmentMap = new Map();
        assignments.forEach(a => {
            const key = `${a.classId}_${normalizeName(a.subject?.name)}`;
            assignmentMap.set(key, {
                subjectName: a.subject?.name,
                className: a.class?.className,
                classId: a.classId
            });
        });

        const homeroomClassIds = new Set((teacher.homeroomClasses || []).map(c => c.id));

        // Lấy toàn bộ thời khóa biểu của các lớp giáo viên có dạy
        const schedules = await prisma.schedule.findMany({
            where: {
                classId: { in: assignedClassIds },
                semester
            },
            include: { class: true }
        });

        // Tạo ma trận lịch giảng dạy cá nhân theo defaultPeriods
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        const teacherSchedule = defaultPeriods.map(period => {
            const row = {
                period,
                monday: '-',
                tuesday: '-',
                wednesday: '-',
                thursday: '-',
                friday: '-',
                saturday: '-',
                details: {}
            };

            days.forEach(day => {
                // Quét các lớp có lịch trong period và day này
                for (const s of schedules) {
                    const subjectInCell = s[day];
                    if (!subjectInCell || subjectInCell === '-') continue;

                    const norm = normalizeName(subjectInCell);
                    const assignKey = `${s.classId}_${norm}`;
                    
                    const isDirectSubject = assignmentMap.has(assignKey);
                    const isHomeroomActivity = homeroomClassIds.has(s.classId) && 
                        (subjectInCell.includes('Chào cờ') || subjectInCell.includes('Sinh hoạt'));

                    if (isDirectSubject || isHomeroomActivity) {
                        const displaySubject = subjectInCell;
                        const className = s.class?.className || 'Lớp';
                        const room = getRoomForClassAndSubject(className, displaySubject);

                        row[day] = `${displaySubject} - ${className}`;
                        row.details[day] = {
                            subject: displaySubject,
                            className,
                            classId: s.classId,
                            room,
                            teacherName: teacher.fullName,
                            isHomeroom: homeroomClassIds.has(s.classId)
                        };
                        break; // Đã tìm thấy tiết dạy của GV trong khung giờ này
                    }
                }
            });

            return row;
        });

        res.json({
            teacherInfo: {
                id: teacher.id,
                fullName: teacher.fullName,
                teacherCode: teacher.teacherCode,
                email: teacher.user?.email,
                homeroomClass: teacher.homeroomClasses?.[0]?.className || null,
                totalAssignedClasses: assignedClassIds.length
            },
            schedules: teacherSchedule
        });
    } catch (error) {
        console.error('Lỗi khi lấy lịch dạy giáo viên:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy lịch dạy cá nhân' });
    }
};

export const updateSchedule = async (req, res) => {
    try {
        const { classId } = req.params;
        const { semester = 'HK1_2026', schedules } = req.body;

        await prisma.$transaction(async (tx) => {
            for (const item of schedules) {
                const uniqueInput = {
                    classId_semester_period: {
                        classId,
                        semester,
                        period: item.period
                    }
                };

                await tx.schedule.upsert({
                    where: uniqueInput,
                    update: {
                        monday: item.monday || '-',
                        tuesday: item.tuesday || '-',
                        wednesday: item.wednesday || '-',
                        thursday: item.thursday || '-',
                        friday: item.friday || '-',
                        saturday: item.saturday || '-'
                    },
                    create: {
                        classId,
                        semester,
                        period: item.period,
                        monday: item.monday || '-',
                        tuesday: item.tuesday || '-',
                        wednesday: item.wednesday || '-',
                        thursday: item.thursday || '-',
                        friday: item.friday || '-',
                        saturday: item.saturday || '-'
                    }
                });
            }
        });

        res.json({ message: 'Cập nhật thời khóa biểu thành công' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật thời khóa biểu' });
    }
};

export const createMakeupProposal = async (req, res) => {
    try {
        const { classId, subject, originalDate, originalPeriod, proposedDate, proposedPeriod, reason } = req.body;
        const teacherName = req.user?.name || req.user?.teacher?.fullName || 'Giáo viên';
        
        let targetClassName = 'Lớp học';
        if (classId) {
            const c = await prisma.class.findUnique({ where: { id: classId } });
            if (c) targetClassName = c.className;
        }

        // Tự động tạo thông báo gửi tới ban giám hiệu / tổ chuyên môn
        try {
            await prisma.notification.create({
                data: {
                    title: `[Đề xuất dạy bù] ${teacherName} - Môn ${subject || 'Bộ môn'}`,
                    content: `Giáo viên ${teacherName} gửi đề xuất dạy bù lớp ${targetClassName} vào ${proposedPeriod || 'Tiết'} ngày ${proposedDate} (thay cho ${originalPeriod || 'tiết nghỉ'} ngày ${originalDate}). Lý do: ${reason || 'Công tác cá nhân'}`,
                    type: 'SYSTEM',
                    userId: req.user.id
                }
            });
        } catch (notifErr) {
            console.warn('Không tạo được notification:', notifErr.message);
        }

        res.status(201).json({
            success: true,
            message: 'Đề xuất dạy bù đã được gửi thành công và đang chờ duyệt!',
            data: {
                classId,
                className: targetClassName,
                subject,
                originalDate,
                originalPeriod,
                proposedDate,
                proposedPeriod,
                reason,
                status: 'Pending',
                createdAt: new Date()
            }
        });
    } catch (error) {
        console.error('Lỗi createMakeupProposal:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi gửi đề xuất dạy bù' });
    }
};

