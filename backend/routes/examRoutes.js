import express from 'express';
import { 
    getAllExams, 
    getStudentExams, 
    createExam, 
    updateExam, 
    deleteExam 
} from '../controllers/examController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Học sinh xem lịch thi của mình
router.get('/my-exams', authorize('student'), getStudentExams);

// Lấy danh sách lịch thi (tất cả các vai trò)
router.get('/', getAllExams);

// Quản trị viên thêm/sửa/xóa lịch thi
router.post('/', authorize('admin'), createExam);
router.put('/:id', authorize('admin'), updateExam);
router.delete('/:id', authorize('admin'), deleteExam);

export default router;
