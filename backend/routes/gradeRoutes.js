import express from 'express';
import { 
    getGradesByClass, 
    updateClassGrades, 
    getMyGrades,
    createUnlockRequest,
    getUnlockRequests,
    approveUnlockRequest,
    rejectUnlockRequest
} from '../controllers/gradeController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/my-grades', getMyGrades);

// Quản lý đề xuất mở khóa sổ điểm (GradeUnlockRequest)
router.route('/unlock-requests')
    .get(getUnlockRequests)
    .post(authorize('teacher', 'admin'), createUnlockRequest);

router.put('/unlock-requests/:id/approve', authorize('admin'), approveUnlockRequest);
router.put('/unlock-requests/:id/reject', authorize('admin'), rejectUnlockRequest);

router.route('/class/:classId')
    .get(getGradesByClass)
    .put(authorize('admin', 'teacher'), updateClassGrades);

export default router;


