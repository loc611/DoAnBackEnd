import express from 'express';
import { 
    getPeriodsByDate,
    getClassAttendance, 
    saveClassAttendance, 
    getStudentAttendance, 
    getAttendanceOverview 
} from '../controllers/attendanceController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Danh sách tiết học theo thời khóa biểu ngày
router.get('/periods-by-date', getPeriodsByDate);

// Tổng quan toàn trường (Admin)
router.get('/overview', authorize('admin'), getAttendanceOverview);

// Điểm danh của cá nhân học sinh
router.get('/student/:studentId', getStudentAttendance);

// Điểm danh theo lớp & tiết học (hoặc buổi)
router.get('/class/:classId', getClassAttendance);
router.post('/batch', authorize('admin', 'teacher'), saveClassAttendance);

export default router;
