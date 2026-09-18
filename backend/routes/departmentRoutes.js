import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
    getDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment
} from '../controllers/departmentController.js';

const router = express.Router();

router.get('/', protect, getDepartments);
router.get('/:id', protect, getDepartmentById);
router.post('/', protect, authorize('admin', 'principal'), createDepartment);
router.put('/:id', protect, authorize('admin', 'principal'), updateDepartment);

export default router;
