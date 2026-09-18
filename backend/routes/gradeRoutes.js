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
    unlockClassGrades,
    requestGradeChange,
    getGradeChangeRequests,
    confirmGradeChangeByHomeroom,
    approveGradeChangeByAdmin,
    rejectGradeChange,
    generateStudentRemark
} from '../controllers/gradeController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { checkPermission } from '../middlewares/rbacScopeGuard.js';

const router = express.Router();

router.use(protect);

// 1. Tra cứu điểm cá nhân của Học sinh & Phụ huynh (Đã qua kiểm tra custody chống IDOR)
router.get('/my-grades', getMyGrades);

// 2. Nghiệp vụ Giáo viên Bộ môn (Theo chuẩn Thông tư 22/2021/TT-BGDĐT)
router.get('/subject/:classId', checkPermission('read', 'grade'), getSubjectGradesByClass);
router.put('/subject/:classId', checkPermission('write', 'grade'), updateSubjectGradesByClass);
router.put('/subject/:classId/unlock', checkPermission('override', 'grade'), unlockSubjectGrades);

// 3. Quy trình Sửa điểm sau khóa sổ (Two-Man Rule)
router.post('/change-requests', checkPermission('write', 'grade'), requestGradeChange);
router.get('/change-requests', checkPermission('read', 'grade'), getGradeChangeRequests);
router.put('/change-requests/:id/confirm', checkPermission('write', 'grade'), confirmGradeChangeByHomeroom);
router.put('/change-requests/:id/approve', checkPermission('override', 'grade'), approveGradeChangeByAdmin);
router.put('/change-requests/:id/reject', checkPermission('write', 'grade'), rejectGradeChange);

// 4. Gợi ý Nhận xét Học bạ Thông minh (Thông tư 22/2021/TT-BGDĐT)
router.post('/suggest-remarks', checkPermission('write', 'conduct'), generateStudentRemark);

// 5. Nghiệp vụ Giáo viên Chủ nhiệm (Sổ tổng hợp điểm & Đánh giá rèn luyện)
router.get('/homeroom/:classId', checkPermission('read', 'grade'), getHomeroomSummary);
router.put('/homeroom/:classId', checkPermission('write', 'conduct'), updateHomeroomEvaluation);

// 6. Tuyến đường tương thích ngược (Backward Compatibility)
router.get('/class/:classId', checkPermission('read', 'grade'), getGradesByClass);
router.put('/class/:classId', checkPermission('write', 'grade'), updateClassGrades);
router.put('/class/:classId/unlock', checkPermission('override', 'grade'), unlockClassGrades);

export default router;
