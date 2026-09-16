import express from 'express';
import {
  getStandardPolicyTypes,
  getStudentPolicies,
  createStudentPolicy,
  updateStudentPolicy,
  deleteStudentPolicy,
  previewTuitionWithPolicy
} from '../controllers/policyController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Danh mục loại chính sách tiêu chuẩn
router.get('/standard-types', getStandardPolicyTypes);

// Xem danh sách chính sách (Mọi user đăng nhập xem theo scope)
router.get('/', getStudentPolicies);

// Xem trước tiền học phí sau khi áp dụng chính sách
router.post('/preview-tuition', previewTuitionWithPolicy);

// Admin & Teacher (GVCN) có quyền thêm, sửa
router.post('/', authorize('admin', 'teacher'), createStudentPolicy);
router.put('/:id', authorize('admin', 'teacher'), updateStudentPolicy);

// Xóa chính sách chỉ dành cho Admin
router.delete('/:id', authorize('admin'), deleteStudentPolicy);

export default router;
