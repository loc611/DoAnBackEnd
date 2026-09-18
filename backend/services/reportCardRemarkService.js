import prisma from '../prismaClient.js';

/**
 * Service sinh lời nhận xét học bạ thông minh theo chuẩn Thông tư 22/2021/TT-BGDĐT
 * Kết hợp phân tích điểm số các môn, nề nếp chuyên cần và ghi chú sổ đầu bài
 */
class ReportCardRemarkService {
    /**
     * Sinh nhận xét cá nhân hóa cho một học sinh theo học kỳ
     */
    static async generateRemarkForStudent({ studentId, semester = 'HK1_2026' }) {
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: {
                class: true,
                subjectGrades: {
                    where: { semester },
                    include: { subject: true }
                },
                attendances: {
                    where: {
                        date: {
                            gte: new Date(new Date().getFullYear(), 0, 1) // Từ đầu năm
                        }
                    }
                }
            }
        });

        if (!student) {
            throw new Error('Không tìm thấy thông tin học sinh');
        }

        const subjectGrades = student.subjectGrades || [];
        const attendances = student.attendances || [];

        // 1. Phân tích điểm số
        let totalScore = 0;
        let scoreCount = 0;
        const highSubjects = [];
        const lowSubjects = [];

        for (const sg of subjectGrades) {
            if (sg.avgScore !== null && sg.avgScore !== undefined) {
                totalScore += sg.avgScore;
                scoreCount++;

                if (sg.avgScore >= 8.0) {
                    highSubjects.push({ name: sg.subject?.name || 'Môn học', score: sg.avgScore });
                } else if (sg.avgScore < 5.0) {
                    lowSubjects.push({ name: sg.subject?.name || 'Môn học', score: sg.avgScore });
                }
            }
        }

        const gpa = scoreCount > 0 ? Number((totalScore / scoreCount).toFixed(2)) : 0;

        // 2. Phân tích chuyên cần
        const unexcusedCount = attendances.filter(a => a.status === 'unexcused').length;
        const excusedCount = attendances.filter(a => a.status === 'excused').length;
        const lateCount = attendances.filter(a => a.status === 'late').length;

        // 3. Phân loại mức độ năng lực và phẩm chất theo TT 22
        let academicLevel = 'Chưa đạt';
        if (gpa >= 8.0 && lowSubjects.length === 0) {
            academicLevel = 'Tốt / Giỏi';
        } else if (gpa >= 6.5 && lowSubjects.length === 0) {
            academicLevel = 'Khá';
        } else if (gpa >= 5.0) {
            academicLevel = 'Đạt';
        }

        let conductLevel = 'Tốt';
        if (unexcusedCount >= 5 || lateCount >= 7) {
            conductLevel = 'Chưa đạt';
        } else if (unexcusedCount >= 3 || lateCount >= 4) {
            conductLevel = 'Đạt';
        } else if (unexcusedCount >= 1 || lateCount >= 2) {
            conductLevel = 'Khá';
        }

        // 4. Xây dựng văn phong nhận xét sư phạm chuẩn mực
        const strengths = [];
        const areasForImprovement = [];

        // Nhận xét học lực
        if (gpa >= 8.0) {
            strengths.push('Có tư duy học tập rất tốt, khả năng tự giác và nắm bắt kiến thức bài học nhanh nhẹn.');
            if (highSubjects.length > 0) {
                const subNames = highSubjects.map(s => s.name).join(', ');
                strengths.push(`Nổi bật và có năng khiếu ở các môn: ${subNames}.`);
            }
        } else if (gpa >= 6.5) {
            strengths.push('Nắm vững kiến thức trọng tâm các môn học, có tinh thần cầu tiến trong học tập.');
            if (highSubjects.length > 0) {
                strengths.push(`Học tốt các môn: ${highSubjects.map(s => s.name).join(', ')}.`);
            }
        } else if (gpa >= 5.0) {
            strengths.push('Có cố gắng hoàn thành nội dung bài học theo yêu cầu của thầy cô.');
        } else {
            areasForImprovement.push('Còn gặp khó khăn trong việc tiếp thu kiến thức nền tảng.');
        }

        if (lowSubjects.length > 0) {
            const lowNames = lowSubjects.map(s => `${s.name} (${s.score})`).join(', ');
            areasForImprovement.push(`Cần dành thêm thời gian ôn tập và phụ đạo thêm các môn: ${lowNames}.`);
        }

        // Nhận xét nề nếp & chuyên cần
        if (unexcusedCount === 0 && lateCount <= 1) {
            strengths.push('Chấp hành nghiêm chỉnh nội quy nhà trường, đi học chuyên cần và đúng giờ.');
        } else {
            if (unexcusedCount > 0) {
                areasForImprovement.push(`Còn vắng học không phép (${unexcusedCount} buổi), cần chấn chỉnh ý thức kỷ luật.`);
            }
            if (lateCount > 1) {
                areasForImprovement.push(`Còn đi học trễ (${lateCount} lần), cần chú ý giờ giấc sinh hoạt.`);
            }
        }

        // 5. Ghép nối thành nhận xét tổng thể (Overall Remark)
        let overallRemark = '';
        if (academicLevel === 'Tốt / Giỏi' && conductLevel === 'Tốt') {
            overallRemark = `Học sinh chăm ngoan, lễ phép, có ý thức kỷ luật cao. ${strengths.join(' ')} Phát huy tốt năng lực để tiếp tục duy trì thành tích xuất sắc.`;
        } else if (academicLevel === 'Khá') {
            overallRemark = `Học sinh ngoan, hòa đồng với bạn bè. ${strengths.join(' ')} ${areasForImprovement.length > 0 ? areasForImprovement.join(' ') : 'Cần nỗ lực hơn nữa để bứt phá lên mức Xuất sắc trong học kỳ tới.'}`;
        } else {
            overallRemark = `Học sinh cần chủ động trao đổi với thầy cô và bạn bè khi gặp bài tập khó. ${areasForImprovement.join(' ')} Gia đình cần phối hợp chặt chẽ cùng nhà trường để đôn đốc việc tự học tại nhà.`;
        }

        return {
            studentId: student.id,
            studentCode: student.studentCode,
            fullName: student.fullName,
            className: student.class?.className || 'N/A',
            semester,
            analysis: {
                gpa,
                academicLevel,
                conductLevel,
                unexcusedAbsences: unexcusedCount,
                excusedAbsences: excusedCount,
                lateCount,
                highPerformingSubjects: highSubjects,
                lowPerformingSubjects: lowSubjects
            },
            suggestions: {
                strengths,
                areasForImprovement,
                suggestedRemark: overallRemark
            }
        };
    }

    /**
     * Sinh nhận xét hàng loạt cho toàn bộ học sinh trong một lớp
     */
    static async generateRemarksForClass({ classId, semester = 'HK1_2026' }) {
        const students = await prisma.student.findMany({
            where: { classId, status: 'active' },
            select: { id: true, studentCode: true, fullName: true },
            orderBy: { studentCode: 'asc' }
        });

        const results = [];
        for (const st of students) {
            try {
                const remarkData = await this.generateRemarkForStudent({ studentId: st.id, semester });
                results.push(remarkData);
            } catch (err) {
                console.error(`Error generating remark for student ${st.studentCode}:`, err.message);
            }
        }

        return results;
    }
}

export default ReportCardRemarkService;
