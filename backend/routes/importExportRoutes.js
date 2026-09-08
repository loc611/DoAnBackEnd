import express from 'express';
import { 
    importStudentsBatch, 
    exportClassGrades, 
    exportStudentsList 
} from '../controllers/importExportController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

// 1. Batch Import Học Sinh từ Excel
router.post('/students/batch', authorize('admin', 'teacher'), importStudentsBatch);

// 2. Xuất Bảng Điểm Lớp & Mẫu Phiếu Báo Điểm
router.get('/classes/:classId/grades/export', authorize('admin', 'teacher'), exportClassGrades);

// 3. Xuất Danh Sách Học Sinh
router.get('/students/export', authorize('admin', 'teacher'), exportStudentsList);

export default router;
