import prisma from '../prismaClient.js';

export const getGradesByClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const semester = req.query.semester || 'HK1_2026';

        const students = await prisma.student.findMany({
            where: { classId },
            select: {
                id: true,
                studentCode: true,
                fullName: true,
                grades: {
                    where: { semester }
                }
            }
        });

        const result = students.map(student => {
            const studentGrade = student.grades.length > 0 ? student.grades[0] : null;
            return {
                id: student.studentCode,
                studentId: student.id,
                name: student.fullName,
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

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi lấy bảng điểm' });
    }
};

export const updateClassGrades = async (req, res) => {
    try {
        const { classId } = req.params;
        const { semester = 'HK1_2026', grades } = req.body;

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
                        math: item.scores.math || 0,
                        literature: item.scores.literature || 0,
                        english: item.scores.english || 0,
                        physics: item.scores.physics || 0,
                        chemistry: item.scores.chemistry || 0,
                        it: item.scores.it || 0
                    },
                    create: {
                        studentId: item.studentId,
                        classId: classId,
                        semester: semester,
                        math: item.scores.math || 0,
                        literature: item.scores.literature || 0,
                        english: item.scores.english || 0,
                        physics: item.scores.physics || 0,
                        chemistry: item.scores.chemistry || 0,
                        it: item.scores.it || 0
                    }
                });
            }
        });

        res.json({ message: 'Cập nhật bảng điểm thành công' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật điểm' });
    }
};
