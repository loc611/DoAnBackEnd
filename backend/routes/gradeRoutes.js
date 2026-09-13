import express from 'express';
import { 
    getSubjectGradesByClass, 
    updateSubjectGradesByClass, 
    unlockSubjectGrades,
    getHomeroomSummary,
    updateHomeroomEvaluation,
    getMyGrades,
    getGradesByClass, 
    updateClassGrades, 
    unlockClassGrades 
} from '../controllers/gradeController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { checkPermission } from '../middlewares/rbacScopeGuard.js';

const router = express.Router();

router.use(protect);

// 1. Tra cứu điểm cá nhân của Học sinh & Phụ huynh (Đã qua kiểm tra custody chống IDOR)
router.get('/my-grades', getMyGrades);

// 2. Nghiệp vụ Giáo viên Bộ môn (Theo chuẩn Thông tư 22/2021/TT-BGDĐT)
router.get('/subject/:classId', checkPermission('read', 'grade'), getSubjectGradesByClass);
router.put('/subject/:classId', checkPermission('write', 'grade'), updateSubjectGradesByClass);
router.put('/subject/:classId/unlock', checkPermission('override', 'grade'), unlockSubjectGrades);

// 3. Nghiệp vụ Giáo viên Chủ nhiệm (Sổ tổng hợp điểm & Đánh giá rèn luyện)
router.get('/homeroom/:classId', checkPermission('read', 'grade'), getHomeroomSummary);
router.put('/homeroom/:classId', checkPermission('write', 'conduct'), updateHomeroomEvaluation);

// 4. Tuyến đường tương thích ngược (Backward Compatibility)
router.get('/class/:classId', checkPermission('read', 'grade'), getGradesByClass);
router.put('/class/:classId', checkPermission('write', 'grade'), updateClassGrades);
router.put('/class/:classId/unlock', checkPermission('override', 'grade'), unlockClassGrades);

export default router;
