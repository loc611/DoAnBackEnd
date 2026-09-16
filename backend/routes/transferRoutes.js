import express from 'express';
import {
  checkGap,
  admitTransferStudent,
  getTransferStudents,
  getMakeupExamsByStudent,
  recordMakeupExamScore,
  calculateFinalGPA
} from '../controllers/transferController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Kiểm tra trước lệch môn học (không bắt buộc auth hoặc auth nhẹ)
router.post('/check-gap', protect, checkGap);

// Tiếp nhận học sinh chuyển trường (Admin / Giáo vụ)
router.post('/admit', protect, authorize('admin'), admitTransferStudent);

// Danh sách học sinh chuyển trường
router.get('/students', protect, getTransferStudents);

// Danh sách bài thi bổ túc của học sinh
router.get('/makeup-exams/:studentId', protect, getMakeupExamsByStudent);

// Chấm điểm bài thi bổ túc (Admin / GV chấm thi)
router.put('/makeup-exams/:examId', protect, authorize('admin'), recordMakeupExamScore);

// Tính điểm trung bình cả năm HK1 (trường cũ) + HK2 (trường mới)
router.get('/gpa/:studentId', protect, calculateFinalGPA);

export default router;
