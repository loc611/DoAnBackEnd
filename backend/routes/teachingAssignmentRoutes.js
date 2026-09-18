import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
    getTeachingAssignmentMatrix,
    batchSaveTeachingAssignments,
    updateSingleAssignment
} from '../controllers/teachingAssignmentController.js';

const router = express.Router();

router.get('/matrix', protect, getTeachingAssignmentMatrix);
router.post('/batch', protect, authorize('admin', 'principal', 'vice_principal'), batchSaveTeachingAssignments);
router.post('/single', protect, authorize('admin', 'principal', 'vice_principal'), updateSingleAssignment);

export default router;
