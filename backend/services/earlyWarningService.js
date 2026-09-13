import prisma from '../prismaClient.js';

/**
 * Early Warning Service - Hệ thống phát hiện sớm rủi ro học đường
 * Quét tự động & cảnh báo: Chuyên cần, Học lực sa sút, Giấy tờ ưu tiên hết hạn
 */
class EarlyWarningService {
  /**
   * Quét toàn diện các cảnh báo học đường
   */
  static async runFullScan() {
    const results = {
      attendanceAlerts: 0,
      academicAlerts: 0,
      documentAlerts: 0
    };

    try {
      results.attendanceAlerts = await this.scanAttendanceRisks();
      results.academicAlerts = await this.scanAcademicRisks();
      results.documentAlerts = await this.scanExpiringDocuments();
    } catch (error) {
      console.error('Error running early warning scan:', error);
    }

    return results;
  }

  /**
   * 1. Quét rủi ro chuyên cần (Học sinh nghỉ học không phép nhiều)
   */
  static async scanAttendanceRisks() {
    let createdCount = 0;
    try {
      // Lấy danh sách học sinh có từ 3 buổi vắng không phép trở lên
      const unexcusedRecords = await prisma.attendance.groupBy({
        by: ['studentId', 'classId'],
        where: {
          status: 'unexcused'
        },
        _count: {
          id: true
        },
        having: {
          id: {
            _count: {
              gte: 3
            }
          }
        }
      });

      for (const rec of unexcusedRecords) {
        const student = await prisma.student.findUnique({
          where: { id: rec.studentId },
          select: { fullName: true, studentCode: true }
        });

        if (!student) continue;

        const count = rec._count.id;
        const severity = count >= 5 ? 'CRITICAL' : 'HIGH';
        const title = `Cảnh báo vắng học không phép: ${student.fullName} (${count} buổi)`;
        const message = `Học sinh ${student.fullName} (Mã: ${student.studentCode}) đã vắng học không phép ${count} buổi trong kỳ. Nguy cơ vi phạm quy chế chuyên cần hoặc có nguy cơ bỏ học. Cần GVCN liên hệ phụ huynh khẩn cấp.`;

        // Kiểm tra xem đã có cảnh báo đang mở chưa
        const existing = await prisma.academicAlert.findFirst({
          where: {
            studentId: rec.studentId,
            alertType: 'ATTENDANCE_RISK',
            status: { in: ['NEW', 'ACKNOWLEDGED'] }
          }
        });

        if (!existing) {
          await prisma.academicAlert.create({
            data: {
              studentId: rec.studentId,
              classId: rec.classId,
              alertType: 'ATTENDANCE_RISK',
              severity,
              title,
              message,
              status: 'NEW'
            }
          });
          createdCount++;
        } else {
          // Cập nhật lại số lượng buổi nếu tăng lên
          await prisma.academicAlert.update({
            where: { id: existing.id },
            data: {
              severity,
              title,
              message,
              updatedAt: new Date()
            }
          });
        }
      }
    } catch (err) {
      console.error('Error in scanAttendanceRisks:', err);
    }
    return createdCount;
  }

  /**
   * 2. Quét rủi ro học tập (Điểm giữa kỳ hoặc trung bình môn dưới 3.5)
   */
  static async scanAcademicRisks() {
    let createdCount = 0;
    try {
      const atRiskGrades = await prisma.subjectGrade.findMany({
        where: {
          OR: [
            { gk: { lt: 3.5, not: null } },
            { avgScore: { lt: 3.5, not: null } }
          ]
        },
        include: {
          student: { select: { fullName: true, studentCode: true } },
          subject: { select: { name: true } },
          class: { select: { className: true } }
        }
      });

      for (const item of atRiskGrades) {
        const score = item.gk ?? item.avgScore;
        const title = `Cảnh báo học tập môn ${item.subject?.name || 'Bộ môn'}: ${item.student?.fullName}`;
        const message = `Học sinh ${item.student?.fullName} thuộc lớp ${item.class?.className || 'Lớp'} có điểm ĐĐGgk/ĐTB môn ${item.subject?.name} là ${score} (dưới ngưỡng an toàn 3.5). Đề xuất GVBM và GVCN lập kế hoạch phụ đạo bổ sung.`;

        const existing = await prisma.academicAlert.findFirst({
          where: {
            studentId: item.studentId,
            alertType: 'ACADEMIC_RISK',
            title,
            status: { in: ['NEW', 'ACKNOWLEDGED'] }
          }
        });

        if (!existing) {
          await prisma.academicAlert.create({
            data: {
              studentId: item.studentId,
              classId: item.classId,
              alertType: 'ACADEMIC_RISK',
              severity: 'HIGH',
              title,
              message,
              status: 'NEW'
            }
          });
          createdCount++;
        }
      }
    } catch (err) {
      console.error('Error in scanAcademicRisks:', err);
    }
    return createdCount;
  }

  /**
   * 3. Quét giấy tờ ưu tiên sắp hết hạn (trong vòng 30 ngày)
   */
  static async scanExpiringDocuments() {
    let createdCount = 0;
    try {
      const now = new Date();
      const in30Days = new Date();
      in30Days.setDate(in30Days.getDate() + 30);

      const expiringPolicies = await prisma.studentPolicy.findMany({
        where: {
          status: 'ACTIVE',
          documentExpiryDate: {
            gte: now,
            lte: in30Days
          }
        },
        include: {
          student: { select: { fullName: true, studentCode: true, classId: true } }
        }
      });

      for (const policy of expiringPolicies) {
        const expDateStr = policy.documentExpiryDate ? new Date(policy.documentExpiryDate).toLocaleDateString('vi-VN') : '';
        const title = `Hồ sơ ${policy.policyName} sắp hết hạn: ${policy.student?.fullName}`;
        const message = `Giấy tờ xác nhận ${policy.policyName} (Số: ${policy.documentNumber || 'N/A'}) của học sinh ${policy.student?.fullName} sẽ hết hạn vào ngày ${expDateStr}. Cần thông báo gia đình nộp hồ sơ gia hạn để đảm bảo quyền lợi miễn giảm học phí.`;

        const existing = await prisma.academicAlert.findFirst({
          where: {
            studentId: policy.studentId,
            alertType: 'DOCUMENT_EXPIRING',
            status: { in: ['NEW', 'ACKNOWLEDGED'] }
          }
        });

        if (!existing) {
          await prisma.academicAlert.create({
            data: {
              studentId: policy.studentId,
              classId: policy.student?.classId,
              alertType: 'DOCUMENT_EXPIRING',
              severity: 'MEDIUM',
              title,
              message,
              status: 'NEW'
            }
          });
          createdCount++;
        }
      }
    } catch (err) {
      console.error('Error in scanExpiringDocuments:', err);
    }
    return createdCount;
  }

  /**
   * Lấy danh sách cảnh báo có phân quyền (Scoped Access)
   */
  static async getAlerts({ userRole, userId, classId, alertType, severity, status, page = 1, limit = 20 }) {
    const where = {};

    if (alertType) where.alertType = alertType;
    if (severity) where.severity = severity;
    if (status) where.status = status;

    // Phân quyền dữ liệu
    if (userRole === 'student') {
      const student = await prisma.student.findUnique({ where: { userId } });
      if (!student) return { alerts: [], total: 0 };
      where.studentId = student.id;
    } else if (userRole === 'teacher') {
      // GVCN chỉ xem cảnh báo của lớp chủ nhiệm
      const teacher = await prisma.teacher.findUnique({
        where: { userId },
        include: {
          homeroomClasses: true,
          homeroomAssignments: true
        }
      });

      if (!teacher) return { alerts: [], total: 0 };
      const homeroomClassIds = [
        ...(teacher.homeroomClasses || []).map(c => c.id),
        ...(teacher.homeroomAssignments || []).map(a => a.classId)
      ];

      where.classId = { in: homeroomClassIds };
    } else if (classId) {
      where.classId = classId;
    }

    const skip = (Math.max(1, page) - 1) * limit;

    const [alerts, total] = await Promise.all([
      prisma.academicAlert.findMany({
        where,
        include: {
          student: {
            select: {
              fullName: true,
              studentCode: true,
              class: { select: { className: true } }
            }
          }
        },
        orderBy: [
          { severity: 'asc' }, // Sẽ sort JS sau nếu cần
          { createdAt: 'desc' }
        ],
        skip,
        take: Number(limit)
      }),
      prisma.academicAlert.count({ where })
    ]);

    return { alerts, total, page: Number(page), totalPages: Math.ceil(total / limit) };
  }

  /**
   * Đánh dấu đã xử lý cảnh báo
   */
  static async resolveAlert(alertId, resolvedById, resolutionNote) {
    return await prisma.academicAlert.update({
      where: { id: alertId },
      data: {
        status: 'RESOLVED',
        resolvedById,
        resolvedAt: new Date(),
        message: resolutionNote ? `${resolutionNote}` : undefined
      }
    });
  }
}

export default EarlyWarningService;
