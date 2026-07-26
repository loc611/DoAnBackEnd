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
router.use(authorize('admin')); // Chỉ admin quản lý lớp

router.get('/', getClasses);
router.post('/', createClass);

router.get('/:id', getClassById);
router.put('/:id', updateClass);
router.delete('/:id', deleteClass);

router.get('/:id/students', getStudentsInClass);
router.post('/:id/students', addStudentsToClass);
router.delete('/:id/students/:studentId', removeStudentFromClass);

export default router;
