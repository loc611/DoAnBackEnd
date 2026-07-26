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

// Chỉ Admin mới được quản lý hệ thống tài khoản
router.use(protect);
router.use(authorize('admin'));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/status', updateStatus);
router.patch('/:id/reset-password', resetPassword);
router.delete('/:id', deleteUser);

export default router;
