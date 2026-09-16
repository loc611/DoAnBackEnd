import express from 'express';
import {
  submitPetition,
  getPetitions,
  reviewPetition
} from '../controllers/petitionController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Xem danh sách đơn từ (theo vai trò)
router.get('/', getPetitions);

// Nộp đơn từ mới (Học sinh, Phụ huynh, Giáo viên)
router.post('/', submitPetition);

// Phê duyệt hoặc từ chối đơn từ (Admin & GVCN)
router.patch('/:id/review', authorize('admin', 'teacher'), reviewPetition);

export default router;
