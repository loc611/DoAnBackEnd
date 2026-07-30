import express from 'express';
import { getScheduleByClass, updateSchedule } from '../controllers/scheduleController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/class/:classId')
    .get(protect, getScheduleByClass)
    .put(protect, authorize('admin', 'teacher'), updateSchedule);

export default router;
