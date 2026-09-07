import express from 'express';
import { getGradesByClass, updateClassGrades, unlockClassGrades, getMyGrades } from '../controllers/gradeController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/my-grades', getMyGrades);

router.put('/class/:classId/unlock', authorize('admin', 'teacher'), unlockClassGrades);

router.route('/class/:classId')
    .get(getGradesByClass)
    .put(authorize('admin', 'teacher'), updateClassGrades);

export default router;

