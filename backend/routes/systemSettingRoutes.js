import express from 'express';
import {
    getSettings,
    updateSettings,
    exportBackup,
    restoreBackup,
    resetSettings
} from '../controllers/systemSettingController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Lấy cấu hình hệ thống (Có thể cho phép authenticated user hoặc public cho portal info)
router.get('/', getSettings);

// Các thao tác quản trị yêu cầu quyền Admin
router.put('/', protect, authorize('admin'), updateSettings);
router.get('/backup', protect, authorize('admin'), exportBackup);
router.post('/restore', protect, authorize('admin'), restoreBackup);
router.post('/reset', protect, authorize('admin'), resetSettings);

export default router;
