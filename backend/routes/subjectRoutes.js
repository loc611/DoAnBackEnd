import express from 'express';
import { getSubjects, createSubject, deleteSubject } from '../controllers/subjectController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getSubjects)
    .post(protect, authorize('admin'), createSubject);

router.route('/:id')
    .delete(protect, authorize('admin'), deleteSubject);

export default router;
