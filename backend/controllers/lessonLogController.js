import prisma from '../prismaClient.js';

/**
 * Lấy danh sách sổ đầu bài của một lớp theo tuần / ngày
 */
export const getLessonLogsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { fromDate, toDate } = req.query;

    const where = { classId };
    if (fromDate && toDate) {
      where.date = {
        gte: new Date(fromDate),
        lte: new Date(toDate)
      };
    }

    const logs = await prisma.lessonLog.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true, subjectCode: true } },
        teacher: { select: { id: true, fullName: true, teacherCode: true } },
        class: { select: { id: true, className: true } }
      },
      orderBy: [
        { date: 'asc' },
        { periodNumber: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching lesson logs:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy sổ đầu bài lớp' });
  }
};

/**
 * Ghi hoặc cập nhật sổ đầu bài (Giáo viên bộ môn ký bài học & điểm danh tiết)
 */
export const saveLessonLog = async (req, res) => {
  try {
    const {
      classId,
      date,
      periodNumber,
      session = 'morning',
      subjectId,
      lessonTitle,
      periodInPlan,
      totalStudents,
      presentCount,
      absentStudentIds = [],
      disciplineRating = 'Tốt',
      teacherRemark,
      isSigned = true
    } = req.body;

    if (!classId || !date || !periodNumber || !subjectId || !lessonTitle) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin: Lớp, ngày, tiết học, môn học và tên bài dạy'
      });
    }

    // Xác định teacherId
    let teacherId = req.body.teacherId;
    if (!teacherId && req.user?.role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (teacher) teacherId = teacher.id;
    }

    if (!teacherId) {
      return res.status(400).json({ success: false, message: 'Không xác định được giáo viên ký bài' });
    }

    const parsedDate = new Date(date);
    parsedDate.setHours(0, 0, 0, 0);

    // Upsert LessonLog
    const savedLog = await prisma.lessonLog.upsert({
      where: {
        classId_date_periodNumber_session: {
          classId,
          date: parsedDate,
          periodNumber: Number(periodNumber),
          session
        }
      },
      update: {
        subjectId,
        teacherId,
        lessonTitle,
        periodInPlan: periodInPlan ? Number(periodInPlan) : null,
        totalStudents: Number(totalStudents) || 0,
        presentCount: Number(presentCount) || 0,
        absentStudentIds,
        disciplineRating,
        teacherRemark,
        isSigned: Boolean(isSigned),
        signedAt: isSigned ? new Date() : null,
        updatedAt: new Date()
      },
      create: {
        classId,
        date: parsedDate,
        periodNumber: Number(periodNumber),
        session,
        subjectId,
        teacherId,
        lessonTitle,
        periodInPlan: periodInPlan ? Number(periodInPlan) : null,
        totalStudents: Number(totalStudents) || 0,
        presentCount: Number(presentCount) || 0,
        absentStudentIds,
        disciplineRating,
        teacherRemark,
        isSigned: Boolean(isSigned),
        signedAt: isSigned ? new Date() : null
      }
    });

    // ⚡ TỰ ĐỘNG ĐỒNG BỘ CHUYÊN CẦN (Attendance Sync):
    // Nếu có học sinh vắng trong tiết, tự động ghi nhận vào bảng Attendance
    if (Array.isArray(absentStudentIds) && absentStudentIds.length > 0) {
      const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { name: true } });
      for (const studentId of absentStudentIds) {
        try {
          await prisma.attendance.upsert({
            where: {
              studentId_classId_date_session: {
                studentId,
                classId,
                date: parsedDate,
                session
              }
            },
            update: {
              status: 'unexcused',
              note: `Vắng tiết ${periodNumber} môn ${subject?.name || 'Học'}`
            },
            create: {
              studentId,
              classId,
              date: parsedDate,
              session,
              status: 'unexcused',
              note: `Vắng tiết ${periodNumber} môn ${subject?.name || 'Học'}`,
              markedById: req.user?.id
            }
          });
        } catch (attErr) {
          console.warn('Could not sync attendance for student:', studentId, attErr.message);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Ký và lưu sổ đầu bài thành công (Đã tự động đồng bộ chuyên cần)',
      data: savedLog
    });
  } catch (error) {
    console.error('Error saving lesson log:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lưu sổ đầu bài: ' + error.message });
  }
};

/**
 * Thống kê tiến độ phân phối chương trình (PPCT) của môn học
 */
export const getSyllabusProgress = async (req, res) => {
  try {
    const { classId, subjectId } = req.query;
    if (!classId || !subjectId) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp classId và subjectId' });
    }

    const [subject, classInfo, logsCount, latestLog] = await Promise.all([
      prisma.subject.findUnique({ where: { id: subjectId } }),
      prisma.class.findUnique({ where: { id: classId } }),
      prisma.lessonLog.count({
        where: { classId, subjectId, isSigned: true }
      }),
      prisma.lessonLog.findFirst({
        where: { classId, subjectId, isSigned: true },
        orderBy: { periodInPlan: 'desc' }
      })
    ]);

    const totalRequiredPeriods = (subject?.periodsPerWeek || 2) * 18; // Ước tính 18 tuần/kỳ
    const currentPeriodInPlan = latestLog?.periodInPlan || logsCount;
    const progressPercent = Math.min(100, Math.round((currentPeriodInPlan / (totalRequiredPeriods || 1)) * 100));

    res.json({
      success: true,
      data: {
        subjectName: subject?.name,
        className: classInfo?.className,
        periodsPerWeek: subject?.periodsPerWeek,
        totalRequiredPeriods,
        completedPeriods: logsCount,
        currentPeriodInPlan,
        progressPercent,
        isBehindSchedule: progressPercent < 40 // Cảnh báo nếu chậm tiến độ
      }
    });
  } catch (error) {
    console.error('Error getting syllabus progress:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi thống kê tiến độ chương trình' });
  }
};
