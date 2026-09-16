import express from 'express';
import { 
    getDashboardSummary, 
    getDebtorsByClass, 
    markBillAsPaid, 
    getMyBills, 
    getStudentBills,
    lookupStudentFee,
    getClassStudentsTuition,
    payAllStudentBills,
    getBillQrCode,
    handlePaymentWebhook
} from '../controllers/tuitionController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Webhook nhận thông báo ngân hàng (không yêu cầu JWT Bearer của người dùng)
router.post('/payment-webhook', handlePaymentWebhook);

router.use(protect);

// Sinh mã VietQR động cho hóa đơn
router.get('/bills/:billId/qr', getBillQrCode);

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

