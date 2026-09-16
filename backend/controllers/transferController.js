import TransferService from '../services/transferService.js';
import prisma from '../prismaClient.js';

/**
 * Controller phụ trách phân hệ Tiếp nhận học sinh chuyển trường khối 10 & 11
 */
export const checkGap = async (req, res) => {
  try {
    const { studentPreviousSubjects = [], targetClassSubjects = [] } = req.body;
    const missingSubjects = TransferService.checkCurriculumGap(studentPreviousSubjects, targetClassSubjects);
    return res.json({
      success: true,
      hasGap: missingSubjects.length > 0,
      missingSubjects
    });
  } catch (error) {
    console.error('Error in checkGap:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const admitTransferStudent = async (req, res) => {
  try {
    const result = await TransferService.admitTransferStudent(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: result.isCurriculumChanged
        ? 'Tiếp nhận học sinh thành công. Học sinh cần hoàn thành bài thi bổ túc do lệch tổ hợp môn trước khi xếp lớp.'
        : 'Tiếp nhận học sinh thành công và đã chính thức xếp vào lớp học.',
      data: result
    });
  } catch (error) {
    console.error('Error in admitTransferStudent:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getTransferStudents = async (req, res) => {
  try {
    const result = await TransferService.getTransferStudents(req.query);
    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error in getTransferStudents:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMakeupExamsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const exams = await prisma.makeupExam.findMany({
      where: { studentId },
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            fullName: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return res.json({
      success: true,
      data: exams
    });
  } catch (error) {
    console.error('Error in getMakeupExamsByStudent:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const recordMakeupExamScore = async (req, res) => {
  try {
    const { examId } = req.params;
    const { score, examinerName, notes } = req.body;

    const result = await TransferService.recordMakeupExamScore(
      { examId, score, examinerName, notes },
      req.user
    );

    return res.json({
      success: true,
      message: result.studentActivated
        ? 'Cập nhật điểm thi thành công! Học sinh đã đỗ toàn bộ các môn bổ túc và được KÍCH HOẠT XẾP LỚP chính thức.'
        : 'Cập nhật điểm thi thành công.',
      data: result
    });
  } catch (error) {
    console.error('Error in recordMakeupExamScore:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const calculateFinalGPA = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear } = req.query;

    const result = await TransferService.calculateFinalGPA(studentId, academicYear);
    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in calculateFinalGPA:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};
