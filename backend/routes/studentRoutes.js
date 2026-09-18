import express from 'express';
import { 
    getStudents, 
    getStudentById, 
    createStudent, 
    updateStudent, 
    deleteStudent,
    getStudentAttendanceSummary,
    resetStudentPassword,
    bulkResetPasswords,
    bulkChangeClass,
    bulkToggleStatus,
    bulkDeleteStudents,
    simulateRollover,
    executeRollover,
    updateStudentHealthRecord,
    createStudentDocument,
    deleteStudentDocument
} from '../controllers/studentController.js';
import { getScriptTemplate, syncFromGoogleSheets, exportToGoogleSheets } from '../controllers/googleSheetController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Google Sheets Sync & Template routes (Admin only)
router.get('/google-sheets/template', protect, authorize('admin'), getScriptTemplate);
router.post('/google-sheets/sync', protect, authorize('admin'), syncFromGoogleSheets);
router.post('/google-sheets/export', protect, authorize('admin'), exportToGoogleSheets);

// Bulk Actions (Admin only) - MUST BE BEFORE /:id
router.post('/bulk/change-class', protect, authorize('admin'), bulkChangeClass);
router.post('/bulk/toggle-status', protect, authorize('admin'), bulkToggleStatus);
router.post('/bulk/reset-password', protect, authorize('admin'), bulkResetPasswords);
router.post('/bulk/delete', protect, authorize('admin'), bulkDeleteStudents);

// Rollover / Promotion Wizard routes (Admin only)
router.post('/rollover/simulate', protect, authorize('admin'), simulateRollover);
router.post('/rollover/execute', protect, authorize('admin'), executeRollover);

// GET all students
router.get('/', protect, getStudents);

// Student Detail & 360 sub-resources
router.get('/:id', protect, getStudentById);
router.get('/:id/attendance-summary', protect, getStudentAttendanceSummary);
router.post('/:id/reset-password', protect, authorize('admin'), resetStudentPassword);
router.put('/:id/health-record', protect, updateStudentHealthRecord);
router.post('/:id/documents', protect, createStudentDocument);
router.delete('/:id/documents/:docId', protect, deleteStudentDocument);

// POST, PUT, DELETE only for Admin
router.post('/', protect, authorize('admin'), createStudent);
router.put('/:id', protect, authorize('admin'), updateStudent);
router.delete('/:id', protect, authorize('admin'), deleteStudent);

export default router;


