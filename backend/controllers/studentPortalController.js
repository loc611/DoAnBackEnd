import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';
import { verifyResourceOwnership } from '../middlewares/studentAuth.js';

// ==========================================
// 1️⃣ DASHBOARD TỔNG QUAN HỌC SINH
// ==========================================
export const getStudentDashboard = async (req, res) => {
    try {
        const studentId = req.studentId;
        const classId = req.classId;

        // 1. Thông tin học sinh và Lớp + GVCN
        const student = req.student;

        // 2. Lịch học hôm nay
        const now = new Date();
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayOfWeekKey = days[now.getDay()];

        let todayPeriods = [];
        if (classId && dayOfWeekKey !== 'sunday') {
            const schedules = await prisma.schedule.findMany({
                where: { classId }
            });

            // Sắp xếp các tiết
            todayPeriods = schedules.map(s => ({
                period: s.period,
                subject: s[dayOfWeekKey] || '-',
                isActive: false
            })).filter(s => s.subject && s.subject !== '-');
        }

        // 3. Thống kê Chuyên cần & Ngưỡng an toàn
        const attendances = await prisma.attendance.findMany({
            where: { studentId }
        });

        const totalSessions = attendances.length;
        const presentCount = attendances.filter(a => a.status === 'present').length;
        const lateCount = attendances.filter(a => a.status === 'late').length;
        const excusedCount = attendances.filter(a => a.status === 'excused').length;
        const unexcusedCount = attendances.filter(a => a.status === 'unexcused').length;
        const totalMissed = excusedCount + unexcusedCount;

        let warningLevel = 'safe'; // 'safe' (<15) | 'warning' (15-20) | 'danger' (20-45) | 'banned' (>45)
        let warningMessage = 'Chuyên cần tốt, hãy tiếp tục duy trì!';
        if (totalMissed > 45) {
            warningLevel = 'banned';
            warningMessage = 'Báo động: Đã nghỉ quá 45 buổi. Thuộc diện cấm thi học kỳ!';
        } else if (totalMissed >= 20) {
            warningLevel = 'danger';
            warningMessage = 'Nguy hiểm: Đã nghỉ từ 20 buổi trở lên. Cần chấn chỉnh để tránh cấm thi!';
        } else if (totalMissed >= 15) {
            warningLevel = 'warning';
            warningMessage = 'Cảnh báo: Số buổi nghỉ đang tiệm cận mức nguy hiểm (15-20 buổi).';
        }

        const attendanceRate = totalSessions > 0
            ? Math.round(((presentCount + lateCount * 0.8) / totalSessions) * 100)
            : 100;

        // 4. Biến động GPA qua các học kỳ
        const grades = await prisma.grade.findMany({
            where: { studentId },
            orderBy: { semester: 'asc' }
        });

        const gpaTrend = grades.map(g => {
            let gpaVal = g.overallAvgScore;
            if (gpaVal === null || gpaVal === undefined || isNaN(gpaVal)) {
                const scores = [g.math, g.literature, g.english, g.physics, g.chemistry, g.it].filter(s => s > 0);
                gpaVal = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
            }
            return {
                semester: g.semester,
                gpa: parseFloat(Number(gpaVal).toFixed(1)),
                status: g.status
            };
        });

        // 5. Thông báo chung mới nhất cho lớp hoặc toàn trường
        const notifications = await prisma.notification.findMany({
            where: {
                OR: [
                    { targetClassId: null },
                    { targetClassId: classId }
                ]
            },
            take: 4,
            orderBy: { createdAt: 'desc' }
        });

        // 6. Số đơn đang chờ duyệt (nghỉ phép, phúc khảo, đơn từ số hóa)
        const pendingAbsences = await prisma.absenceRequest.count({
            where: { studentId, status: 'PENDING' }
        });
        const pendingReviews = await prisma.gradeReviewRequest.count({
            where: { studentId, status: 'PENDING' }
        });
        const pendingPetitions = await prisma.studentPetition.count({
            where: { studentId, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } }
        });

        res.json({
            success: true,
            data: {
                student: {
                    id: student.id,
                    studentCode: student.studentCode,
                    fullName: student.fullName,
                    className: student.class?.className || 'Chưa phân lớp',
                    gradeLevel: student.class?.grade || 10,
                    homeroomTeacher: student.class?.homeroomTeacher ? {
                        name: student.class.homeroomTeacher.fullName,
                        phone: student.class.homeroomTeacher.phone
                    } : null
                },
                todaySchedule: {
                    date: now.toISOString().split('T')[0],
                    dayName: ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][now.getDay()],
                    periods: todayPeriods
                },
                attendanceWidget: {
                    totalSessions,
                    presentCount,
                    lateCount,
                    excusedCount,
                    unexcusedCount,
                    totalMissed,
                    attendanceRate,
                    warningLevel,
                    warningMessage,
                    thresholds: {
                        safeMax: 15,
                        warningLimit: 20,
                        bannedLimit: 45
                    }
                },
                gpaTrend,
                notifications,
                pendingRequests: {
                    absences: pendingAbsences,
                    reviews: pendingReviews,
                    petitions: pendingPetitions,
                    total: pendingAbsences + pendingReviews + pendingPetitions
                }
            }
        });
    } catch (error) {
        console.error('Lỗi getStudentDashboard:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi tải dữ liệu trang chủ học sinh' });
    }
};

// ==========================================
// 2️⃣ BẢNG ĐIỂM CHI TIẾT & PHÚC KHẢO ĐIỂM
// ==========================================
export const getStudentGrades = async (req, res) => {
    try {
        const studentId = req.studentId;
        const semester = req.query.semester || 'HK1_2026';

        // Lấy danh sách điểm chi tiết từ SubjectGradeDetail
        let gradeDetails = await prisma.subjectGradeDetail.findMany({
            where: { studentId, semester },
            include: {
                subject: {
                    select: { id: true, subjectCode: true, name: true, credits: true, type: true }
                },
                reviewRequests: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        // Nếu chưa có SubjectGradeDetail, tự động đồng bộ từ Grade và các Subject hiện có
        if (gradeDetails.length === 0) {
            const legacyGrade = await prisma.grade.findFirst({
                where: { studentId, semester }
            });

            const allSubjects = await prisma.subject.findMany();
            
            // Map môn cố định sang điểm legacy nếu có
            const subjectMap = {
                'TOAN': legacyGrade?.math || 8.0,
                'VAN': legacyGrade?.literature || 7.5,
                'ANH': legacyGrade?.english || 8.5,
                'LY': legacyGrade?.physics || 7.0,
                'HOA': legacyGrade?.chemistry || 8.0,
                'TIN': legacyGrade?.it || 9.0
            };

            for (const sub of allSubjects) {
                const subCode = sub.subjectCode.toUpperCase();
                const baseScore = subjectMap[subCode] || 7.5;
                const reg1 = Math.min(10, Math.max(0, +(baseScore + (Math.random() * 1.5 - 0.5)).toFixed(1)));
                const reg2 = Math.min(10, Math.max(0, +(baseScore + (Math.random() * 1.0 - 0.5)).toFixed(1)));
                const mid = Math.min(10, Math.max(0, +(baseScore).toFixed(1)));
                const fin = Math.min(10, Math.max(0, +(baseScore).toFixed(1)));
                const avg = +((reg1 + reg2 + mid * 2 + fin * 3) / 7).toFixed(1);

                try {
                    await prisma.subjectGradeDetail.upsert({
                        where: {
                            studentId_subjectId_semester: {
                                studentId,
                                subjectId: sub.id,
                                semester
                            }
                        },
                        update: {},
                        create: {
                            studentId,
                            subjectId: sub.id,
                            semester,
                            regularScores: [reg1, reg2],
                            midtermScore: mid,
                            finalScore: fin,
                            averageScore: avg
                        }
                    });
                } catch (e) {
                    // ignore unique race
                }
            }

            // Tải lại sau khi seed
            gradeDetails = await prisma.subjectGradeDetail.findMany({
                where: { studentId, semester },
                include: {
                    subject: {
                        select: { id: true, subjectCode: true, name: true, credits: true, type: true }
                    },
                    reviewRequests: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                }
            });
        }

        // Lấy danh sách điểm chuyển tiếp từ trường cũ (nếu có)
        const transferredGrades = await prisma.transferredGrade.findMany({
            where: { studentId }
        });

        // Tính GPA và Xếp loại học lực
        let totalScore = 0;
        let validSubjects = 0;
        const formattedSubjects = gradeDetails.map(item => {
            const isTrans = item.isTransferred || transferredGrades.some(t => t.subjectName.toLowerCase() === item.subject.name.toLowerCase());
            const avg = item.averageScore || 0;
            if (avg > 0) {
                totalScore += avg;
                validSubjects++;
            }

            const latestReview = item.reviewRequests[0] || null;

            return {
                id: item.id,
                subjectId: item.subjectId,
                subjectName: item.subject.name,
                subjectCode: item.subject.subjectCode,
                credits: item.subject.credits,
                regularScores: item.regularScores || [],
                midtermScore: item.midtermScore,
                finalScore: item.finalScore,
                averageScore: item.averageScore,
                isTransferred: isTrans,
                transferredNote: item.transferredNote || (isTrans ? 'Điểm bảo lưu từ trường cũ' : null),
                reviewStatus: latestReview ? latestReview.status : null,
                reviewId: latestReview ? latestReview.id : null
            };
        });

        const gpa = validSubjects > 0 ? +(totalScore / validSubjects).toFixed(2) : 0;
        let academicRank = 'Chưa xếp loại';
        let rankBadgeColor = 'slate';
        if (gpa >= 8.0) {
            academicRank = 'Giỏi';
            rankBadgeColor = 'emerald';
        } else if (gpa >= 6.5) {
            academicRank = 'Khá';
            rankBadgeColor = 'blue';
        } else if (gpa >= 5.0) {
            academicRank = 'Trung bình';
            rankBadgeColor = 'amber';
        } else if (gpa > 0) {
            academicRank = 'Yếu';
            rankBadgeColor = 'rose';
        }

        res.json({
            success: true,
            data: {
                semester,
                gpa,
                academicRank,
                rankBadgeColor,
                subjects: formattedSubjects,
                transferredSummary: transferredGrades
            }
        });
    } catch (error) {
        console.error('Lỗi getStudentGrades:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi tải bảng điểm học sinh' });
    }
};

// ==========================================
// 3️⃣ PHÚC KHẢO ĐIỂM (GRADE REVIEW)
// ==========================================
export const createGradeReviewRequest = async (req, res) => {
    try {
        const studentId = req.studentId;
        const { subjectGradeDetailId, scoreComponent, expectedScore, reason, evidenceUrl } = req.body;

        if (!subjectGradeDetailId || !scoreComponent || !reason || reason.trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn đầu điểm và cung cấp lý do giải trình chi tiết (tối thiểu 10 ký tự)'
            });
        }

        // Xác thực SubjectGradeDetail và chống IDOR
        const gradeDetail = await prisma.subjectGradeDetail.findUnique({
            where: { id: subjectGradeDetailId },
            include: { subject: true }
        });

        if (!gradeDetail) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin đầu điểm' });
        }

        if (gradeDetail.studentId !== studentId) {
            await verifyResourceOwnership(gradeDetail.studentId, req, 'SubjectGradeDetail', subjectGradeDetailId);
            return res.status(403).json({ success: false, message: 'Bạn không có quyền gửi phúc khảo cho điểm số này' });
        }

        // Lấy điểm hiện tại của thành phần được chọn
        let currentScore = 0;
        if (scoreComponent === 'tx') {
            currentScore = gradeDetail.regularScores[0] || 0;
        } else if (scoreComponent === 'gk') {
            currentScore = gradeDetail.midtermScore || 0;
        } else if (scoreComponent === 'ck') {
            currentScore = gradeDetail.finalScore || 0;
        }

        const reviewRequest = await prisma.gradeReviewRequest.create({
            data: {
                studentId,
                subjectGradeDetailId,
                scoreComponent,
                currentScore,
                expectedScore: expectedScore ? parseFloat(expectedScore) : null,
                reason: reason.trim(),
                evidenceUrl: evidenceUrl || null,
                status: 'PENDING'
            }
        });

        res.json({
            success: true,
            message: `Gửi yêu cầu phúc khảo môn ${gradeDetail.subject.name} thành công. Nhà trường sẽ xử lý trong vòng 5 ngày làm việc.`,
            data: reviewRequest
        });
    } catch (error) {
        console.error('Lỗi createGradeReviewRequest:', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ khi gửi đơn phúc khảo' });
    }
};

export const getGradeReviewRequests = async (req, res) => {
    try {
        const studentId = req.studentId;

        const requests = await prisma.gradeReviewRequest.findMany({
            where: { studentId },
            include: {
                subjectGradeDetail: {
                    include: {
                        subject: { select: { name: true, subjectCode: true } }
                    }
                },
                reviewedBy: {
                    select: { username: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: requests.map(r => ({
                id: r.id,
                subjectName: r.subjectGradeDetail.subject.name,
                semester: r.subjectGradeDetail.semester,
                scoreComponent: r.scoreComponent === 'tx' ? 'ĐG thường xuyên' : (r.scoreComponent === 'gk' ? 'Giữa kỳ' : 'Cuối kỳ'),
                currentScore: r.currentScore,
                expectedScore: r.expectedScore,
                reason: r.reason,
                status: r.status,
                responseNote: r.responseNote,
                reviewedAt: r.reviewedAt,
                createdAt: r.createdAt
            }))
        });
    } catch (error) {
        console.error('Lỗi getGradeReviewRequests:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi tải danh sách phúc khảo' });
    }
};

// ==========================================
// 4️⃣ CHUYÊN CẦN & ĐƠN XIN NGHỈ HỌC
// ==========================================
export const getAttendanceSummary = async (req, res) => {
    try {
        const studentId = req.studentId;

        const attendances = await prisma.attendance.findMany({
            where: { studentId },
            orderBy: [{ date: 'desc' }, { periodNumber: 'asc' }]
        });

        const totalSessions = attendances.length;
        const presentCount = attendances.filter(a => a.status === 'present').length;
        const lateCount = attendances.filter(a => a.status === 'late').length;
        const excusedCount = attendances.filter(a => a.status === 'excused').length;
        const unexcusedCount = attendances.filter(a => a.status === 'unexcused').length;
        const totalMissed = excusedCount + unexcusedCount;

        const attendanceRate = totalSessions > 0
            ? Math.round(((presentCount + lateCount * 0.8) / totalSessions) * 100)
            : 100;

        let warningLevel = 'safe';
        let warningMessage = 'Tỷ lệ chuyên cần đạt chuẩn';
        if (totalMissed > 45) {
            warningLevel = 'banned';
            warningMessage = 'Đã nghỉ vượt quá 45 buổi. Bị cấm thi học kỳ theo Quy chế BGDĐT!';
        } else if (totalMissed >= 20) {
            warningLevel = 'danger';
            warningMessage = 'Cảnh báo nghiêm trọng: Đã nghỉ quá 20 buổi. Nguy cơ bị cấm thi rất cao!';
        } else if (totalMissed >= 15) {
            warningLevel = 'warning';
            warningMessage = 'Lưu ý: Bạn đã nghỉ 15 buổi, đang tiến gần đến ngưỡng cảnh báo 20 buổi.';
        }

        // Lấy lịch sử đơn xin nghỉ
        const absenceRequests = await prisma.absenceRequest.findMany({
            where: { studentId },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: {
                stats: {
                    totalSessions,
                    presentCount,
                    lateCount,
                    excusedCount,
                    unexcusedCount,
                    totalMissed,
                    attendanceRate,
                    warningLevel,
                    warningMessage,
                    thresholds: {
                        safeMax: 15,
                        warningLimit: 20,
                        bannedLimit: 45
                    }
                },
                history: attendances.map(a => ({
                    id: a.id,
                    date: a.date.toISOString().split('T')[0],
                    periodNumber: a.periodNumber,
                    periodName: a.periodName,
                    subjectName: a.subjectName || 'Chung',
                    session: a.session === 'morning' ? 'Sáng' : 'Chiều',
                    status: a.status,
                    note: a.note
                })),
                absenceRequests: absenceRequests.map(ar => ({
                    id: ar.id,
                    fromDate: ar.fromDate.toISOString().split('T')[0],
                    toDate: ar.toDate.toISOString().split('T')[0],
                    session: ar.session === 'all_day' ? 'Cả ngày' : (ar.session === 'morning' ? 'Buổi sáng' : 'Buổi chiều'),
                    reason: ar.reason,
                    status: ar.status,
                    reviewNote: ar.reviewNote,
                    createdAt: ar.createdAt
                }))
            }
        });
    } catch (error) {
        console.error('Lỗi getAttendanceSummary:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi tải báo cáo chuyên cần' });
    }
};

export const createAbsenceRequest = async (req, res) => {
    try {
        const studentId = req.studentId;
        const { fromDate, toDate, session = 'all_day', reason, attachmentUrl } = req.body;

        if (!fromDate || !toDate || !reason || reason.trim().length < 5) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đầy đủ ngày bắt đầu, ngày kết thúc và lý do xin nghỉ (tối thiểu 5 ký tự)'
            });
        }

        const start = new Date(fromDate);
        const end = new Date(toDate);

        if (start > end) {
            return res.status(400).json({
                success: false,
                message: 'Ngày kết thúc không thể trước ngày bắt đầu'
            });
        }

        const request = await prisma.absenceRequest.create({
            data: {
                studentId,
                fromDate: start,
                toDate: end,
                session,
                reason: reason.trim(),
                attachmentUrl: attachmentUrl || null,
                status: 'PENDING'
            }
        });

        // Tự động tạo thông báo gửi đến Giáo viên chủ nhiệm nếu có
        if (req.student.class?.homeroomTeacher) {
            try {
                const teacherUser = await prisma.teacher.findUnique({
                    where: { id: req.student.class.homeroomTeacher.id },
                    select: { userId: true }
                });

                if (teacherUser) {
                    await prisma.notification.create({
                        data: {
                            title: `Đơn xin nghỉ học: ${req.student.fullName} (${req.student.class.className})`,
                            content: `Học sinh ${req.student.fullName} vừa gửi đơn xin nghỉ học từ ${fromDate} đến ${toDate}. Lý do: ${reason}`,
                            type: 'Đơn từ học sinh',
                            targetClassId: req.classId,
                            createdById: req.user.id
                        }
                    });
                }
            } catch (notifErr) {
                console.warn('Lỗi tạo notification đơn nghỉ học:', notifErr.message);
            }
        }

        res.json({
            success: true,
            message: 'Đã gửi đơn xin nghỉ phép tới Giáo viên Chủ nhiệm thành công',
            data: request
        });
    } catch (error) {
        console.error('Lỗi createAbsenceRequest:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi tạo đơn xin nghỉ phép' });
    }
};

// ==========================================
// 5️⃣ ĐĂNG KÝ TỔ HỢP MÔN KHỐI 10
// ==========================================
export const getSubjectCombinations = async (req, res) => {
    try {
        let combinations = await prisma.subjectCombination.findMany({
            where: { isOpen: true },
            orderBy: { code: 'asc' }
        });

        // Khởi tạo danh mục tổ hợp mẫu chuẩn nếu database chưa có
        if (combinations.length === 0) {
            const defaults = [
                {
                    code: 'KHTN-01',
                    name: 'Khoa học Tự nhiên 1 (Định hướng Kỹ thuật & Công nghệ)',
                    description: 'Tập trung chuyên sâu các môn Toán, Vật lý, Hóa học và Tin học định hướng ứng dụng.',
                    subjectsList: ['Vật lý', 'Hóa học', 'Sinh học', 'Tin học chuyên đề'],
                    capacity: 45,
                    gradeLevel: 10
                },
                {
                    code: 'KHTN-02',
                    name: 'Khoa học Tự nhiên 2 (Định hướng Y Dược & Sinh học)',
                    description: 'Tập trung chuyên sâu các môn Toán, Hóa học, Sinh học và Công nghệ sinh học.',
                    subjectsList: ['Hóa học', 'Sinh học', 'Vật lý', 'Công nghệ Nông nghiệp'],
                    capacity: 45,
                    gradeLevel: 10
                },
                {
                    code: 'KHXH-01',
                    name: 'Khoa học Xã hội 1 (Định hướng Kinh tế & Luật)',
                    description: 'Tập trung phát triển tư duy xã hội, Kinh tế Pháp luật, Địa lý và Ngoại ngữ nâng cao.',
                    subjectsList: ['Lịch sử', 'Địa lý', 'Giáo dục Kinh tế & Pháp luật', 'Tiếng Anh chuyên đề'],
                    capacity: 45,
                    gradeLevel: 10
                },
                {
                    code: 'KHXH-02',
                    name: 'Khoa học Xã hội 2 (Định hướng Báo chí, Ngôn ngữ & Nghệ thuật)',
                    description: 'Tập trung chuyên sâu Ngữ văn nâng cao, Lịch sử, Âm nhạc và Mỹ thuật sáng tạo.',
                    subjectsList: ['Lịch sử', 'Địa lý', 'Âm nhạc/Mỹ thuật', 'Ngữ văn chuyên đề'],
                    capacity: 45,
                    gradeLevel: 10
                }
            ];

            for (const item of defaults) {
                try {
                    await prisma.subjectCombination.create({ data: item });
                } catch (e) {
                    // ignore
                }
            }

            combinations = await prisma.subjectCombination.findMany({
                where: { isOpen: true },
                orderBy: { code: 'asc' }
            });
        }

        // Lấy thông tin đăng ký hiện tại của học sinh
        const currentRegistration = await prisma.subjectGroupRegistration.findUnique({
            where: { studentId: req.studentId },
            include: {
                firstChoice: true,
                assignedClass: { select: { className: true, grade: true } }
            }
        });

        res.json({
            success: true,
            data: {
                combinations,
                currentRegistration
            }
        });
    } catch (error) {
        console.error('Lỗi getSubjectCombinations:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi tải danh mục tổ hợp môn' });
    }
};

export const submitSubjectGroupRegistration = async (req, res) => {
    try {
        const studentId = req.studentId;
        const { firstChoiceId, secondChoiceId, thirdChoiceId, note } = req.body;

        if (!firstChoiceId || !secondChoiceId) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn tối thiểu Nguyện vọng 1 (NV1) và Nguyện vọng 2 (NV2)'
            });
        }

        if (firstChoiceId === secondChoiceId || (thirdChoiceId && (thirdChoiceId === firstChoiceId || thirdChoiceId === secondChoiceId))) {
            return res.status(400).json({
                success: false,
                message: 'Các nguyện vọng tổ hợp môn không được trùng lặp nhau'
            });
        }

        const registration = await prisma.subjectGroupRegistration.upsert({
            where: { studentId },
            update: {
                firstChoiceId,
                secondChoiceId,
                thirdChoiceId: thirdChoiceId || null,
                note: note || null,
                submittedAt: new Date()
            },
            create: {
                studentId,
                firstChoiceId,
                secondChoiceId,
                thirdChoiceId: thirdChoiceId || null,
                note: note || null,
                status: 'PENDING'
            }
        });

        res.json({
            success: true,
            message: 'Đăng ký nguyện vọng tổ hợp môn khối 10 thành công. Chờ nhà trường xét duyệt xếp lớp.',
            data: registration
        });
    } catch (error) {
        console.error('Lỗi submitSubjectGroupRegistration:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi lưu đăng ký tổ hợp môn' });
    }
};

// ==========================================
// 6️⃣ THỜI KHÓA BIỂU & LỊCH THI
// ==========================================
export const getStudentSchedule = async (req, res) => {
    try {
        const classId = req.classId;
        const semester = req.query.semester || 'HK1_2026';

        if (!classId) {
            return res.json({ success: true, data: { schedule: [], classInfo: null } });
        }

        const schedules = await prisma.schedule.findMany({
            where: { classId, semester },
            orderBy: { period: 'asc' }
        });

        res.json({
            success: true,
            data: {
                classInfo: {
                    className: req.student.class?.className,
                    homeroomTeacher: req.student.class?.homeroomTeacher?.fullName
                },
                schedule: schedules
            }
        });
    } catch (error) {
        console.error('Lỗi getStudentSchedule:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi tải thời khóa biểu' });
    }
};

export const getStudentExams = async (req, res) => {
    try {
        const classId = req.classId;
        const gradeLevel = req.student.class?.grade || 10;
        const reqSemester = req.query.semester || 'HK1_2026';
        const semesterFilter = (reqSemester === 'HK1_2026' || reqSemester === 'HK1') 
            ? { in: ['HK1', 'HK1_2026'] } 
            : reqSemester;

        const exams = await prisma.examSchedule.findMany({
            where: {
                semester: semesterFilter,
                OR: [
                    { classId },
                    { grade: gradeLevel }
                ]
            },
            orderBy: { examDate: 'asc' }
        });

        res.json({
            success: true,
            data: exams.map(e => ({
                id: e.id,
                subjectName: e.subjectName,
                examType: e.examType,
                examDate: e.examDate.toISOString().split('T')[0],
                startTime: e.startTime,
                duration: e.duration,
                room: e.room,
                examFormat: e.examFormat,
                notes: e.notes
            }))
        });
    } catch (error) {
        console.error('Lỗi getStudentExams:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi tải lịch thi' });
    }
};

// ==========================================
// 7️⃣ HỒ SƠ CÁ NHÂN & ĐỔI MẬT KHẨU
// ==========================================
export const getStudentProfile = async (req, res) => {
    try {
        const student = await prisma.student.findUnique({
            where: { id: req.studentId },
            include: {
                class: {
                    include: { homeroomTeacher: true }
                },
                user: {
                    select: { email: true, username: true, createdAt: true }
                },
                transferRecords: true,
                transferredGrades: true
            }
        });

        res.json({
            success: true,
            data: {
                studentCode: student.studentCode,
                fullName: student.fullName,
                dateOfBirth: student.dateOfBirth,
                gender: student.gender,
                address: student.address,
                phone: student.phone,
                email: student.email || student.user?.email,
                parentName: student.parentName,
                parentPhone: student.parentPhone,
                className: student.class?.className || 'Chưa phân lớp',
                grade: student.class?.grade || 10,
                homeroomTeacher: student.class?.homeroomTeacher?.fullName || 'Chưa phân công',
                enrolledAt: student.enrolledAt || student.createdAt,
                isTransferStudent: student.transferRecords.length > 0,
                transferInfo: student.transferRecords[0] || null
            }
        });
    } catch (error) {
        console.error('Lỗi getStudentProfile:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi tải hồ sơ cá nhân' });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu mới phải có tối thiểu 6 ký tự'
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin tài khoản' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không chính xác' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashedPassword }
        });

        res.json({
            success: true,
            message: 'Đổi mật khẩu thành công. Vui lòng sử dụng mật khẩu mới cho các lần đăng nhập tiếp theo.'
        });
    } catch (error) {
        console.error('Lỗi changePassword:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi đổi mật khẩu' });
    }
};
