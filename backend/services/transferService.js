import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../prismaClient.js';
import AuditLogService from './auditLogService.js';

/**
 * Service xử lý phân hệ Tiếp nhận học sinh chuyển trường khối 10 & 11
 * Tối ưu hóa cho cơ sở dữ liệu Neon Serverless PostgreSQL.
 */
class TransferService {
  /**
   * Chuẩn hóa tên môn học để so sánh chính xác
   * @param {string} subject 
   * @returns {string}
   */
  static normalizeSubject(subject) {
    if (!subject || typeof subject !== 'string') return '';
    return subject
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Bỏ dấu tiếng Việt để so sánh linh hoạt (toán == toan)
  }

  /**
   * 1. Hàm so sánh chương trình học (Curriculum Gap Analysis)
   * Xác định danh sách môn học mà học sinh chưa học ở trường cũ nhưng lớp mục tiêu yêu cầu.
   * 
   * @param {string[]} studentPreviousSubjects - Danh sách môn học sinh đã học ở trường cũ
   * @param {string[]} targetClassSubjects - Danh sách môn theo tổ hợp của lớp mới
   * @returns {string[]} Danh sách các môn còn thiếu cần thi bổ túc
   */
  static checkCurriculumGap(studentPreviousSubjects = [], targetClassSubjects = []) {
    if (!Array.isArray(targetClassSubjects) || targetClassSubjects.length === 0) {
      return [];
    }

    const normalizedPrevious = new Set(
      (studentPreviousSubjects || []).map(s => this.normalizeSubject(s))
    );

    // Tìm các môn trong lớp mục tiêu mà học sinh chưa có
    const missingSubjects = targetClassSubjects.filter(targetSubject => {
      const normalizedTarget = this.normalizeSubject(targetSubject);
      return !normalizedPrevious.has(normalizedTarget);
    });

    return missingSubjects;
  }

  /**
   * 2. API Tiếp nhận học sinh chuyển trường
   * Thực thi trong 1 Database Transaction đảm bảo tính toàn vẹn dữ liệu ACID.
   * 
   * @param {Object} payload
   * @param {string} payload.studentCode - Mã học sinh (Unique, bất biến)
   * @param {string} payload.fullName - Họ tên học sinh
   * @param {string} payload.email - Email học sinh
   * @param {string} [payload.phone] - Số điện thoại
   * @param {Date|string} [payload.dateOfBirth] - Ngày sinh
   * @param {string} [payload.gender] - Giới tính
   * @param {string} [payload.address] - Địa chỉ
   * @param {string} [payload.parentName] - Tên phụ huynh
   * @param {string} [payload.parentPhone] - SĐT phụ huynh
   * @param {string} payload.previousSchoolName - Tên trường THPT chuyển đi
   * @param {number} payload.previousGradeLevel - Khối lớp cũ (10 hoặc 11)
   * @param {string} [payload.targetClassId] - ID lớp muốn chuyển vào
   * @param {string} [payload.reason] - Lý do chuyển trường
   * @param {string[]} [payload.studentPreviousSubjects] - Các môn đã học ở trường cũ
   * @param {string[]} [payload.targetClassSubjects] - Các môn của lớp mới (nếu truyền từ client)
   * @param {Array<{subjectName: string, semester: string, finalScore: number}>} [payload.transferredGrades] - Điểm học bạ trường cũ
   * @param {Object} [userContext] - Thông tin Admin/Cán bộ thực hiện tiếp nhận
   */
  static async admitTransferStudent(payload, userContext = null) {
    const {
      studentCode,
      fullName,
      email,
      phone,
      dateOfBirth,
      gender = 'Nam',
      address,
      parentName,
      parentPhone,
      previousSchoolName,
      previousGradeLevel,
      targetClassId,
      reason,
      studentPreviousSubjects = [],
      targetClassSubjects: clientTargetSubjects,
      transferredGrades = []
    } = payload;

    if (!studentCode || !fullName || !email || !previousSchoolName || !previousGradeLevel) {
      throw new Error('Vui lòng cung cấp đầy đủ thông tin bắt buộc: studentCode, fullName, email, previousSchoolName, previousGradeLevel');
    }

    if (![10, 11].includes(Number(previousGradeLevel))) {
      throw new Error('Hệ thống chỉ hỗ trợ tiếp nhận học sinh chuyển trường vào Khối 10 và Khối 11');
    }

    // Thực thi toàn bộ quy trình trong Transaction
    return await prisma.$transaction(async (tx) => {
      // A. Kiểm tra trùng lặp mã học sinh & email
      const existingUser = await tx.user.findFirst({
        where: {
          OR: [{ username: studentCode }, { email }]
        }
      });
      if (existingUser) {
        throw new Error(`Tài khoản với mã học sinh "${studentCode}" hoặc email "${email}" đã tồn tại trên hệ thống`);
      }

      const existingStudent = await tx.student.findUnique({
        where: { studentCode }
      });
      if (existingStudent) {
        throw new Error(`Mã học sinh "${studentCode}" đã được sử dụng`);
      }

      // B. Xác định danh sách môn học của lớp mục tiêu
      let targetSubjects = clientTargetSubjects;
      let targetClass = null;

      if (targetClassId) {
        targetClass = await tx.class.findUnique({
          where: { id: targetClassId }
        });
        if (!targetClass) {
          throw new Error(`Lớp học mục tiêu với ID "${targetClassId}" không tồn tại`);
        }

        // Nếu client không truyền targetClassSubjects, tự động lấy danh sách môn học thuộc khối đó
        if (!targetSubjects || targetSubjects.length === 0) {
          const subjectsInGrade = await tx.subject.findMany({
            where: {
              OR: [
                { grade: targetClass.grade },
                { grade: 0 } // Môn chung toàn trường
              ]
            },
            select: { name: true }
          });
          targetSubjects = subjectsInGrade.map(s => s.name);
        }
      }

      // C. So sánh lệch tổ hợp môn học (Gap Analysis)
      const missingSubjects = this.checkCurriculumGap(studentPreviousSubjects, targetSubjects || []);
      const isCurriculumChanged = missingSubjects.length > 0;

      // D. Tạo tài khoản User đăng nhập
      const defaultPassword = `${studentCode}@123`;
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(defaultPassword, salt);

      const createdUser = await tx.user.create({
        data: {
          username: studentCode,
          email,
          password: hashedPassword,
          role: 'student',
          status: 'active'
        }
      });

      // Liên kết vai trò RBAC nếu bảng Role tồn tại
      if (tx.role && tx.userRole) {
        const studentRole = await tx.role.findUnique({ where: { name: 'student' } });
        if (studentRole) {
          await tx.userRole.create({
            data: {
              id: crypto.randomUUID(),
              userId: createdUser.id,
              roleId: studentRole.id
            }
          });
        }
      }

      // E. Quyết định trạng thái học sinh
      // - Nếu có môn lệch: PENDING_MAKEUP_EXAM, chưa gán lớp, chưa có ngày nhập học chính thức
      // - Nếu khớp tổ hợp: ACTIVE, gán trực tiếp vào lớp, enrolledAt = now()
      const studentStatus = isCurriculumChanged ? 'PENDING_MAKEUP_EXAM' : 'ACTIVE';
      const assignedClassId = isCurriculumChanged ? null : (targetClassId || null);
      const enrolledAt = isCurriculumChanged ? null : new Date();

      const createdStudent = await tx.student.create({
        data: {
          userId: createdUser.id,
          studentCode,
          fullName: fullName.trim(),
          email,
          phone: phone || null,
          gender,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          address: address || null,
          parentName: parentName || null,
          parentPhone: parentPhone || null,
          status: studentStatus,
          classId: assignedClassId,
          enrolledAt
        }
      });

      // F. Tạo hồ sơ tiếp nhận chuyển trường (TransferRecord)
      const transferRecord = await tx.transferRecord.create({
        data: {
          studentId: createdStudent.id,
          previousSchoolName: previousSchoolName.trim(),
          previousGradeLevel: Number(previousGradeLevel),
          targetClassId: targetClassId || null,
          reason: reason || null,
          isCurriculumChanged,
          transferDate: new Date()
        }
      });

      // G. Nếu lệch tổ hợp môn -> Khởi tạo danh sách bài thi bổ túc (MakeupExam)
      let createdMakeupExams = [];
      if (isCurriculumChanged) {
        createdMakeupExams = await Promise.all(
          missingSubjects.map(subjectName =>
            tx.makeupExam.create({
              data: {
                studentId: createdStudent.id,
                subjectName,
                isPassed: false,
                notes: `Thi bổ sung kiến thức do đổi tổ hợp môn từ ${previousSchoolName}`
              }
            })
          )
        );
      }

      // H. Lưu điểm học bạ từ trường cũ (TransferredGrade)
      let createdTransferredGrades = [];
      if (Array.isArray(transferredGrades) && transferredGrades.length > 0) {
        for (const item of transferredGrades) {
          if (item.subjectName && item.finalScore !== undefined) {
            const score = Number(item.finalScore);
            if (score < 0 || score > 10) {
              throw new Error(`Điểm môn "${item.subjectName}" không hợp lệ (${score}). Thang điểm từ 0.00 đến 10.00`);
            }

            const gradeRecord = await tx.transferredGrade.create({
              data: {
                studentId: createdStudent.id,
                subjectName: item.subjectName.trim(),
                semester: item.semester === 'FULL_YEAR' ? 'FULL_YEAR' : 'HK1',
                finalScore: score,
                academicYear: targetClass?.academicYear || '2026-2027'
              }
            });
            createdTransferredGrades.push(gradeRecord);
          }
        }
      }

      // I. Ghi nhận Audit Log
      await AuditLogService.log({
        userId: userContext?.id || null,
        action: 'TRANSFER_STUDENT_ADMITTED',
        module: 'transfer',
        resourceType: 'Student',
        resourceId: createdStudent.id,
        newData: {
          studentCode,
          status: studentStatus,
          isCurriculumChanged,
          missingSubjects,
          transferredGradesCount: createdTransferredGrades.length
        },
        reason: `Tiếp nhận học sinh chuyển trường từ ${previousSchoolName} vào Khối ${previousGradeLevel}`
      });

      return {
        student: createdStudent,
        transferRecord,
        status: studentStatus,
        isCurriculumChanged,
        missingSubjects,
        makeupExams: createdMakeupExams,
        transferredGrades: createdTransferredGrades,
        temporaryAccount: {
          username: studentCode,
          defaultPassword
        }
      };
    });
  }

  /**
   * 3. Chấm điểm bài thi bổ túc môn học & Tự động kích hoạt khi đỗ toàn bộ môn
   * Khi tất cả các bài thi bổ túc đạt >= 5.0:
   * - Tự động cập nhật Student.status = 'ACTIVE'
   * - Xếp chính thức vào lớp targetClassId
   * - Cập nhật ngày nhập học chính thức enrolledAt = now()
   * 
   * @param {Object} params
   * @param {string} params.examId - ID bài thi bổ túc
   * @param {number} params.score - Điểm thi (0.00 - 10.00)
   * @param {string} [params.examinerName] - Người chấm thi
   * @param {string} [params.notes] - Ghi chú
   * @param {Object} [userContext] - Người thực hiện thao tác
   */
  static async recordMakeupExamScore({ examId, score, examinerName, notes }, userContext = null) {
    const numScore = Number(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 10) {
      throw new Error('Điểm thi bổ túc không hợp lệ. Điểm phải là số thực từ 0.00 đến 10.00');
    }

    return await prisma.$transaction(async (tx) => {
      const exam = await tx.makeupExam.findUnique({
        where: { id: examId },
        include: {
          student: {
            include: {
              transferRecords: {
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            }
          }
        }
      });

      if (!exam) {
        throw new Error(`Không tìm thấy bài thi bổ túc với ID "${examId}"`);
      }

      const isPassed = numScore >= 5.0;

      // Cập nhật điểm bài thi
      const updatedExam = await tx.makeupExam.update({
        where: { id: examId },
        data: {
          score: numScore,
          isPassed,
          examinerName: examinerName || null,
          examDate: new Date(),
          notes: notes || exam.notes
        }
      });

      const studentId = exam.studentId;
      const allStudentExams = await tx.makeupExam.findMany({
        where: { studentId }
      });

      // Kiểm tra xem tất cả các bài thi bổ túc của học sinh đã đỗ chưa
      const allPassed = allStudentExams.every(e => {
        if (e.id === examId) return isPassed;
        return e.isPassed === true;
      });

      let studentActivated = false;
      let targetClassId = exam.student.transferRecords[0]?.targetClassId;

      if (allPassed && exam.student.status === 'PENDING_MAKEUP_EXAM') {
        // Kích hoạt học sinh chính thức
        await tx.student.update({
          where: { id: studentId },
          data: {
            status: 'ACTIVE',
            classId: targetClassId || null,
            enrolledAt: new Date()
          }
        });
        studentActivated = true;

        await AuditLogService.log({
          userId: userContext?.id || null,
          action: 'TRANSFER_STUDENT_ACTIVATED',
          module: 'transfer',
          resourceType: 'Student',
          resourceId: studentId,
          newData: {
            status: 'ACTIVE',
            assignedClassId: targetClassId,
            examSummary: allStudentExams.map(e => ({
              subject: e.subjectName,
              score: e.id === examId ? numScore : Number(e.score)
            }))
          },
          reason: 'Học sinh đã hoàn thành và đạt >= 5.0 toàn bộ các bài thi kiểm tra bổ sung kiến thức môn mới'
        });
      }

      return {
        updatedExam,
        allPassed,
        studentActivated,
        targetClassId,
        remainingExamsCount: allStudentExams.filter(e => !(e.id === examId ? isPassed : e.isPassed)).length
      };
    });
  }

  /**
   * 4. Tính điểm trung bình (GPA) cả năm cho học sinh chuyển trường
   * Kết hợp điểm HK1 từ TransferredGrade và điểm HK2 từ bảng Grade tại trường mới:
   * 
   *    ĐTB Cả Năm = (ĐTB HK1 + 2 * ĐTB HK2) / 3
   * 
   * @param {string} studentId - ID học sinh
   * @param {string} [academicYear='2026-2027'] - Niên khóa cần tính điểm
   */
  static async calculateFinalGPA(studentId, academicYear = '2026-2027') {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
        transferredGrades: {
          where: { semester: 'HK1' }
        },
        grades: true
      }
    });

    if (!student) {
      throw new Error(`Không tìm thấy học sinh với ID "${studentId}"`);
    }

    // 1. Lấy điểm HK1 từ TransferredGrade
    const hk1ScoresBySubject = {};
    for (const tg of student.transferredGrades) {
      const normName = this.normalizeSubject(tg.subjectName);
      hk1ScoresBySubject[normName] = {
        originalName: tg.subjectName,
        score: Number(tg.finalScore)
      };
    }

    // 2. Lấy điểm HK2 từ bảng Grade tại trường mới
    // Tìm bản ghi Grade có semester chứa 'HK2' hoặc bản ghi mới nhất
    const hk2Record = student.grades.find(g => 
      (g.semester && g.semester.toUpperCase().includes('HK2'))
    ) || student.grades[0]; // fallback nếu có

    // Map các trường điểm chuẩn trong bảng Grade
    const standardSubjects = [
      { key: 'math', name: 'Toán' },
      { key: 'literature', name: 'Ngữ văn' },
      { key: 'english', name: 'Tiếng Anh' },
      { key: 'physics', name: 'Vật lý' },
      { key: 'chemistry', name: 'Hóa học' },
      { key: 'it', name: 'Tin học' }
    ];

    const subjectResults = [];
    let totalHK1 = 0;
    let countHK1 = 0;
    let totalHK2 = 0;
    let countHK2 = 0;
    let totalFullYear = 0;
    let countFullYear = 0;

    for (const sub of standardSubjects) {
      const normName = this.normalizeSubject(sub.name);
      const hk1Data = hk1ScoresBySubject[normName];
      const hk1Score = hk1Data !== undefined ? hk1Data.score : null;

      let hk2Score = null;
      if (hk2Record && hk2Record[sub.key] !== undefined && hk2Record[sub.key] !== null) {
        hk2Score = Number(hk2Record[sub.key]);
      }

      let fullYearScore = null;
      if (hk1Score !== null && hk2Score !== null) {
        // Công thức chuẩn: (HK1 + 2 * HK2) / 3
        fullYearScore = Number(((hk1Score + 2 * hk2Score) / 3).toFixed(2));
        totalFullYear += fullYearScore;
        countFullYear++;
      } else if (hk2Score !== null) {
        fullYearScore = hk2Score;
      } else if (hk1Score !== null) {
        fullYearScore = hk1Score;
      }

      if (hk1Score !== null) {
        totalHK1 += hk1Score;
        countHK1++;
      }
      if (hk2Score !== null) {
        totalHK2 += hk2Score;
        countHK2++;
      }

      subjectResults.push({
        subjectKey: sub.key,
        subjectName: sub.name,
        hk1Score,
        hk2Score,
        fullYearScore
      });
    }

    // Xử lý các môn khác trong transferredGrades nếu chưa nằm trong standardSubjects
    for (const [normName, data] of Object.entries(hk1ScoresBySubject)) {
      const exists = standardSubjects.some(s => this.normalizeSubject(s.name) === normName);
      if (!exists) {
        const hk1Score = data.score;
        totalHK1 += hk1Score;
        countHK1++;

        subjectResults.push({
          subjectKey: normName,
          subjectName: data.originalName,
          hk1Score,
          hk2Score: null,
          fullYearScore: hk1Score
        });
      }
    }

    const gpaHK1 = countHK1 > 0 ? Number((totalHK1 / countHK1).toFixed(2)) : null;
    const gpaHK2 = countHK2 > 0 ? Number((totalHK2 / countHK2).toFixed(2)) : null;

    let overallFinalGPA = null;
    if (gpaHK1 !== null && gpaHK2 !== null) {
      overallFinalGPA = Number(((gpaHK1 + 2 * gpaHK2) / 3).toFixed(2));
    } else if (countFullYear > 0) {
      overallFinalGPA = Number((totalFullYear / countFullYear).toFixed(2));
    }

    // Đánh giá xếp loại học lực (Thông tư 22/BGDĐT)
    let academicPerformance = 'Chưa xếp loại';
    if (overallFinalGPA !== null) {
      if (overallFinalGPA >= 8.0) {
        academicPerformance = 'Giỏi';
      } else if (overallFinalGPA >= 6.5) {
        academicPerformance = 'Khá';
      } else if (overallFinalGPA >= 5.0) {
        academicPerformance = 'Đạt';
      } else {
        academicPerformance = 'Chưa đạt';
      }
    }

    return {
      studentId: student.id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      class: student.class ? { id: student.class.id, className: student.class.className } : null,
      academicYear,
      formula: 'ĐTB Cả Năm = (ĐTB HK1 + 2 * ĐTB HK2) / 3',
      gpaHK1,
      gpaHK2,
      overallFinalGPA,
      academicPerformance,
      subjects: subjectResults
    };
  }

  /**
   * Lấy danh sách học sinh chuyển trường kèm trạng thái và kết quả thi bổ túc
   */
  static async getTransferStudents(query = {}) {
    const { status, gradeLevel, page = 1, limit = 20 } = query;
    const where = {
      transferRecords: {
        some: {}
      }
    };

    if (status) {
      where.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        include: {
          class: true,
          transferRecords: { orderBy: { createdAt: 'desc' } },
          makeupExams: true,
          transferredGrades: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      })
    ]);

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
      data: students
    };
  }
}

export default TransferService;
