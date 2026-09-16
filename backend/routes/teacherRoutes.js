import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { getTeacherProfileContext } from '../controllers/teacherPortalController.js';

const router = express.Router();

/**
 * @route   GET /api/teacher/profile-context
 * @desc    Lấy ngữ cảnh vai trò (Bộ môn & Chủ nhiệm) của giáo viên đăng nhập
 * @access  Private (Teacher, Admin)
 */
router.get('/profile-context', protect, getTeacherProfileContext);

export default router;
