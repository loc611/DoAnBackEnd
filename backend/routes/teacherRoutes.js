import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { 
    getTeacherProfileContext, 
    getTeacherDetails,
    addTeacherEvaluation,
    addTeacherDocument,
    updateTeacherProfile
} from '../controllers/teacherPortalController.js';

const router = express.Router();

/**
 * @route   GET /api/teacher/profile-context
 * @desc    Lấy ngữ cảnh vai trò (Bộ môn & Chủ nhiệm) của giáo viên đăng nhập
 * @access  Private (Teacher, Admin)
 */
router.get('/profile-context', protect, getTeacherProfileContext);

/**
 * @route   GET /api/teachers/:id hoặc /api/teacher/:id
 * @desc    Lấy toàn bộ thông tin chi tiết giáo viên (Mã GV, UUID)
 * @access  Private (Teacher, Admin)
 */
router.get('/:id', protect, getTeacherDetails);

/**
 * @route   PUT /api/teachers/:id/profile
 * @desc    Cập nhật thông tin nhân thân, ngân hàng, định mức
 * @access  Private (Admin, Principal)
 */
router.put('/:id/profile', protect, authorize('admin', 'principal', 'vice_principal'), updateTeacherProfile);

/**
 * @route   POST /api/teachers/:id/evaluations
 * @desc    Lưu đánh giá chuẩn nghề nghiệp (Thông tư 20/2018)
 * @access  Private (Admin, Principal)
 */
router.post('/:id/evaluations', protect, authorize('admin', 'principal', 'vice_principal'), addTeacherEvaluation);

/**
 * @route   POST /api/teachers/:id/documents
 * @desc    Lưu tài liệu số hóa
 * @access  Private (Teacher, Admin)
 */
router.post('/:id/documents', protect, addTeacherDocument);

export default router;


