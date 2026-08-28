import express from 'express';
import { getGradesByClass, updateClassGrades, getMyGrades } from '../controllers/gradeController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/my-grades', getMyGrades);

router.route('/class/:classId')
    .get(getGradesByClass)
    .put(authorize('admin', 'teacher'), updateClassGrades);

export default router;

