import express from 'express';
import { getNotifications, createNotification, deleteNotification } from '../controllers/notificationController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getNotifications)
    .post(protect, authorize('admin', 'teacher'), createNotification);

router.route('/:id')
    .delete(protect, authorize('admin', 'teacher'), deleteNotification);

export default router;
