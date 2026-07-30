import express from 'express';
import { getGradesByClass, updateClassGrades } from '../controllers/gradeController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/class/:classId')
    .get(protect, getGradesByClass)
    .put(protect, authorize('admin', 'teacher'), updateClassGrades);

export default router;
