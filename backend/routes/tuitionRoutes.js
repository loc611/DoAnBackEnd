import express from 'express';
import { getDashboardSummary, getDebtorsByClass, markBillAsPaid, getMyBills, getStudentBills } from '../controllers/tuitionController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Học sinh tự xem hóa đơn của mình
router.get('/my-bills', getMyBills);

// Admin & Teacher xem hóa đơn theo học sinh
router.get('/student/:studentId', authorize('admin', 'teacher'), getStudentBills);

// Chức năng quản trị học phí dành riêng cho Admin
router.get('/dashboard-summary', authorize('admin'), getDashboardSummary);
router.get('/debtors/:className', authorize('admin'), getDebtorsByClass);
router.patch('/bills/:billId/pay', authorize('admin'), markBillAsPaid);

export default router;

