import express from 'express';
import { 
    getClasses, 
    getClassById, 
    createClass, 
    updateClass, 
    deleteClass,
    getStudentsInClass,
    addStudentsToClass,
    removeStudentFromClass
} from '../controllers/classController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

// GET routes: All authenticated users can view classes & student rosters
router.get('/', getClasses);
router.get('/:id', getClassById);
router.get('/:id/students', getStudentsInClass);

// Mutation routes: Only Admin can modify
router.post('/', authorize('admin'), createClass);
router.put('/:id', authorize('admin'), updateClass);
router.delete('/:id', authorize('admin'), deleteClass);

router.post('/:id/students', authorize('admin'), addStudentsToClass);
router.delete('/:id/students/:studentId', authorize('admin'), removeStudentFromClass);

export default router;

