import prisma from '../prismaClient.js';

/**
 * VietQR Service - Tạo mã VietQR động chuẩn NAPAS247 và Đối soát Webhook gạch nợ tự động
 */
class VietQrService {
  /**
   * Cấu hình tài khoản ngân hàng nhà trường (có thể đọc từ SystemSetting hoặc env)
   */
  static async getSchoolBankConfig() {
    const defaultBank = {
      bankBin: process.env.SCHOOL_BANK_BIN || '970422', // Mặc định MBBank (970422) hoặc VCB (970436)
      bankName: process.env.SCHOOL_BANK_NAME || 'MBBank',
      accountNumber: process.env.SCHOOL_BANK_ACCOUNT || '0888999999',
      accountName: process.env.SCHOOL_BANK_OWNER || 'TRUONG THPT TTLN'
    };

    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { id: 'default_setting' }
      });
      if (setting?.extraConfigs?.bankConfig) {
        return { ...defaultBank, ...setting.extraConfigs.bankConfig };
      }
    } catch (e) {
      // Fallback to default
    }

    return defaultBank;
  }

  /**
   * Sinh thông tin thanh toán VietQR động cho một hóa đơn học phí
   * @param {string} billId - ID của hóa đơn FeeBill
   */
  static async generateQrForBill(billId) {
    const bill = await prisma.feeBill.findUnique({
      where: { id: billId },
      include: {
        feeProfile: true,
        student: { select: { studentCode: true, fullName: true, class: { select: { className: true } } } }
      }
    });

    if (!bill) {
      throw new Error('Không tìm thấy hóa đơn học phí');
    }

    const bank = await this.getSchoolBankConfig();
    const amount = Math.round(bill.finalAmount !== null && bill.finalAmount !== undefined ? bill.finalAmount : (bill.feeProfile?.amount || 0));
    
    // Cú pháp nội dung chuyển khoản định danh: THPT [studentCode] [billIdShort]
    const shortBillId = bill.id.replace(/-/g, '').slice(0, 8).toUpperCase();
    const transferDescription = `THPT ${bill.student?.studentCode || 'HS'} ${shortBillId}`;

    // Link ảnh VietQR chuẩn quicklink
    const qrImageUrl = `https://img.vietqr.io/image/${bank.bankBin}-${bank.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferDescription)}&accountName=${encodeURIComponent(bank.accountName)}`;

    return {
      billId: bill.id,
      studentCode: bill.student?.studentCode,
      studentName: bill.student?.fullName,
      className: bill.student?.class?.className,
      feeName: bill.feeProfile?.name,
      amount,
      isPaid: bill.status === 'paid',
      bankInfo: {
        bankName: bank.bankName,
        accountNumber: bank.accountNumber,
        accountName: bank.accountName,
        transferDescription
      },
      qrImageUrl
    };
  }

  /**
   * Xử lý Webhook biến động số dư ngân hàng và đối soát tự động gạch nợ
   * @param {Object} webhookData - Dữ liệu payload gửi từ cổng ngân hàng / webhook provider
   */
  static async processPaymentWebhook(webhookData) {
    // Trích xuất các trường thông tin chuẩn (hỗ trợ định dạng SePay / Casso / Bank Gateway)
    const transferContent = webhookData.content || webhookData.description || webhookData.transferContent || '';
    const transferAmount = Number(webhookData.transferAmount || webhookData.amount || 0);
    const transactionCode = String(webhookData.referenceCode || webhookData.transactionCode || webhookData.id || `TXN_${Date.now()}`);
    const bankCode = webhookData.gateway || webhookData.bankCode || 'ONLINE_BANK';

    console.log(`📥 Nhận Webhook giao dịch: ${transactionCode}, Số tiền: ${transferAmount}, Nội dung: "${transferContent}"`);

    // 1. Kiểm tra xem giao dịch này đã được ghi nhận trước đó chưa
    const existingTx = await prisma.paymentTransaction.findUnique({
      where: { transactionCode }
    });

    if (existingTx) {
      return { success: true, message: 'Giao dịch đã được ghi nhận trước đó', billId: existingTx.billId };
    }

    // 2. Tìm kiếm hóa đơn khớp với nội dung chuyển khoản
    // Format: THPT [studentCode] [shortBillId]
    const match = transferContent.match(/THPT\s+([A-Za-z0-9_-]+)\s+([A-Za-z0-9]+)/i);
    let matchedBill = null;

    if (match) {
      const studentCode = match[1];
      const shortBillId = match[2];

      // Tìm theo studentCode và bill id bắt đầu bằng shortBillId
      const student = await prisma.student.findUnique({
        where: { studentCode }
      });

      if (student) {
        const candidateBills = await prisma.feeBill.findMany({
          where: { studentId: student.id, status: 'unpaid' },
          include: { feeProfile: true }
        });

        matchedBill = candidateBills.find(b => b.id.replace(/-/g, '').toUpperCase().startsWith(shortBillId.toUpperCase())) || candidateBills[0];
      }
    }

    // Nếu không khớp regex, thử tìm hóa đơn chưa nộp có số tiền khớp chính xác
    if (!matchedBill && transferAmount > 0) {
      matchedBill = await prisma.feeBill.findFirst({
        where: {
          status: 'unpaid',
          OR: [
            { finalAmount: transferAmount },
            { feeProfile: { amount: transferAmount } }
          ]
        },
        include: { feeProfile: true, student: true }
      });
    }

    if (!matchedBill) {
      console.warn(`⚠️ Không tìm thấy hóa đơn khớp với giao dịch: ${transactionCode}`);
      return { success: false, message: 'Không đối soát được hóa đơn tương ứng với nội dung chuyển khoản' };
    }

    // 3. Thực hiện gạch nợ tự động trong Transaction
    await prisma.$transaction(async (tx) => {
      // Cập nhật hóa đơn thành 'paid'
      await tx.feeBill.update({
        where: { id: matchedBill.id },
        data: {
          status: 'paid',
          paidAt: new Date()
        }
      });

      // Lưu giao dịch thanh toán
      await tx.paymentTransaction.create({
        data: {
          billId: matchedBill.id,
          transactionCode,
          amount: transferAmount,
          bankCode,
          paymentMethod: 'VIETQR',
          transferContent,
          paidAt: new Date(),
          status: 'SUCCESS',
          rawPayload: webhookData
        }
      });
    });

    console.log(`✅ Đã gạch nợ thành công hóa đơn #${matchedBill.id} cho học sinh qua VietQR!`);
    return {
      success: true,
      message: 'Gạch nợ tự động thành công',
      billId: matchedBill.id,
      transactionCode
    };
  }
}

export default VietQrService;
