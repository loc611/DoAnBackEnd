import express from 'express';
import { 
    getUsers, 
    createUser, 
    updateUser, 
    updateStatus, 
    resetPassword, 
    deleteUser 
} from '../controllers/userController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Quản Khoa (Teacher có chức vụ Quản Khoa/BGH) và Admin được xem và cập nhật trạng thái (Khóa/Đình chỉ)
router.get('/', authorize('admin', 'teacher'), getUsers);
router.patch('/:id/status', authorize('admin', 'teacher'), updateStatus);

// Chỉ Admin mới được tạo mới, sửa toàn diện, reset mật khẩu, xóa tài khoản
router.post('/', authorize('admin'), createUser);
router.put('/:id', authorize('admin'), updateUser);
router.patch('/:id/reset-password', authorize('admin'), resetPassword);
router.delete('/:id', authorize('admin'), deleteUser);

export default router;

