import express from 'express';
import { getStudents, getStudentById, createStudent, updateStudent, deleteStudent } from '../controllers/studentController.js';
import { getScriptTemplate, syncFromGoogleSheets, exportToGoogleSheets } from '../controllers/googleSheetController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Google Sheets Sync & Template routes (Admin only)
router.get('/google-sheets/template', protect, authorize('admin'), getScriptTemplate);
router.post('/google-sheets/sync', protect, authorize('admin'), syncFromGoogleSheets);
router.post('/google-sheets/export', protect, authorize('admin'), exportToGoogleSheets);

// GET all students (accessible by all logged in users, but filtered in controller)
router.get('/', protect, getStudents);

// GET student by ID
router.get('/:id', protect, getStudentById);

// POST, PUT, DELETE only for Admin
router.post('/', protect, authorize('admin'), createStudent);
router.put('/:id', protect, authorize('admin'), updateStudent);
router.delete('/:id', protect, authorize('admin'), deleteStudent);

export default router;

