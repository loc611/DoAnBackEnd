import prisma from '../prismaClient.js';
import AuditLogService from '../services/auditLogService.js';
import { 
    calculateSubjectSemesterAverage, 
    calculateSubjectYearlyAverage, 
    evaluateSemesterSummary,
    roundScore 
} from '../utils/gradeCalculator.js';

/**
 * =========================================================================
 * 🌟 1. NGHIỆP VỤ GIÁO VIÊN BỘ MÔN (THÔNG TƯ 22/2021/TT-BGDĐT)
 * =========================================================================
 */

/**
 * Lấy bảng điểm chi tiết môn học của một lớp theo học kỳ
 * @route GET /api/grades/subject/:classId?subjectId=...&semester=...
 */
export const getSubjectGradesByClass = async (req, res) => {
    try {
        const { classId } = req.params;
        let { subjectId, semester = 'HK1_2026' } = req.query;

        if (!classId) {
            return res.status(400).json({ success: false, message: 'Thiếu mã lớp học (classId)' });
        }

        // Tìm môn học theo ID hoặc subjectCode
        let subject = null;
        if (subjectId) {
            subject = await prisma.subject.findFirst({
                where: {
                    OR: [
                        { id: subjectId },
                        { subjectCode: { equals: subjectId, mode: 'insensitive' } }
                    ]
                }
            });
        }

        // Nếu không truyền môn học, lấy môn đầu tiên được phân công cho lớp này
        if (!subject) {
            const firstAssignment = await prisma.teacherAssignment.findFirst({
                where: { classId },
                include: { subject: true }
            });
            if (firstAssignment) subject = firstAssignment.subject;
            else subject = await prisma.subject.findFirst();
        }

        if (!subject) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin môn học' });
        }

        const resolvedSubjectId = subject.id;

        // Lấy danh sách học sinh của lớp kèm điểm môn học tương ứng
        const students = await prisma.student.findMany({
            where: { classId },
            include: {
                subjectGrades: {
                    where: {
                        subjectId: resolvedSubjectId,
                        semester
                    }
                }
            },
            orderBy: { studentCode: 'asc' }
        });

        // Xác định trạng thái sổ điểm của môn học này
        let gradebookStatus = 'draft';
        if (students.length > 0) {
            const hasGrades = students.some(s => s.subjectGrades.length > 0);
            if (hasGrades) {
                const allLocked = students.every(s => s.subjectGrades.length > 0 && s.subjectGrades[0].status === 'locked');
                const allSubmitted = students.every(s => s.subjectGrades.length > 0 && (s.subjectGrades[0].status === 'submitted' || s.subjectGrades[0].status === 'locked'));
                if (allLocked) gradebookStatus = 'locked';
                else if (allSubmitted) gradebookStatus = 'submitted';
            }
        }

        // Chuẩn hóa dữ liệu trả về theo chuẩn Thông tư 22
        const formattedStudents = students.map(student => {
            const sg = student.subjectGrades.length > 0 ? student.subjectGrades[0] : null;
            return {
                id: student.studentCode,
                studentId: student.id,
                studentCode: student.studentCode,
                fullName: student.fullName,
                assessmentType: subject.type === 'Tự chọn' && (subject.name.includes('Thể chất') || subject.name.includes('Trải nghiệm')) ? 'feedback' : (sg?.assessmentType || 'score'),
                tx1: sg?.tx1 ?? null,
                tx2: sg?.tx2 ?? null,
                tx3: sg?.tx3 ?? null,
                tx4: sg?.tx4 ?? null,
                gk: sg?.gk ?? null,
                ck: sg?.ck ?? null,
                avgScore: sg?.avgScore ?? null,
                feedbackResult: sg?.feedbackResult ?? null,
                teacherRemark: sg?.teacherRemark ?? '',
                status: sg?.status || 'draft'
            };
        });

        return res.json({
            success: true,
            classId,
            subject: {
                id: subject.id,
                subjectCode: subject.subjectCode,
                name: subject.name,
                type: subject.type
            },
            semester,
            gradebookStatus,
            students: formattedStudents
        });
    } catch (error) {
        console.error('getSubjectGradesByClass error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy bảng điểm môn học' });
    }
};

/**
 * Cập nhật bảng điểm môn học của một lớp (Lưu nháp / Nộp / Khóa)
 * @route PUT /api/grades/subject/:classId
 */
export const updateSubjectGradesByClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const { subjectId, semester = 'HK1_2026', grades, status = 'draft', reason } = req.body;

        if (!classId || !subjectId) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp classId và subjectId' });
        }

        if (!grades || !Array.isArray(grades) || grades.length === 0) {
            return res.status(400).json({ success: false, message: 'Dữ liệu bảng điểm không được để trống' });
        }

        // Tìm môn học
        const subject = await prisma.subject.findFirst({
            where: {
                OR: [
                    { id: subjectId },
                    { subjectCode: { equals: subjectId, mode: 'insensitive' } }
                ]
            }
        });

        if (!subject) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy môn học' });
        }

        const resolvedSubjectId = subject.id;
        const resolvedStatus = ['locked', 'submitted', 'draft'].includes(status) ? status : 'draft';

        // Lấy thông tin giáo viên nhập điểm nếu có
        const teacherProfile = req.user?.teacher;

        // Xử lý Transaction cập nhật điểm hàng loạt với tính toán TT22
        await prisma.$transaction(async (tx) => {
            for (const item of grades) {
                if (!item.studentId) continue;

                // 1. Tính toán ĐTBmhk theo Thông tư 22
                const regularList = [item.tx1, item.tx2, item.tx3, item.tx4].filter(s => s !== null && s !== undefined && s !== '');
                const calcResult = calculateSubjectSemesterAverage({
                    regularScores: regularList,
                    midtermScore: item.gk !== '' ? item.gk : null,
                    finalScore: item.ck !== '' ? item.ck : null,
                    assessmentType: item.assessmentType || 'score',
                    feedbackResult: item.feedbackResult
                });

                const upsertData = {
                    assessmentType: item.assessmentType || 'score',
                    tx1: item.tx1 !== '' && item.tx1 !== undefined ? Number(item.tx1) : null,
                    tx2: item.tx2 !== '' && item.tx2 !== undefined ? Number(item.tx2) : null,
                    tx3: item.tx3 !== '' && item.tx3 !== undefined ? Number(item.tx3) : null,
                    tx4: item.tx4 !== '' && item.tx4 !== undefined ? Number(item.tx4) : null,
                    gk: item.gk !== '' && item.gk !== undefined ? Number(item.gk) : null,
                    ck: item.ck !== '' && item.ck !== undefined ? Number(item.ck) : null,
                    avgScore: calcResult.avgScore,
                    feedbackResult: calcResult.feedbackResult,
                    teacherRemark: item.teacherRemark ? String(item.teacherRemark).trim() : null,
                    status: resolvedStatus,
                    teacherId: teacherProfile ? teacherProfile.id : null,
                    ...(resolvedStatus === 'locked' ? { lockedAt: new Date(), lockedById: req.user.id } : {})
                };

                await tx.subjectGrade.upsert({
                    where: {
                        studentId_subjectId_classId_semester: {
                            studentId: item.studentId,
                            subjectId: resolvedSubjectId,
                            classId,
                            semester
                        }
                    },
                    update: upsertData,
                    create: {
                        studentId: item.studentId,
                        subjectId: resolvedSubjectId,
                        classId,
                        semester,
                        ...upsertData
                    }
                });
            }
        });

        // Ghi vết Audit Log
        await AuditLogService.log({
            userId: req.user.id,
            action: resolvedStatus === 'locked' ? 'grade:lock_publish' : 'grade:write',
            module: 'grade',
            resource: subject.name,
            resourceId: `${classId}_${resolvedSubjectId}`,
            reason: reason || `Cập nhật bảng điểm môn ${subject.name} (Trạng thái: ${resolvedStatus})`,
            req,
            severity: resolvedStatus === 'locked' ? 'critical' : 'info'
        });

        return res.json({
            success: true,
            message: resolvedStatus === 'locked' 
                ? 'Đã niêm phong và công bố bảng điểm thành công' 
                : (resolvedStatus === 'submitted' ? 'Đã nộp bảng điểm cho Trưởng bộ môn' : 'Đã lưu nháp bảng điểm thành công'),
            status: resolvedStatus
        });
    } catch (error) {
        console.error('updateSubjectGradesByClass error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi lưu bảng điểm môn học: ' + error.message });
    }
};

/**
 * Mở khóa sổ điểm môn học (Ban Giám Hiệu / Trưởng Bộ Môn)
 * @route PUT /api/grades/subject/:classId/unlock
 */
export const unlockSubjectGrades = async (req, res) => {
    try {
        const { classId } = req.params;
        const { subjectId, semester = 'HK1_2026', reason } = req.body;

        if (!reason || String(reason).trim().length < 5) {
            return res.status(400).json({ 
                success: false, 
                message: 'Bắt buộc nhập lý do mở khóa sổ điểm (tối thiểu 5 ký tự) để phục vụ kiểm toán' 
            });
        }

        let subjectWhere = {};
        if (subjectId) {
            subjectWhere = {
                OR: [{ id: subjectId }, { subjectCode: subjectId }]
            };
        }

        const subject = await prisma.subject.findFirst({ where: subjectWhere });
        if (!subject) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy môn học' });
        }

        await prisma.subjectGrade.updateMany({
            where: {
                classId,
                subjectId: subject.id,
                semester
            },
            data: {
                status: 'draft',
                lockedAt: null,
                lockedById: null
            }
        });

        await AuditLogService.log({
            userId: req.user.id,
            action: 'grade:unlock',
            module: 'grade',
            resource: subject.name,
            resourceId: `${classId}_${subject.id}`,
            reason: String(reason).trim(),
            req,
            severity: 'critical'
        });

        return res.json({ success: true, message: 'Đã mở khóa sổ điểm thành công cho giáo viên chỉnh sửa' });
    } catch (error) {
        console.error('unlockSubjectGrades error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi mở khóa sổ điểm' });
    }
};

/**
 * =========================================================================
 * 🌟 2. NGHIỆP VỤ GIÁO VIÊN CHỦ NHIỆM (SỔ TỔNG HỢP & ĐÁNH GIÁ THÔNG TƯ 22)
 * =========================================================================
 */

/**
 * Lấy sổ điểm tổng hợp tất cả các môn của lớp học (Dành cho GVCN và BGH)
 * @route GET /api/grades/homeroom/:classId?semester=...
 */
export const getHomeroomSummary = async (req, res) => {
    try {
        const { classId } = req.params;
        const semester = req.query.semester || 'HK1_2026';

        // Lấy thông tin lớp và giáo viên chủ nhiệm
        const classInfo = await prisma.class.findUnique({
            where: { id: classId },
            include: {
                homeroomTeacher: true
            }
        });

        if (!classInfo) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
        }

        // Lấy tất cả môn học của trường
        const allSubjects = await prisma.subject.findMany({
            orderBy: { subjectCode: 'asc' }
        });

        // Lấy danh sách học sinh kèm toàn bộ điểm môn và điểm tổng hợp học kỳ
        const students = await prisma.student.findMany({
            where: { classId },
            include: {
                subjectGrades: {
                    where: { semester },
                    include: { subject: true }
                },
                grades: {
                    where: { semester }
                }
            },
            orderBy: { studentCode: 'asc' }
        });

        const summaryList = students.map(student => {
            // Map điểm từng môn
            const subjectMap = {};
            student.subjectGrades.forEach(sg => {
                const subCode = sg.subject?.subjectCode || sg.subjectId;
                subjectMap[subCode] = {
                    subjectName: sg.subject?.name,
                    avgScore: sg.avgScore,
                    feedbackResult: sg.feedbackResult,
                    assessmentType: sg.assessmentType,
                    status: sg.status
                };
            });

            // Lấy kết quả rèn luyện do GVCN lưu
            const summaryRecord = student.grades.length > 0 ? student.grades[0] : null;
            const conduct = summaryRecord?.conductScore || 'Tốt';

            // Tính toán tổng kết theo Thông tư 22
            const evaluation = evaluateSemesterSummary(student.subjectGrades, conduct);

            return {
                studentId: student.id,
                studentCode: student.studentCode,
                fullName: student.fullName,
                subjects: subjectMap,
                overallAvgScore: summaryRecord?.overallAvgScore ?? evaluation.overallAvg,
                conductScore: conduct,
                academicRank: summaryRecord?.academicRank ?? evaluation.academicRank,
                titleAwarded: summaryRecord?.titleAwarded ?? evaluation.titleAwarded,
                teacherRemark: summaryRecord?.teacherRemark || '',
                status: summaryRecord?.status || 'draft'
            };
        });

        return res.json({
            success: true,
            classInfo: {
                id: classInfo.id,
                className: classInfo.className,
                homeroomTeacherName: classInfo.homeroomTeacher?.fullName || 'Chưa phân công'
            },
            subjects: allSubjects.map(s => ({ id: s.id, code: s.subjectCode, name: s.name, type: s.type })),
            semester,
            students: summaryList
        });
    } catch (error) {
        console.error('getHomeroomSummary error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi lấy sổ điểm tổng hợp lớp' });
    }
};

/**
 * GVCN cập nhật kết quả rèn luyện (hạnh kiểm) & chốt sổ học kỳ theo Thông tư 22
 * @route PUT /api/grades/homeroom/:classId
 */
export const updateHomeroomEvaluation = async (req, res) => {
    try {
        const { classId } = req.params;
        const { semester = 'HK1_2026', evaluations, status = 'draft' } = req.body;

        if (!evaluations || !Array.isArray(evaluations)) {
            return res.status(400).json({ success: false, message: 'Dữ liệu đánh giá không hợp lệ' });
        }

        await prisma.$transaction(async (tx) => {
            for (const item of evaluations) {
                if (!item.studentId) continue;

                // Lấy các môn đã có điểm của học sinh
                const subjectGrades = await tx.subjectGrade.findMany({
                    where: { studentId: item.studentId, semester }
                });

                const conduct = item.conductScore || 'Tốt';
                const evaluated = evaluateSemesterSummary(subjectGrades, conduct);

                await tx.grade.upsert({
                    where: {
                        studentId_classId_semester: {
                            studentId: item.studentId,
                            classId,
                            semester
                        }
                    },
                    update: {
                        conductScore: conduct,
                        overallAvgScore: evaluated.overallAvg,
                        academicRank: evaluated.academicRank,
                        titleAwarded: evaluated.titleAwarded,
                        teacherRemark: item.teacherRemark ? String(item.teacherRemark).trim() : null,
                        status
                    },
                    create: {
                        studentId: item.studentId,
                        classId,
                        semester,
                        conductScore: conduct,
                        overallAvgScore: evaluated.overallAvg,
                        academicRank: evaluated.academicRank,
                        titleAwarded: evaluated.titleAwarded,
                        teacherRemark: item.teacherRemark ? String(item.teacherRemark).trim() : null,
                        status
                    }
                });
            }
        });

        await AuditLogService.log({
            userId: req.user.id,
            action: 'conduct:write',
            module: 'conduct',
            resource: 'homeroom_summary',
            resourceId: classId,
            reason: `GVCN cập nhật đánh giá rèn luyện và xếp loại học kỳ ${semester}`,
            req,
            severity: 'info'
        });

        return res.json({ success: true, message: 'Đã lưu đánh giá rèn luyện và xếp loại học lực thành công' });
    } catch (error) {
        console.error('updateHomeroomEvaluation error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi lưu đánh giá GVCN: ' + error.message });
    }
};

/**
 * =========================================================================
 * 🌟 3. TRA CỨU ĐIỂM HỌC SINH & PHỤ HUYNH (PHIẾU ĐIỂM CÁ NHÂN AN TOÀN)
 * =========================================================================
 */

/**
 * Học sinh tra cứu điểm cá nhân / Phụ huynh tra cứu điểm con em
 * @route GET /api/grades/my-grades
 */
export const getMyGrades = async (req, res) => {
    try {
        const semester = req.query.semester || 'HK1_2026';
        let studentId = null;

        // Trường hợp Học sinh
        if (req.user.role === 'student') {
            const student = await prisma.student.findFirst({
                where: { userId: req.user.id }
            });
            if (!student) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ học sinh' });
            }
            studentId = student.id;
        }
        // Trường hợp Phụ huynh (Kiểm tra quan hệ giám hộ để chống IDOR)
        else if (req.user.role === 'parent') {
            const requestedStudentId = req.query.studentId;
            const parent = await prisma.parent.findFirst({
                where: { userId: req.user.id },
                include: { guardianLinks: true }
            });

            if (!parent) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ phụ huynh' });
            }

            const validLink = parent.guardianLinks.find(link => 
                link.studentId === requestedStudentId && 
                link.accessGrades === true && 
                link.custodyType !== 'none'
            );

            if (!validLink) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Bạn không có quyền xem kết quả học tập của học sinh này' 
                });
            }
            studentId = requestedStudentId;
        } else {
            // Cho phép Admin/Teacher tra cứu theo studentId
            studentId = req.query.studentId;
        }

        if (!studentId) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp studentId' });
        }

        // Lấy thông tin học sinh
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: {
                class: {
                    include: {
                        homeroomTeacher: true
                    }
                }
            }
        });

        if (!student) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy học sinh' });
        }

        // Lấy chi tiết điểm các môn theo Thông tư 22
        const subjectGrades = await prisma.subjectGrade.findMany({
            where: {
                studentId,
                semester
            },
            include: {
                subject: true,
                teacher: true
            },
            orderBy: { subject: { subjectCode: 'asc' } }
        });

        // Lấy bản ghi tổng hợp học kỳ do GVCN đánh giá
        const gradeSummary = await prisma.grade.findFirst({
            where: {
                studentId,
                semester
            }
        });

        // Chỉ hiển thị điểm khi BGH hoặc GV đã khóa/công bố (nếu là học sinh/phụ huynh)
        const isStudentOrParent = req.user.role === 'student' || req.user.role === 'parent';

        const sanitizedGrades = subjectGrades.map(sg => {
            const isLocked = sg.status === 'locked';
            return {
                subjectId: sg.subjectId,
                subjectCode: sg.subject?.subjectCode,
                subjectName: sg.subject?.name,
                teacherName: sg.teacher?.fullName || 'Chưa phân công',
                assessmentType: sg.assessmentType,
                // Nếu học sinh xem điểm nháp, thông báo rõ ràng
                tx1: isStudentOrParent && !isLocked ? null : sg.tx1,
                tx2: isStudentOrParent && !isLocked ? null : sg.tx2,
                tx3: isStudentOrParent && !isLocked ? null : sg.tx3,
                tx4: isStudentOrParent && !isLocked ? null : sg.tx4,
                gk: isStudentOrParent && !isLocked ? null : sg.gk,
                ck: isStudentOrParent && !isLocked ? null : sg.ck,
                avgScore: isStudentOrParent && !isLocked ? null : sg.avgScore,
                feedbackResult: isStudentOrParent && !isLocked ? null : sg.feedbackResult,
                teacherRemark: sg.teacherRemark || '',
                status: sg.status
            };
        });

        return res.json({
            success: true,
            student: {
                studentId: student.id,
                studentCode: student.studentCode,
                fullName: student.fullName,
                className: student.class?.className || 'Chưa xếp lớp',
                homeroomTeacher: student.class?.homeroomTeacher?.fullName || 'Chưa phân công'
            },
            semester,
            isPublished: gradeSummary?.status === 'locked',
            summary: {
                overallAvgScore: gradeSummary?.overallAvgScore ?? null,
                conductScore: gradeSummary?.conductScore || 'Chưa đánh giá',
                academicRank: gradeSummary?.academicRank || 'Chưa xếp loại',
                titleAwarded: gradeSummary?.titleAwarded || null,
                teacherRemark: gradeSummary?.teacherRemark || ''
            },
            subjectGrades: sanitizedGrades
        });
    } catch (error) {
        console.error('getMyGrades error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tra cứu điểm' });
    }
};

/**
 * =========================================================================
 * 🌟 4. TƯƠNG THÍCH NGƯỢC (BACKWARD COMPATIBILITY CHO CONTROLLERS CŨ)
 * =========================================================================
 */
export const getGradesByClass = async (req, res) => {
    // Chuyển tiếp tự động đến handler mới hoặc phục vụ màn hình cũ
    return getSubjectGradesByClass(req, res);
};

export const updateClassGrades = async (req, res) => {
    return updateSubjectGradesByClass(req, res);
};

export const unlockClassGrades = async (req, res) => {
    return unlockSubjectGrades(req, res);
};
