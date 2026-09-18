import prisma from '../prismaClient.js';
import crypto from 'crypto';

/**
 * Học sinh / Phụ huynh nộp đơn từ số hóa
 */
export const submitPetition = async (req, res) => {
  try {
    const {
      type,
      title,
      content,
      attachedProofUrls = [],
      startDate,
      endDate,
      reason,
      targetSubjectId,
      targetSemester,
      targetGradeColumn,
      claimedScore
    } = req.body;

    if (!type || !title || !content) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp loại đơn, tiêu đề và nội dung' });
    }

    // Xác định studentId
    let studentId = req.body.studentId;
    if (req.user?.role === 'student') {
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (!student) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ học sinh' });
      studentId = student.id;
    }

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin học sinh nộp đơn' });
    }

    const petition = await prisma.studentPetition.create({
      data: {
        studentId,
        type,
        title,
        content,
        attachedProofUrls: Array.isArray(attachedProofUrls) ? attachedProofUrls : [],
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        reason: reason || content,
        targetSubjectId,
        targetSemester,
        targetGradeColumn,
        claimedScore: claimedScore !== undefined ? Number(claimedScore) : null,
        status: 'SUBMITTED'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Gửi đơn từ số hóa thành công',
      data: petition
    });
  } catch (error) {
    console.error('Error submitting petition:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi nộp đơn từ' });
  }
};

/**
 * Lấy danh sách đơn từ theo phân quyền (Scoped Petitions)
 */
export const getPetitions = async (req, res) => {
  try {
    const { type, status, classId } = req.query;
    const where = {};

    if (type) where.type = type;
    if (status) where.status = status;

    if (req.user?.role === 'student') {
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (!student) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ học sinh' });
      where.studentId = student.id;
    } else if (req.user?.role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: req.user.id },
        include: { homeroomClasses: true, homeroomAssignments: true }
      });
      const homeroomClassIds = [
        ...(teacher?.homeroomClasses || []).map(c => c.id),
        ...(teacher?.homeroomAssignments || []).map(a => a.classId)
      ];
      where.student = { classId: { in: homeroomClassIds } };
    } else if (classId) {
      where.student = { classId };
    }

    const petitions = await prisma.studentPetition.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            studentCode: true,
            class: { select: { className: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: petitions
    });
  } catch (error) {
    console.error('Error fetching petitions:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách đơn từ' });
  }
};

/**
 * Phê duyệt hoặc từ chối đơn từ (State Machine)
 */
export const reviewPetition = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approvalRemark } = req.body; // 'APPROVED' | 'REJECTED'

    if (!['APPROVED', 'REJECTED', 'UNDER_REVIEW'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái phê duyệt không hợp lệ' });
    }

    const petition = await prisma.studentPetition.findUnique({
      where: { id },
      include: { student: true }
    });

    if (!petition) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn từ' });
    }

    let temporaryUnlockToken = null;
    let unlockTokenExpiresAt = null;

    // ⚡ XỬ LÝ ĐẶC THÙ CHO TỪNG LOẠI ĐƠN KHI ĐƯỢC PHÊ DUYỆT (APPROVED)
    if (status === 'APPROVED') {
      // 1. ĐƠN NGHỈ HỌC: Tự động cập nhật chuyên cần thành 'excused' (có phép)
      if (petition.type === 'LEAVE_ABSENCE' && petition.startDate && petition.endDate && petition.student?.classId) {
        try {
          const curr = new Date(petition.startDate);
          const end = new Date(petition.endDate);

          while (curr <= end) {
            const loopDate = new Date(curr);
            loopDate.setHours(0, 0, 0, 0);

            for (const sess of ['morning', 'afternoon']) {
              const periods = sess === 'morning' ? [1, 2, 3, 4, 5] : [6, 7, 8, 9, 10];
              for (const pNum of periods) {
                await prisma.attendance.upsert({
                  where: {
                    studentId_classId_date_periodNumber: {
                      studentId: petition.studentId,
                      classId: petition.student.classId,
                      date: loopDate,
                      periodNumber: pNum
                    }
                  },
                  update: {
                    status: 'excused',
                    session: sess,
                    note: `Nghỉ có phép theo đơn duyệt #${petition.id.slice(0, 8)}`
                  },
                  create: {
                    studentId: petition.studentId,
                    classId: petition.student.classId,
                    date: loopDate,
                    periodNumber: pNum,
                    periodName: `Tiết ${pNum}`,
                    session: sess,
                    status: 'excused',
                    note: `Nghỉ có phép theo đơn duyệt #${petition.id.slice(0, 8)}`,
                    markedById: req.user?.id
                  }
                });
              }
            }
            curr.setDate(curr.getDate() + 1);
          }
        } catch (attErr) {
          console.warn('Error auto-syncing attendance for leave petition:', attErr.message);
        }
      }

      // 2. ĐƠN PHÚC KHẢO ĐIỂM: Cấp Temporary Unlock Token trong 24 giờ cho GVBM sửa điểm
      if (petition.type === 'GRADE_APPEAL') {
        temporaryUnlockToken = crypto.randomBytes(16).toString('hex');
        unlockTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 giờ
      }
    }

    const updated = await prisma.studentPetition.update({
      where: { id },
      data: {
        status,
        approvalRemark,
        approverId: req.user?.id,
        temporaryUnlockToken,
        unlockTokenExpiresAt,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: `Đã ${status === 'APPROVED' ? 'phê duyệt' : status === 'REJECTED' ? 'từ chối' : 'tiếp nhận'} đơn thành công`,
      data: updated
    });
  } catch (error) {
    console.error('Error reviewing petition:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi phê duyệt đơn từ: ' + error.message });
  }
};
