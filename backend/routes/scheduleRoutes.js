import express from 'express';
import { 
    getScheduleByClass, 
    updateSchedule, 
    getMyTeachingSchedule, 
    createMakeupProposal 
} from '../controllers/scheduleController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Lịch dạy cá nhân của giáo viên
router.get('/teacher/me', protect, getMyTeachingSchedule);
router.get('/teacher/:teacherId', protect, getMyTeachingSchedule);

// Đề xuất dạy bù (hỗ trợ cả /api/schedule/makeup-proposals và /api/makeup-proposals)
router.post('/makeup-proposals', protect, createMakeupProposal);
router.post('/', protect, createMakeupProposal);


// Thời khóa biểu theo lớp
router.route('/class/:classId')
    .get(protect, getScheduleByClass)
    .put(protect, authorize('admin', 'teacher'), updateSchedule);

export default router;

