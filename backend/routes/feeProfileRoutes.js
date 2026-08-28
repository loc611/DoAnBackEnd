import express from 'express';
import {
    createFeeProfile,
    getFeeProfiles,
    updateFeeProfile,
    assignFeeProfile
} from '../controllers/feeProfileController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Tất cả các routes về học phí đều yêu cầu đăng nhập và quyền admin
router.use(protect);
router.use(authorize('admin'));

router.post('/', createFeeProfile);
router.get('/', getFeeProfiles);
router.put('/:id', updateFeeProfile);
router.post('/assign', assignFeeProfile);

export default router;
