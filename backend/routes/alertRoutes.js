import express from 'express';
import { getAlerts, triggerScan, resolveAlert } from '../controllers/alertController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Xem danh sách cảnh báo (Admin, Teacher, Student theo scope)
router.get('/', getAlerts);

// Kích hoạt quét rủi ro sớm (Admin & Teacher)
router.post('/scan', authorize('admin', 'teacher'), triggerScan);

// Đánh dấu đã giải quyết (Admin & Teacher)
router.patch('/:id/resolve', authorize('admin', 'teacher'), resolveAlert);

export default router;
