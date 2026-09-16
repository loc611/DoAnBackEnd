import express from 'express';
import { 
    importStudentsBatch, 
    exportClassGrades, 
    exportStudentsList,
    getMasterGradebookReport,
    getMoetSyncPackage
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

// 4. Xuất Sổ Gọi Tên và Ghi Điểm (Sổ Cái) chuẩn Bộ GD&ĐT
router.get('/classes/:classId/master-gradebook', authorize('admin', 'teacher'), getMasterGradebookReport);

// 5. Gói dữ liệu liên thông Cơ sở dữ liệu ngành (moet.gov.vn)
router.get('/moet-sync-package', authorize('admin'), getMoetSyncPackage);

export default router;
