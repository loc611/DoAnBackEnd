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

export const getScheduleByClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const semester = req.query.semester || 'HK1_2026';

        const classInfo = await prisma.class.findUnique({ where: { id: classId } });
        if (!classInfo) {
            return res.status(404).json({ message: 'Không tìm thấy lớp học' });
        }

        const schedules = await prisma.schedule.findMany({
            where: { classId, semester }
        });

        const existingMap = new Map(schedules.map(s => [s.period, s]));

        const fullSchedules = defaultPeriods.map(period => {
            if (existingMap.has(period)) {
                const s = existingMap.get(period);
                return {
                    id: s.id,
                    classId: s.classId,
                    semester: s.semester,
                    period: s.period,
                    monday: s.monday || '-',
                    tuesday: s.tuesday || '-',
                    wednesday: s.wednesday || '-',
                    thursday: s.thursday || '-',
                    friday: s.friday || '-',
                    saturday: s.saturday || '-'
                };
            }
            return {
                classId,
                semester,
                period,
                monday: '-',
                tuesday: '-',
                wednesday: '-',
                thursday: '-',
                friday: '-',
                saturday: '-'
            };
        });

        res.json(fullSchedules);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi lấy thời khóa biểu' });
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
