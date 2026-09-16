import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Wallet, CheckCircle, AlertTriangle, Clock, QrCode, Download, ShieldCheck, X } from 'lucide-react';
import api from '../services/api';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

const StudentTuition = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBillForQR, setSelectedBillForQR] = useState(null);

  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tuition/my-bills');
      if (res.data?.data) {
        setBills(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load tuition bills', err);
    } finally {
      setLoading(false);
    }
  };

  const getBillAmount = (b) => (b.finalAmount !== null && b.finalAmount !== undefined) ? b.finalAmount : (b.feeProfile?.amount || 0);
  const totalAmount = bills.reduce((acc, b) => acc + (b.originalAmount || b.feeProfile?.amount || 0), 0);
  const totalDiscount = bills.reduce((acc, b) => acc + (b.discountAmount || 0), 0);
  const paidAmount = bills.filter(b => b.status === 'paid').reduce((acc, b) => acc + getBillAmount(b), 0);
  const unpaidAmount = bills.filter(b => b.status !== 'paid').reduce((acc, b) => acc + getBillAmount(b), 0);

  const [qrLoading, setQrLoading] = useState(false);
  const [qrData, setQrData] = useState(null);

  const handleOpenQR = async (bill) => {
    setSelectedBillForQR(bill);
    try {
      setQrLoading(true);
      const res = await api.get(`/tuition/bills/${bill.id}/qr`);
      if (res.data?.data) {
        setQrData(res.data.data);
      }
    } catch (e) {
      console.warn('Fallback to local QR params:', e);
    } finally {
      setQrLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-700 rounded-3xl p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            Cổng Tra Cứu Học Phí & VietQR
          </span>
          <h1 className="text-3xl font-extrabold mt-2">Học Phí & Hóa Đơn</h1>
          <p className="text-blue-100 text-sm mt-1">
            Học sinh: <strong>{userData.name}</strong> • Mã HS: <strong>{userData.studentCode || 'HS001'}</strong>
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-right">
          <p className="text-xs text-blue-100">Tổng công nợ cần nộp</p>
          <p className="text-2xl font-black text-white">{formatCurrency(unpaidAmount)}</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-semibold uppercase">Học Phí Gốc</p>
            <h3 className="text-lg font-black text-gray-800 mt-0.5">{formatCurrency(totalAmount)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-semibold uppercase">Miễn Giảm Chính Sách</p>
            <h3 className="text-lg font-black text-purple-600 mt-0.5">-{formatCurrency(totalDiscount)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-semibold uppercase">Đã Thanh Toán</p>
            <h3 className="text-lg font-black text-emerald-600 mt-0.5">{formatCurrency(paidAmount)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-semibold uppercase">Còn Cần Nộp</p>
            <h3 className="text-lg font-black text-amber-600 mt-0.5">{formatCurrency(unpaidAmount)}</h3>
          </div>
        </div>
      </div>

      {/* Bill List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <CreditCard size={18} className="text-blue-600" />
            Danh sách phiếu thu / Hóa đơn học phí
          </h3>
          <span className="text-xs text-gray-400 font-medium">Hỗ trợ đối soát tự động qua VietQR</span>
        </div>

        <div className="divide-y divide-gray-100">
          {bills.map((bill, bIdx) => {
            const isPaid = bill.status === 'paid';
            const effectiveAmount = getBillAmount(bill);
            const hasDiscount = bill.discountAmount > 0;

            return (
              <div key={bill.id || `bill-${bIdx}`} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-bold text-gray-800 text-base">{bill.feeProfile?.name || 'Khoản thu học phí'}</h4>
                    <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                      isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {isPaid ? '✓ ĐÃ THANH TOÁN' : '⏳ CHƯA THANH TOÁN'}
                    </span>
                    {hasDiscount && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                        Được giảm: -{formatCurrency(bill.discountAmount)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Năm học: <strong>{bill.feeProfile?.academicYear}</strong> • Học kỳ: <strong>{bill.feeProfile?.semester}</strong> • Khối áp dụng: <strong>Khối {bill.feeProfile?.targetGrades?.join(', ')}</strong>
                  </p>
                  {isPaid && bill.paidAt && (
                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <ShieldCheck size={14} /> Đã đóng vào lúc: {new Date(bill.paidAt).toLocaleDateString('vi-VN')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Số tiền phải nộp</p>
                    <p className="text-lg font-black text-gray-800">{formatCurrency(effectiveAmount)}</p>
                    {hasDiscount && (
                      <p className="text-[10px] text-gray-400 line-through">Gốc: {formatCurrency(bill.originalAmount || bill.feeProfile?.amount)}</p>
                    )}
                  </div>

                  {!isPaid ? (
                    <button
                      onClick={() => handleOpenQR(bill)}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-blue-600/20 transition-all hover:scale-105"
                    >
                      <QrCode size={16} /> Thanh Toán VietQR
                    </button>
                  ) : (
                    <div className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle size={14} className="text-emerald-600" /> Biên lai hợp lệ
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {bills.length === 0 && (
            <div className="p-12 text-center text-gray-400">
              Hiện tại bạn không có hóa đơn học phí nào cần thanh toán.
            </div>
          )}
        </div>
      </div>

      {/* QR Payment Modal */}
      <AnimatePresence>
        {selectedBillForQR && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <QrCode size={20} /> Thanh toán qua VietQR NAPAS247
                </h3>
                <button
                  onClick={() => { setSelectedBillForQR(null); setQrData(null); }}
                  className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 text-center space-y-4">
                {qrLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    <p className="text-xs text-gray-500 font-medium">Đang sinh mã VietQR định danh...</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl inline-block shadow-inner">
                      <img
                        src={qrData?.qrImageUrl || `https://img.vietqr.io/image/970422-0888999999-compact2.png?amount=${getBillAmount(selectedBillForQR)}&addInfo=${encodeURIComponent(`THPT ${userData.studentCode || 'HS'} ${selectedBillForQR.id.slice(0, 8)}`)}&accountName=TRUONG%20THPT%20TTLN`}
                        alt="VietQR Payment Code"
                        className="w-56 h-56 mx-auto rounded-lg object-contain"
                      />
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl text-left text-xs space-y-1.5 border border-blue-100 text-gray-700">
                      <p><strong>Ngân hàng:</strong> {qrData?.bankInfo?.bankName || 'MB Bank (Quân Đội)'}</p>
                      <p><strong>Số tài khoản:</strong> <span className="font-mono font-bold text-blue-900">{qrData?.bankInfo?.accountNumber || '0888999999'}</span></p>
                      <p><strong>Chủ tài khoản:</strong> {qrData?.bankInfo?.accountName || 'TRƯỜNG THPT TTLN'}</p>
                      <p><strong>Số tiền:</strong> <span className="text-red-600 font-black text-sm">{formatCurrency(qrData?.amount || getBillAmount(selectedBillForQR))}</span></p>
                      <p><strong>Nội dung CK:</strong> <code className="bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-700 font-bold select-all">{qrData?.bankInfo?.transferDescription || `THPT ${userData.studentCode || 'HS'} ${selectedBillForQR.id.slice(0, 8)}`}</code></p>
                    </div>

                    <p className="text-xs text-gray-500 italic">
                      Hệ thống tự động gạch nợ sau khi ngân hàng xác nhận giao dịch thành công.
                    </p>
                  </>
                )}

                <button
                  onClick={() => { setSelectedBillForQR(null); setQrData(null); }}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-colors"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentTuition;
