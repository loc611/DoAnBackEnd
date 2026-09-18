import express from 'express';
import {
  getLessonLogsByClass,
  saveLessonLog,
  getSyllabusProgress,
  getDailyCompliance
} from '../controllers/lessonLogController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Rà soát mức độ tuân thủ ký sổ đầu bài trong ngày (Admin & Teacher)
router.get('/compliance', authorize('admin', 'principal', 'vice_principal', 'teacher'), getDailyCompliance);

// Xem sổ đầu bài của lớp (Mọi người dùng đăng nhập xem theo quyền)
router.get('/class/:classId', getLessonLogsByClass);

// Thống kê tiến độ phân phối chương trình môn học
router.get('/progress', getSyllabusProgress);

// Ký và lưu sổ đầu bài (Admin & Teacher)
router.post('/', authorize('admin', 'teacher'), saveLessonLog);

export default router;

