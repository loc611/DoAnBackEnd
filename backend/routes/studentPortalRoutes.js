import express from 'express';
import {
    getStudentDashboard,
    getStudentGrades,
    createGradeReviewRequest,
    getGradeReviewRequests,
    getAttendanceSummary,
    createAbsenceRequest,
    getSubjectCombinations,
    submitSubjectGroupRegistration,
    getStudentSchedule,
    getStudentExams,
    getStudentProfile,
    changePassword
} from '../controllers/studentPortalController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { requireStudentContext } from '../middlewares/studentAuth.js';
import prisma from '../prismaClient.js';

const router = express.Router();

// Tất cả các route bên dưới bắt buộc phải đăng nhập
router.use(protect);

// ==========================================
// 🎓 PHÂN HỆ HỌC SINH (Yêu cầu context Student & Chống IDOR)
// ==========================================
router.get('/dashboard', requireStudentContext, getStudentDashboard);
router.get('/grades', requireStudentContext, getStudentGrades);
router.get('/grade-reviews', requireStudentContext, getGradeReviewRequests);
router.post('/grade-reviews', requireStudentContext, createGradeReviewRequest);

router.get('/attendance-summary', requireStudentContext, getAttendanceSummary);
router.post('/absences', requireStudentContext, createAbsenceRequest);

router.get('/subject-combinations', requireStudentContext, getSubjectCombinations);
router.post('/subject-group-registration', requireStudentContext, submitSubjectGroupRegistration);

router.get('/schedule', requireStudentContext, getStudentSchedule);
router.get('/exams', requireStudentContext, getStudentExams);
router.get('/profile', requireStudentContext, getStudentProfile);
router.put('/change-password', requireStudentContext, changePassword);

// ==========================================
// 👨‍🏫 GVCN / ADMIN PHÊ DUYỆT ĐƠN NGHỈ PHÉP & PHÚC KHẢO
// ==========================================
// Duyệt đơn xin nghỉ phép (Tự động đồng bộ sang bảng Attendance trạng thái 'excused')
router.put('/absences/:id/approve', authorize('teacher', 'admin', 'principal', 'vice_principal'), async (req, res) => {
    try {
        const { id } = req.params;
        const { reviewNote } = req.body;

        const absence = await prisma.absenceRequest.findUnique({
            where: { id },
            include: {
                student: {
                    include: { class: true }
                }
            }
        });

        if (!absence) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn xin nghỉ học' });
        }

        // Cập nhật trạng thái đơn
        const updated = await prisma.absenceRequest.update({
            where: { id },
            data: {
                status: 'APPROVED',
                reviewedById: req.user.id,
                reviewNote: reviewNote || 'Đã đồng ý cho nghỉ phép theo đơn',
                reviewedAt: new Date()
            }
        });

        // 🔄 Tự động đồng bộ tạo / cập nhật bản ghi Attendance thành 'excused' (Có phép)
        try {
            const startDate = new Date(absence.fromDate);
            const endDate = new Date(absence.toDate);
            const classId = absence.student.classId;

            if (classId) {
                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    const curDate = new Date(d);
                    curDate.setHours(0, 0, 0, 0);

                    // Điểm danh 5 tiết hoặc theo session
                    const sessionType = absence.session === 'all_day' ? 'morning' : absence.session;

                    for (let periodNum = 1; periodNum <= 5; periodNum++) {
                        await prisma.attendance.upsert({
                            where: {
                                studentId_classId_date_periodNumber: {
                                    studentId: absence.studentId,
                                    classId: classId,
                                    date: curDate,
                                    periodNumber: periodNum
                                }
                            },
                            update: {
                                status: 'excused',
                                note: `Nghỉ phép theo đơn: ${absence.reason}`
                            },
                            create: {
                                studentId: absence.studentId,
                                classId: classId,
                                date: curDate,
                                periodNumber: periodNum,
                                periodName: `Tiết ${periodNum}`,
                                session: sessionType,
                                status: 'excused',
                                note: `Nghỉ phép theo đơn: ${absence.reason}`
                            }
                        });
                    }
                }
            }

            // Gửi notification cho học sinh
            await prisma.notification.create({
                data: {
                    title: 'Đơn xin nghỉ phép đã được duyệt',
                    content: `Giáo viên chủ nhiệm đã duyệt đơn xin nghỉ học từ ngày ${absence.fromDate.toISOString().split('T')[0]}. Trạng thái điểm danh đã được cập nhật thành Có phép.`,
                    type: 'Thông báo cá nhân',
                    createdById: req.user.id
                }
            });
        } catch (syncErr) {
            console.warn('Lỗi đồng bộ Attendance tự động:', syncErr.message);
        }

        res.json({
            success: true,
            message: 'Đã phê duyệt đơn xin nghỉ và đồng bộ chuyên cần thành công',
            data: updated
        });
    } catch (error) {
        console.error('Lỗi duyệt đơn nghỉ phép:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi duyệt đơn nghỉ phép' });
    }
});

// Từ chối đơn xin nghỉ phép
router.put('/absences/:id/reject', authorize('teacher', 'admin', 'principal', 'vice_principal'), async (req, res) => {
    try {
        const { id } = req.params;
        const { reviewNote } = req.body;

        const updated = await prisma.absenceRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                reviewedById: req.user.id,
                reviewNote: reviewNote || 'Đơn xin nghỉ không hợp lệ hoặc thiếu minh chứng',
                reviewedAt: new Date()
            }
        });

        res.json({
            success: true,
            message: 'Đã từ chối đơn xin nghỉ phép',
            data: updated
        });
    } catch (error) {
        console.error('Lỗi từ chối đơn nghỉ phép:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi từ chối đơn nghỉ phép' });
    }
});

// Duyệt phúc khảo điểm
router.put('/grade-reviews/:id/resolve', authorize('teacher', 'admin', 'principal', 'vice_principal'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, responseNote, newScore } = req.body; // status: 'APPROVED' | 'REJECTED'

        const review = await prisma.gradeReviewRequest.findUnique({
            where: { id },
            include: { subjectGradeDetail: true }
        });

        if (!review) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu phúc khảo' });
        }

        const updated = await prisma.gradeReviewRequest.update({
            where: { id },
            data: {
                status: status || 'APPROVED',
                responseNote: responseNote || null,
                reviewedById: req.user.id,
                reviewedAt: new Date()
            }
        });

        // Nếu duyệt điểm và có điểm mới, cập nhật lại SubjectGradeDetail
        if (status === 'APPROVED' && newScore !== undefined) {
            const scoreVal = parseFloat(newScore);
            let updatePayload = {};
            if (review.scoreComponent === 'tx') {
                updatePayload = { regularScores: [scoreVal] };
            } else if (review.scoreComponent === 'gk') {
                updatePayload = { midtermScore: scoreVal };
            } else if (review.scoreComponent === 'ck') {
                updatePayload = { finalScore: scoreVal };
            }

            await prisma.subjectGradeDetail.update({
                where: { id: review.subjectGradeDetailId },
                data: updatePayload
            });
        }

        res.json({
            success: true,
            message: 'Đã xử lý kết quả phúc khảo điểm',
            data: updated
        });
    } catch (error) {
        console.error('Lỗi resolve grade review:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi xử lý đơn phúc khảo' });
    }
});

export default router;
