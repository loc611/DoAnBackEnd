import express from 'express';
import { 
    getDashboardSummary, 
    getDebtorsByClass, 
    markBillAsPaid, 
    getMyBills, 
    getStudentBills,
    lookupStudentFee,
    getClassStudentsTuition,
    payAllStudentBills
} from '../controllers/tuitionController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Tra cứu nhanh học phí theo học sinh (Admin & Teacher)
router.get('/lookup', authorize('admin', 'teacher'), lookupStudentFee);

// Xem danh sách toàn bộ học sinh theo Lớp kèm trạng thái học phí
router.get('/class-students/:classId', authorize('admin', 'teacher'), getClassStudentsTuition);

// Học sinh tự xem hóa đơn của mình
router.get('/my-bills', getMyBills);

// Admin & Teacher xem hóa đơn theo học sinh
router.get('/student/:studentId', authorize('admin', 'teacher'), getStudentBills);

// Chức năng quản trị học phí dành riêng cho Admin
router.get('/dashboard-summary', authorize('admin'), getDashboardSummary);
router.get('/debtors/:className', authorize('admin'), getDebtorsByClass);
router.patch('/bills/:billId/pay', authorize('admin'), markBillAsPaid);
router.patch('/students/:studentId/pay-all', authorize('admin'), payAllStudentBills);

export default router;

