import prisma from '../prismaClient.js';

const defaultPeriods = [
    'Tiết 1 (07:00 - 07:45)',
    'Tiết 2 (07:50 - 08:35)',
    'Tiết 3 (08:55 - 09:40)',
    'Tiết 4 (09:45 - 10:30)',
    'Tiết 5 (10:35 - 11:20)'
];

export const getScheduleByClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const semester = req.query.semester || 'HK1_2026';

        const classInfo = await prisma.class.findUnique({ where: { id: classId } });
        if (!classInfo) {
            return res.status(404).json({ message: 'Không tìm thấy lớp học' });
        }

        let schedules = await prisma.schedule.findMany({
            where: { classId, semester }
        });

        if (schedules.length === 0) {
            schedules = defaultPeriods.map(period => ({
                classId,
                semester,
                period,
                monday: '-', tuesday: '-', wednesday: '-', thursday: '-', friday: '-'
            }));
        } else {
             schedules.sort((a, b) => defaultPeriods.indexOf(a.period) - defaultPeriods.indexOf(b.period));
        }

        res.json(schedules);
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
                        friday: item.friday || '-'
                    },
                    create: {
                        classId,
                        semester,
                        period: item.period,
                        monday: item.monday || '-',
                        tuesday: item.tuesday || '-',
                        wednesday: item.wednesday || '-',
                        thursday: item.thursday || '-',
                        friday: item.friday || '-'
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
