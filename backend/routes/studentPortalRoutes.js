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
// ==========================================
// 👨‍🏫 GVCN / ADMIN PHÊ DUYỆT ĐƠN NGHỈ PHÉP (TIERED WORKFLOW) & PHÚC KHẢO
// ==========================================
// Duyệt đơn xin nghỉ phép (Phân tầng: < 3 ngày GVCN duyệt; >= 3 ngày BGH duyệt cuối; tự động đồng bộ Attendance)
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

        const startDate = new Date(absence.fromDate);
        const endDate = new Date(absence.toDate);
        const durationDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        const isAdmin = ['admin', 'principal', 'vice_principal'].includes(req.user?.role);

        // Quy tắc phân tầng: Đơn >= 3 ngày nếu do GV duyệt thì chỉ chuyển sang PENDING_ADMIN
        if (durationDays >= 3 && !isAdmin) {
            const forwarded = await prisma.absenceRequest.update({
                where: { id },
                data: {
                    status: 'PENDING_ADMIN',
                    reviewedById: req.user.id,
                    reviewNote: reviewNote || 'GVCN đã xác nhận đơn hợp lệ. Đã chuyển tiếp lên Ban Giám Hiệu phê duyệt cấp phép nghỉ dài ngày.',
                    reviewedAt: new Date()
                }
            });

            // Gửi thông báo cho học sinh về việc chuyển tiếp
            await prisma.notification.create({
                data: {
                    title: 'Đơn xin nghỉ phép dài ngày đang chờ BGH duyệt',
                    content: `Đơn xin nghỉ ${durationDays} ngày (từ ${startDate.toLocaleDateString('vi-VN')} đến ${endDate.toLocaleDateString('vi-VN')}) đã được GVCN tiếp nhận và chuyển tiếp lên Ban Giám Hiệu phê duyệt.`,
                    type: 'Thông báo cá nhân',
                    createdById: req.user.id
                }
            });

            return res.json({
                success: true,
                message: `Đơn xin nghỉ ${durationDays} ngày vượt quá thẩm quyền của GVCN (< 3 ngày). Đã xác nhận và chuyển tiếp lên Ban Giám Hiệu phê duyệt cấp cuối.`,
                data: forwarded
            });
        }

        // Trường hợp hợp lệ để cấp phép (Đơn < 3 ngày hoặc Admin/BGH duyệt)
        const updated = await prisma.absenceRequest.update({
            where: { id },
            data: {
                status: 'APPROVED',
                reviewedById: req.user.id,
                reviewNote: reviewNote || (isAdmin && durationDays >= 3 ? 'Ban Giám Hiệu phê duyệt cấp phép nghỉ dài ngày' : 'Đã đồng ý cho nghỉ phép theo đơn'),
                reviewedAt: new Date()
            }
        });

        // 🔄 Tự động đồng bộ tạo / cập nhật bản ghi Attendance thành 'excused' (Có phép)
        try {
            const classId = absence.student.classId;

            if (classId) {
                const sessionsToMark = absence.session === 'all_day' ? ['morning', 'afternoon'] : [absence.session || 'morning'];

                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    const curDate = new Date(d);
                    curDate.setHours(0, 0, 0, 0);

                    for (const sess of sessionsToMark) {
                        await prisma.attendance.upsert({
                            where: {
                                studentId_classId_date_session: {
                                    studentId: absence.studentId,
                                    classId: classId,
                                    date: curDate,
                                    session: sess
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
                                session: sess,
                                status: 'excused',
                                note: `Nghỉ phép theo đơn: ${absence.reason}`,
                                markedById: req.user.id
                            }
                        });
                    }
                }

                // Kiểm tra ngưỡng chuyên cần tới hạn (Early Warning Check)
                const totalAbsences = await prisma.attendance.count({
                    where: {
                        studentId: absence.studentId,
                        status: { in: ['excused', 'unexcused'] }
                    }
                });

                if (totalAbsences >= 35) {
                    const isCritical = totalAbsences >= 45;
                    const alertTitle = `Cảnh báo chuyên cần: ${absence.student.fullName} (${totalAbsences} buổi vắng)`;
                    const alertMsg = `Học sinh ${absence.student.fullName} đã vắng tổng cộng ${totalAbsences} buổi trong năm học. ${isCritical ? 'ĐÃ ĐẠT NGƯỠNG 45 BUỔI - NGUY CƠ LƯU BAN BẮT BUỘC THEO BỘ GD&ĐT!' : 'Sắp chạm ngưỡng 45 buổi vắng, đề nghị BGH và GVCN can thiệp ngay.'}`;

                    await prisma.academicAlert.create({
                        data: {
                            studentId: absence.studentId,
                            classId: classId,
                            alertType: 'ATTENDANCE_RISK',
                            severity: isCritical ? 'CRITICAL' : 'HIGH',
                            title: alertTitle,
                            message: alertMsg,
                            status: 'NEW'
                        }
                    });
                }
            }

            // Gửi notification cho học sinh
            await prisma.notification.create({
                data: {
                    title: 'Đơn xin nghỉ phép đã được phê duyệt',
                    content: `Đơn xin nghỉ học từ ${startDate.toLocaleDateString('vi-VN')} đến ${endDate.toLocaleDateString('vi-VN')} đã được phê duyệt. Trạng thái chuyên cần đã được cập nhật thành Có phép.`,
                    type: 'Thông báo cá nhân',
                    createdById: req.user.id
                }
            });
        } catch (syncErr) {
            console.warn('Lỗi đồng bộ Attendance tự động:', syncErr.message);
        }

        return res.json({
            success: true,
            message: 'Đã phê duyệt đơn xin nghỉ và đồng bộ chuyên cần thành công',
            data: updated
        });
    } catch (error) {
        console.error('Lỗi duyệt đơn nghỉ phép:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi duyệt đơn nghỉ phép: ' + error.message });
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
