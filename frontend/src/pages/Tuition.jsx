import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit, X, DollarSign, Wallet, CreditCard, PieChart, Users, CheckCircle, Printer, Layers, ShieldCheck, Trash2, Eye } from 'lucide-react';
import api from '../services/api';
import Swal from 'sweetalert2';
import GradeClassSelector from '../components/GradeClassSelector';

// --- Format Currency ---
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// --- Helper: Render smart scope badges in table ---
const renderScopeBadges = (p, classesList) => {
    const gradesList = [10, 11, 12];
    const badges = [];

    gradesList.forEach(grade => {
        const classesInGrade = classesList.filter(c => Number(c.grade) === Number(grade));
        if (classesInGrade.length === 0) return;

        let selectedInGrade = [];
        if (p.targetClassIds && p.targetClassIds.length > 0) {
            selectedInGrade = classesInGrade.filter(c => p.targetClassIds.includes(c.id));
        } else if (p.targetGrades && p.targetGrades.includes(grade)) {
            selectedInGrade = classesInGrade;
        }

        if (selectedInGrade.length > 0) {
            const isAll = selectedInGrade.length === classesInGrade.length;
            badges.push({
                grade,
                isAll,
                text: isAll ? `Khối ${grade} (Tất cả)` : `Khối ${grade} (${selectedInGrade.map(c => c.className).join(', ')})`,
                fullList: selectedInGrade.map(c => c.className).join(', ')
            });
        }
    });

    if (badges.length === 0) {
        if (p.targetGrades?.length > 0) {
            return (
                <div className="flex flex-wrap gap-1">
                    {p.targetGrades.map(g => (
                        <span key={g} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">
                            Khối {g}
                        </span>
                    ))}
                </div>
            );
        }
        return <span className="text-gray-400 text-xs italic">Chưa xác định</span>;
    }

    return (
        <div className="flex flex-wrap gap-1.5 max-w-md">
            {badges.map((b, idx) => (
                <span 
                    key={idx} 
                    title={`Lớp: ${b.fullList}`}
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border shadow-2xs ${
                        b.isAll 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}
                >
                    {b.text}
                </span>
            ))}
        </div>
    );
};

// --- Component: Fee Bills Cell (Gói gọn khoản thu) ---
const FeeBillsCell = ({ feeBills, onViewDetail }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!feeBills || feeBills.length === 0) {
        return <span className="text-gray-400 italic text-xs">Chưa gán đợt thu nào</span>;
    }

    const visibleCount = 2;
    const visibleBills = feeBills.slice(0, visibleCount);
    const hiddenCount = feeBills.length - visibleCount;

    return (
        <div className="relative flex flex-wrap gap-1.5 max-w-sm">
            {visibleBills.map((b, idx) => (
                <span 
                    key={b.id || `bill-${idx}`}
                    onClick={() => {
                        if (onViewDetail) onViewDetail();
                    }}
                    className={`inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold border ${
                        b.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                    } ${onViewDetail ? 'cursor-pointer hover:opacity-85' : ''}`}
                    title={`${b.feeProfile?.name}: ${formatCurrency(b.feeProfile?.amount || 0)} (${b.status === 'paid' ? 'Đã đóng' : 'Chưa đóng'})${onViewDetail ? ' - Bấm để xem chi tiết' : ''}`}
                >
                    {b.feeProfile?.name} • {formatCurrency(b.feeProfile?.amount || 0)}
                    {b.status === 'paid' && <CheckCircle size={10} className="ml-1 text-emerald-600" />}
                </span>
            ))}
            
            {hiddenCount > 0 && (
                <button
                    onClick={() => {
                        if (onViewDetail) {
                            onViewDetail();
                        } else {
                            setIsOpen(!isOpen);
                        }
                    }}
                    className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer shadow-2xs relative z-10"
                    title="Xem chi tiết toàn bộ các khoản thu"
                >
                    +{hiddenCount} khoản khác (Xem chi tiết)
                </button>
            )}

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full mt-2 z-50 w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
                    >
                        <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Chi tiết khoản thu</h4>
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="p-3 max-h-60 overflow-y-auto flex flex-col gap-2">
                            {feeBills.map((b, idx) => (
                                <div key={b.id || `bill-item-${idx}`} className="flex justify-between items-center text-xs">
                                    <span className={`font-semibold ${b.status === 'paid' ? 'text-emerald-700' : 'text-gray-700'}`}>
                                        {b.feeProfile?.name}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-gray-900">{formatCurrency(b.feeProfile?.amount || 0)}</span>
                                        {b.status === 'paid' && <CheckCircle size={12} className="text-emerald-600" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {onViewDetail && (
                            <div className="p-2 border-t border-gray-100 bg-gray-50/50">
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        onViewDetail();
                                    }}
                                    className="w-full py-1.5 text-center text-xs font-bold text-blue-600 hover:bg-blue-100/50 rounded-lg transition-colors flex items-center justify-center gap-1"
                                >
                                    <Eye size={12} /> Xem hồ sơ chi tiết
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Overlay to close popover when clicking outside */}
            {isOpen && (
                <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};

// --- Modal: Thêm/Sửa đợt thu học phí ---
const FeeProfileModal = ({ isOpen, onClose, profile, classesList, onSubmit }) => {
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        academicYear: '2026-2027',
        semester: 'HK1',
        targetGrades: [],
        targetClassIds: []
    });

    useEffect(() => {
        if (profile) {
            let initialClassIds = profile.targetClassIds || [];
            if (initialClassIds.length === 0 && profile.targetGrades?.length > 0) {
                initialClassIds = classesList
                    .filter(c => profile.targetGrades.includes(Number(c.grade)))
                    .map(c => c.id);
            }
            setFormData({
                name: profile.name || '',
                amount: profile.amount || '',
                academicYear: profile.academicYear || '2026-2027',
                semester: profile.semester || 'HK1',
                targetGrades: profile.targetGrades || [],
                targetClassIds: initialClassIds
            });
        } else {
            setFormData({
                name: '',
                amount: '',
                academicYear: '2026-2027',
                semester: 'HK1',
                targetGrades: [10, 11, 12],
                targetClassIds: classesList.map(c => c.id)
            });
        }
    }, [profile, isOpen, classesList]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleScopeChange = ({ targetGrades, targetClassIds }) => {
        setFormData(prev => ({
            ...prev,
            targetGrades,
            targetClassIds
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.targetClassIds.length === 0 && formData.targetGrades.length === 0) {
            Swal.fire('Lỗi', 'Vui lòng chọn ít nhất 1 khối hoặc lớp áp dụng', 'warning');
            return;
        }
        onSubmit(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]"
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-800">
                        {profile ? 'Sửa Đợt Thu Học Phí' : 'Tạo Đợt Thu Mới'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
                        <X size={24} />
                    </button>
                </div>
                
                <form className="p-6 space-y-4 overflow-y-auto flex-1" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tên khoản thu *</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="VD: Học phí HK1 2026-2027" />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Số tiền (VNĐ) *</label>
                        <input type="number" name="amount" value={formData.amount} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="VD: 5000000" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Năm học</label>
                            <select name="academicYear" value={formData.academicYear} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="2025-2026">2025-2026</option>
                                <option value="2026-2027">2026-2027</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Học kỳ</label>
                            <select name="semester" value={formData.semester} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="HK1">Học kỳ 1</option>
                                <option value="HK2">Học kỳ 2</option>
                                <option value="Cả năm">Cả năm</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <GradeClassSelector 
                            classesList={classesList}
                            selectedGrades={formData.targetGrades}
                            selectedClassIds={formData.targetClassIds}
                            onChange={handleScopeChange}
                        />
                    </div>

                    <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                            Hủy bỏ
                        </button>
                        <button type="submit" className="btn-primary px-5 py-2.5">
                            Lưu thông tin
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// --- Modal: Gán học phí cho học sinh ---
const AssignModal = ({ isOpen, onClose, profile, classesList, onSubmit }) => {
    const [selectedGrades, setSelectedGrades] = useState([]);
    const [selectedClassIds, setSelectedClassIds] = useState([]);

    useEffect(() => {
        if (isOpen && profile) {
            let initialClassIds = profile.targetClassIds || [];
            if (initialClassIds.length === 0 && profile.targetGrades?.length > 0) {
                initialClassIds = classesList
                    .filter(c => profile.targetGrades.includes(Number(c.grade)))
                    .map(c => c.id);
            }
            setSelectedGrades(profile.targetGrades || []);
            setSelectedClassIds(initialClassIds);
        }
    }, [isOpen, profile, classesList]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedClassIds.length === 0 && selectedGrades.length === 0) {
            Swal.fire('Lỗi', 'Vui lòng chọn ít nhất 1 khối hoặc lớp để gán', 'warning');
            return;
        }

        onSubmit({
            feeProfileId: profile.id,
            targetGrades: selectedGrades,
            targetClassIds: selectedClassIds
        });
    };

    if (!isOpen || !profile) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]"
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Gán Đợt Thu Cho Học Sinh</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Tạo hóa đơn học phí cho học sinh theo phạm vi khối / lớp</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
                        <X size={24} />
                    </button>
                </div>
                
                <form className="p-6 space-y-4 overflow-y-auto flex-1" onSubmit={handleSubmit}>
                    <div className="bg-blue-50/80 border border-blue-200 text-blue-900 p-4 rounded-xl text-sm space-y-1.5">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Đợt thu:</span> 
                            <span className="font-bold text-gray-900">{profile.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Mức thu:</span> 
                            <span className="font-bold text-rose-600">{formatCurrency(profile.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Năm học & Kỳ:</span> 
                            <span className="font-medium text-gray-800">{profile.academicYear} • {profile.semester}</span>
                        </div>
                    </div>

                    <div>
                        <GradeClassSelector 
                            classesList={classesList}
                            selectedGrades={selectedGrades}
                            selectedClassIds={selectedClassIds}
                            onChange={({ targetGrades, targetClassIds }) => {
                                setSelectedGrades(targetGrades);
                                setSelectedClassIds(targetClassIds);
                            }}
                        />
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-800 flex items-start space-x-2">
                        <span className="font-bold">💡 Lưu ý:</span>
                        <span>Hệ thống sẽ tự động bỏ qua những học sinh đã có hóa đơn của đợt thu này trước đó để tránh tạo trùng lặp.</span>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                            Hủy bỏ
                        </button>
                        <button type="submit" className="btn-primary px-6 py-2.5">
                            Gán Ngay ({selectedClassIds.length} lớp)
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// --- Modal: In hóa đơn ---
const PrintBillModal = ({ isOpen, onClose, bill, className }) => {
    if (!isOpen || !bill) return null;

    const handlePrint = () => {
        const printContent = document.getElementById('print-area').innerHTML;
        const originalContent = document.body.innerHTML;
        document.body.innerHTML = printContent;
        window.print();
        document.body.innerHTML = originalContent;
        window.location.reload(); // reload to restore React bindings
    };

    const studentName = bill.student?.fullName || bill.fullName || 'Học sinh';
    const studentCode = bill.student?.studentCode || bill.studentCode || '';
    const classDisplay = className || bill.student?.class?.className || 'Chưa xếp lớp';

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-800">
                        In Hóa Đơn
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    <div id="print-area" className="p-8 border border-gray-200 rounded-xl bg-white text-gray-800">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold uppercase">Trường THPT EduManager</h2>
                            <p className="text-sm text-gray-500">Phòng Tài Vụ - Kế Toán</p>
                        </div>
                        
                        <h3 className="text-xl font-bold text-center uppercase mb-6 pb-4 border-b border-gray-200">
                            Biên lai thu tiền học phí
                        </h3>
                        
                        <div className="space-y-4 text-base">
                            <div className="flex justify-between">
                                <span className="font-semibold">Họ tên học sinh:</span>
                                <span>{studentName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-semibold">Mã học sinh:</span>
                                <span>{studentCode}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-semibold">Lớp:</span>
                                <span>{classDisplay}</span>
                            </div>
                            <div className="flex justify-between mt-4 pt-4 border-t border-gray-100">
                                <span className="font-semibold">Khoản thu:</span>
                                <span>{bill.feeProfile?.name || 'Học phí'}</span>
                            </div>
                            <div className="flex justify-between text-lg">
                                <span className="font-bold">Số tiền:</span>
                                <span className="font-bold text-rose-600">{formatCurrency(bill.feeProfile?.amount || 0)}</span>
                            </div>
                            <div className="flex justify-between mt-4 text-sm text-gray-500">
                                <span>Trạng thái: {bill.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</span>
                                <span>Ngày in: {new Date().toLocaleDateString('vi-VN')}</span>
                            </div>
                        </div>
                        
                        <div className="mt-12 flex justify-between px-8 text-center">
                            <div>
                                <p className="font-semibold mb-12">Người nộp tiền</p>
                                <p className="text-sm text-gray-500">(Ký, ghi rõ họ tên)</p>
                            </div>
                            <div>
                                <p className="font-semibold mb-12">Người thu tiền</p>
                                <p className="text-sm text-gray-500">(Ký, ghi rõ họ tên)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                    <button onClick={handlePrint} className="btn-primary flex items-center px-6 py-2.5">
                        <Printer size={18} className="mr-2" /> In Hóa Đơn ngay
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// --- Modal: Danh sách học sinh nợ học phí theo Lớp ---
const DebtorsModal = ({ isOpen, onClose, className, debtorsList, onPay, onPrint, loading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-800">
                        Danh sách nợ học phí - Lớp {className}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Đang tải dữ liệu...</div>
                    ) : debtorsList.length === 0 ? (
                        <div className="text-center py-8 text-emerald-600 font-medium bg-emerald-50 rounded-xl">Lớp này không có học sinh nào nợ học phí! 🎉</div>
                    ) : (
                        <div className="overflow-x-auto border border-gray-100 rounded-xl">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-gray-700 font-medium">
                                    <tr>
                                        <th className="px-4 py-3 border-b border-gray-100">Mã HS</th>
                                        <th className="px-4 py-3 border-b border-gray-100">Họ và tên</th>
                                        <th className="px-4 py-3 border-b border-gray-100">Khoản thu</th>
                                        <th className="px-4 py-3 border-b border-gray-100">Số tiền nợ</th>
                                        <th className="px-4 py-3 border-b border-gray-100 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {debtorsList.map(bill => (
                                        <tr key={bill.id} className="border-b border-gray-50 hover:bg-blue-50/30">
                                            <td className="px-4 py-3 font-medium text-gray-800">{bill.student.studentCode}</td>
                                            <td className="px-4 py-3 font-medium">{bill.student.fullName}</td>
                                            <td className="px-4 py-3 text-gray-500">{bill.feeProfile.name}</td>
                                            <td className="px-4 py-3 font-semibold text-rose-600">{formatCurrency(bill.feeProfile.amount)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button 
                                                        onClick={() => onPrint(bill, className)} 
                                                        className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors"
                                                    >
                                                        <Printer size={16} className="mr-1" />
                                                        In Bill
                                                    </button>
                                                    <button 
                                                        onClick={() => onPay(bill.id, bill.student.fullName)} 
                                                        className="inline-flex items-center px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-xs font-medium transition-colors"
                                                    >
                                                        <CheckCircle size={16} className="mr-1" />
                                                        Đã nộp tiền
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

// --- Modal: Tra cứu học phí học sinh theo Mã / Tên ---
const StudentFeeLookupModal = ({ isOpen, onClose, searchKeyword, onSearch, students, loading, onPay, onPrint, onViewDetail }) => {
    const [inputKeyword, setInputKeyword] = useState('');

    useEffect(() => {
        if (isOpen) {
            setInputKeyword(searchKeyword || '');
        }
    }, [isOpen, searchKeyword]);

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (inputKeyword.trim()) {
            onSearch(inputKeyword.trim());
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                            <Search size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Tra Cứu Học Phí Học Sinh</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Kiểm tra chi tiết tình trạng đóng tiền, công nợ và gạch nợ học phí</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Search Bar inside Modal */}
                    <form onSubmit={handleFormSubmit} className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text"
                                value={inputKeyword}
                                onChange={(e) => setInputKeyword(e.target.value)}
                                placeholder="Nhập Mã học sinh (Số báo danh VD: HS001) hoặc Họ và tên..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-2xs"
                            />
                        </div>
                        <button type="submit" className="btn-primary px-6 py-2.5 text-sm font-semibold flex items-center cursor-pointer">
                            Tìm kiếm
                        </button>
                    </form>

                    {loading ? (
                        <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                            <span>Đang tìm kiếm thông tin học sinh...</span>
                        </div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100 text-gray-500">
                            <Search size={36} className="mx-auto mb-2 text-gray-300" />
                            <p className="font-semibold text-gray-700">Không tìm thấy học sinh nào phù hợp</p>
                            <p className="text-xs text-gray-400 mt-1">Vui lòng kiểm tra lại Mã học sinh (Số báo danh) hoặc Họ tên vừa nhập</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {students.map((st) => {
                                const totalAmount = (st.feeBills || []).reduce((sum, b) => sum + (b.feeProfile?.amount || 0), 0);
                                const paidAmount = (st.feeBills || []).filter(b => b.status === 'paid').reduce((sum, b) => sum + (b.feeProfile?.amount || 0), 0);
                                const unpaidAmount = totalAmount - paidAmount;

                                return (
                                    <div key={st.id} className="border border-gray-200 rounded-2xl p-5 shadow-2xs bg-white space-y-4">
                                        {/* Student Info Header */}
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-100">
                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <h3 
                                                        onClick={() => {
                                                            if (onViewDetail) {
                                                                onClose();
                                                                onViewDetail(st);
                                                            }
                                                        }}
                                                        className="text-lg font-bold text-gray-900 hover:text-blue-600 cursor-pointer transition-colors"
                                                        title="Xem hồ sơ chi tiết"
                                                    >
                                                        {st.fullName}
                                                    </h3>
                                                    <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                                                        SBD: {st.studentCode}
                                                    </span>
                                                    <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                                                        Lớp: {st.class?.className || 'Chưa xếp lớp'}
                                                    </span>
                                                </div>
                                                {st.parentPhone && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        SĐT Phụ huynh: <span className="font-medium text-gray-700">{st.parentPhone}</span>
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                                                {onViewDetail && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onClose();
                                                            onViewDetail(st);
                                                        }}
                                                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <Eye size={13} /> Xem chi tiết
                                                    </button>
                                                )}
                                                <span className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg">
                                                    Tổng: {formatCurrency(totalAmount)}
                                                </span>
                                                <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg">
                                                    Đã thu: {formatCurrency(paidAmount)}
                                                </span>
                                                {unpaidAmount > 0 ? (
                                                    <span className="bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg font-bold animate-pulse">
                                                        Còn nợ: {formatCurrency(unpaidAmount)}
                                                    </span>
                                                ) : (
                                                    <span className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg">
                                                        Đã đóng đủ ✨
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Fee Bills List */}
                                        {(!st.feeBills || st.feeBills.length === 0) ? (
                                            <p className="text-xs text-gray-400 italic py-2">Học sinh chưa có đợt thu học phí nào được gán trong kỳ này.</p>
                                        ) : (
                                            <div className="overflow-x-auto border border-gray-100 rounded-xl">
                                                <table className="w-full text-left text-xs text-gray-600">
                                                    <thead className="bg-gray-50 text-gray-700 font-semibold">
                                                        <tr>
                                                            <th className="px-4 py-2.5">Tên đợt thu</th>
                                                            <th className="px-4 py-2.5">Số tiền</th>
                                                            <th className="px-4 py-2.5">Trạng thái</th>
                                                            <th className="px-4 py-2.5">Ngày nộp</th>
                                                            <th className="px-4 py-2.5 text-right">Thao tác</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {st.feeBills.map((bill) => (
                                                            <tr key={bill.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                                                <td className="px-4 py-3 font-medium text-gray-800">{bill.feeProfile?.name}</td>
                                                                <td className="px-4 py-3 font-bold text-gray-900">{formatCurrency(bill.feeProfile?.amount)}</td>
                                                                <td className="px-4 py-3">
                                                                    {bill.status === 'paid' ? (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                                            <CheckCircle size={12} className="mr-1" /> Đã nộp tiền
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                                                                            Chưa nộp tiền
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-500">
                                                                    {bill.paidAt ? new Date(bill.paidAt).toLocaleDateString('vi-VN') : '—'}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <div className="flex items-center justify-end space-x-2">
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => onPrint({ ...bill, student: st }, st.class?.className)}
                                                                            className="inline-flex items-center px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                                                                        >
                                                                            <Printer size={14} className="mr-1" /> In biên lai
                                                                        </button>
                                                                        {bill.status !== 'paid' && (
                                                                            <button 
                                                                                type="button"
                                                                                onClick={() => onPay(bill.id, st.fullName)}
                                                                                className="inline-flex items-center px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-xs font-bold transition-colors"
                                                                            >
                                                                                <CheckCircle size={14} className="mr-1" /> Đã nộp tiền
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

// --- Modal: Chi tiết hồ sơ học phí của một học sinh ---
const StudentFeeDetailModal = ({ isOpen, onClose, student, onPayBill, onPayAll, onPrintBill }) => {
    if (!isOpen || !student) return null;

    const bills = student.feeBills || [];
    const getBillAmount = (b) => (b.finalAmount !== null && b.finalAmount !== undefined) ? b.finalAmount : (b.feeProfile?.amount || 0);
    const totalAmount = student.studentTotal !== undefined ? student.studentTotal : bills.reduce((sum, b) => sum + getBillAmount(b), 0);
    const paidAmount = student.studentPaid !== undefined ? student.studentPaid : bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + getBillAmount(b), 0);
    const unpaidAmount = student.studentUnpaid !== undefined ? student.studentUnpaid : (totalAmount - paidAmount);
    const className = student.class?.className || 'Chưa xếp lớp';

    const getInitials = (name) => {
        if (!name) return 'HS';
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-100"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-xl shadow-md shadow-blue-500/20 shrink-0">
                            {getInitials(student.fullName)}
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-black text-gray-900">{student.fullName}</h2>
                                <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                    SBD: {student.studentCode}
                                </span>
                                <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                    Lớp: {className}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1.5">
                                {student.parentPhone && (
                                    <span>SĐT Phụ huynh: <strong className="text-gray-700">{student.parentPhone}</strong></span>
                                )}
                                {student.class?.homeroomTeacher?.fullName && (
                                    <span>• GVCN: <strong className="text-gray-700">{student.class.homeroomTeacher.fullName}</strong></span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Policy Banner if active */}
                {student.policies && student.policies.length > 0 && (
                    <div className="mx-6 mt-4 p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
                        <div className="flex items-center space-x-2.5 text-xs text-purple-900 font-medium">
                            <ShieldCheck size={20} className="text-purple-600 shrink-0" />
                            <div>
                                <span className="font-bold">Chính sách ưu tiên: </span>
                                <span className="text-purple-700 font-black">
                                    {student.policies.map(p => `${p.policyName} (-${Math.round((p.discountRate || 0) * 100)}%)`).join(', ')}
                                </span>
                                {student.policies[0]?.documentNumber && (
                                    <span className="ml-2 text-gray-500 font-normal">
                                        (Số hồ sơ/QĐ: <strong>{student.policies[0].documentNumber}</strong>)
                                    </span>
                                )}
                            </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-3xs font-black bg-purple-200 text-purple-800 uppercase tracking-wide shrink-0">
                            Đã liên kết an sinh ✨
                        </span>
                    </div>
                )}

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Financial Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-100">
                            <p className="text-2xs font-bold text-blue-600 uppercase tracking-wider">Tổng Phải Đóng</p>
                            <p className="text-xl font-black text-blue-900 mt-1">{formatCurrency(totalAmount)}</p>
                            <p className="text-2xs text-blue-500 mt-0.5">Tất cả khoản thu trong kỳ</p>
                        </div>
                        <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-100">
                            <p className="text-2xs font-bold text-emerald-600 uppercase tracking-wider">Đã Thanh Toán</p>
                            <p className="text-xl font-black text-emerald-800 mt-1">{formatCurrency(paidAmount)}</p>
                            <p className="text-2xs text-emerald-600 mt-0.5">{bills.filter(b => b.status === 'paid').length}/{bills.length} khoản đã nộp</p>
                        </div>
                        <div className={`p-4 rounded-xl border ${unpaidAmount > 0 ? 'bg-rose-50/80 border-rose-100' : 'bg-gray-50 border-gray-100'}`}>
                            <p className={`text-2xs font-bold uppercase tracking-wider ${unpaidAmount > 0 ? 'text-rose-600' : 'text-gray-500'}`}>Còn Nợ</p>
                            <p className={`text-xl font-black mt-1 ${unpaidAmount > 0 ? 'text-rose-700' : 'text-gray-800'}`}>{formatCurrency(unpaidAmount)}</p>
                            <p className={`text-2xs mt-0.5 ${unpaidAmount > 0 ? 'text-rose-500 font-semibold' : 'text-gray-400'}`}>
                                {unpaidAmount > 0 ? 'Chưa hoàn thành công nợ' : 'Đã hoàn tất 100% ✨'}
                            </p>
                        </div>
                    </div>

                    {/* Fee Bills Table */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                                <DollarSign size={16} className="text-blue-600" />
                                Danh Sách Khoản Thu Chi Tiết ({bills.length})
                            </h3>
                            {unpaidAmount > 0 && onPayAll && (
                                <button
                                    onClick={() => onPayAll(student.id, student.fullName)}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                                >
                                    <CheckCircle size={14} /> Thu tất cả ({formatCurrency(unpaidAmount)})
                                </button>
                            )}
                        </div>

                        {bills.length === 0 ? (
                            <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100 text-gray-400 text-xs">
                                Học sinh chưa có đợt thu học phí nào được gán trong kỳ này.
                            </div>
                        ) : (
                            <div className="border border-gray-100 rounded-xl overflow-hidden shadow-2xs">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50/90 text-gray-700 font-bold border-b border-gray-100 uppercase tracking-wider text-2xs">
                                        <tr>
                                            <th className="px-4 py-3">Khoản thu</th>
                                            <th className="px-4 py-3">Học kỳ / Năm học</th>
                                            <th className="px-4 py-3 text-right">Số tiền</th>
                                            <th className="px-4 py-3 text-center">Trạng thái</th>
                                            <th className="px-4 py-3">Ngày nộp</th>
                                            <th className="px-4 py-3 text-right">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {bills.map((b, idx) => (
                                            <tr key={b.id || `detail-bill-${idx}`} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="px-4 py-3 font-semibold text-gray-800">
                                                    {b.feeProfile?.name || 'Khoản thu'}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500">
                                                    {b.feeProfile?.semester || '—'} {b.feeProfile?.academicYear ? `(${b.feeProfile.academicYear})` : ''}
                                                </td>
                                                <td className="px-4 py-3 font-bold text-gray-900 text-right">
                                                    {b.discountAmount > 0 ? (
                                                        <div>
                                                            <span className="line-through text-gray-400 text-3xs block font-normal">
                                                                {formatCurrency(b.originalAmount || b.feeProfile?.amount || 0)}
                                                            </span>
                                                            <span className="text-purple-700 font-bold">
                                                                {formatCurrency(getBillAmount(b))}
                                                            </span>
                                                            <span className="text-[10px] text-purple-600 block font-semibold">
                                                                (Đã giảm {formatCurrency(b.discountAmount)})
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        formatCurrency(getBillAmount(b))
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {b.status === 'paid' ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800">
                                                            <CheckCircle size={10} className="mr-1" /> Đã nộp
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold bg-rose-100 text-rose-800">
                                                            Chưa nộp
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500">
                                                    {b.paidAt ? new Date(b.paidAt).toLocaleDateString('vi-VN') : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end space-x-1.5">
                                                        <button
                                                            onClick={() => onPrintBill({ ...b, student }, className)}
                                                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium text-2xs transition-colors inline-flex items-center"
                                                        >
                                                            <Printer size={12} className="mr-1" /> In Bill
                                                        </button>
                                                        {b.status !== 'paid' && onPayBill && (
                                                            <button
                                                                onClick={() => onPayBill(b.id, student.fullName)}
                                                                className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md font-bold text-2xs transition-colors inline-flex items-center"
                                                            >
                                                                <CheckCircle size={12} className="mr-1" /> Thu tiền
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/60 flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                        {unpaidAmount > 0 ? (
                            <span className="text-rose-600 font-semibold">
                                Cần thu thêm: {formatCurrency(unpaidAmount)}
                            </span>
                        ) : (
                            <span className="text-emerald-700 font-bold">
                                Học sinh đã hoàn tất đầy đủ nghĩa vụ học phí
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// --- Main Component ---
const Tuition = () => {
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'classTracking'
    const [summary, setSummary] = useState(null);
    const [profiles, setProfiles] = useState([]);
    const [classesList, setClassesList] = useState([]);
    
    const [filterYear, setFilterYear] = useState('2026-2027');
    const [filterSemester, setFilterSemester] = useState('HK1');
    const [loading, setLoading] = useState(true);

    // Class tracking tab states
    const [classViewMode, setClassViewMode] = useState('byClass'); // 'byClass' | 'byStudent'
    const [selectedGradeFilter, setSelectedGradeFilter] = useState('all');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [classTuitionData, setClassTuitionData] = useState(null);
    const [classTuitionLoading, setClassTuitionLoading] = useState(false);
    const [studentStatusFilter, setStudentStatusFilter] = useState('all'); // 'all' | 'unpaid' | 'paid'
    const [studentNameSearch, setStudentNameSearch] = useState('');

    // Student Detail Modal States
    const [selectedStudentForDetail, setSelectedStudentForDetail] = useState(null);
    const [isStudentDetailOpen, setIsStudentDetailOpen] = useState(false);

    // Global student search states (for 'byStudent' mode)
    const [studentGlobalQuery, setStudentGlobalQuery] = useState('');
    const [studentGlobalResults, setStudentGlobalResults] = useState([]);
    const [studentGlobalLoading, setStudentGlobalLoading] = useState(false);
    const [studentGlobalFilter, setStudentGlobalFilter] = useState('all'); // 'all' | 'unpaid' | 'paid'
    
    // Modal states
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [profileToAssign, setProfileToAssign] = useState(null);
    
    // Debtors Modal States
    const [isDebtorsModalOpen, setIsDebtorsModalOpen] = useState(false);
    const [selectedDebtorClass, setSelectedDebtorClass] = useState('');
    const [debtorsList, setDebtorsList] = useState([]);
    const [debtorsLoading, setDebtorsLoading] = useState(false);

    // Search & Lookup Student States
    const [searchStudentInput, setSearchStudentInput] = useState('');
    const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
    const [lookupStudents, setLookupStudents] = useState([]);
    const [lookupLoading, setLookupLoading] = useState(false);

    // Print Modal
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [selectedBillToPrint, setSelectedBillToPrint] = useState(null);
    const [selectedPrintClass, setSelectedPrintClass] = useState('');

    // Policy Engine States
    const [policiesList, setPoliciesList] = useState([]);
    const [policiesLoading, setPoliciesLoading] = useState(false);
    const [isAddPolicyModalOpen, setIsAddPolicyModalOpen] = useState(false);
    const [allStudentsList, setAllStudentsList] = useState([]);
    const [policyStudentSearch, setPolicyStudentSearch] = useState('');
    const [policyClassFilter, setPolicyClassFilter] = useState('all');
    const [newPolicyData, setNewPolicyData] = useState({
        studentId: '',
        policyType: 'MARTYR_CHILD',
        policyName: 'Con thương binh, liệt sĩ',
        discountRate: 1.0,
        documentNumber: '',
        documentExpiryDate: '',
        notes: ''
    });

    const fetchStudentPolicies = async () => {
        try {
            setPoliciesLoading(true);
            const [polRes, stRes] = await Promise.all([
                api.get('/policies'),
                api.get('/students?limit=500')
            ]);
            setPoliciesList(polRes.data?.data || []);
            // API /students returns array directly
            const rawStudents = Array.isArray(stRes.data) 
                ? stRes.data 
                : (stRes.data?.data || stRes.data?.students || []);
            setAllStudentsList(rawStudents);
        } catch (err) {
            console.error('Lỗi tải danh sách chính sách:', err);
        } finally {
            setPoliciesLoading(false);
        }
    };

    const handleDeletePolicy = async (policyId) => {
        const confirm = await Swal.fire({
            title: 'Xóa chính sách',
            text: 'Bạn có chắc chắn muốn hủy áp dụng chính sách ưu đãi này? Công nợ học sinh sẽ được tính toán lại.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Đồng ý xóa',
            cancelButtonText: 'Hủy'
        });
        if (confirm.isConfirmed) {
            try {
                await api.delete(`/policies/${policyId}`);
                Swal.fire('Thành công', 'Đã xóa chính sách thành công và tự động hoàn nguyên công nợ', 'success');
                fetchStudentPolicies();
                fetchData();
                if (selectedClassId) {
                    fetchClassTuition(selectedClassId);
                }
            } catch (e) {
                Swal.fire('Lỗi', 'Không thể xóa chính sách', 'error');
            }
        }
    };

    const handleCreatePolicy = async (e) => {
        e.preventDefault();
        if (!newPolicyData.studentId) {
            Swal.fire('Cảnh báo', 'Vui lòng chọn học sinh áp dụng chính sách', 'warning');
            return;
        }
        try {
            await api.post('/policies', newPolicyData);
            Swal.fire('Thành công', 'Đã thêm chính sách miễn giảm cho học sinh thành công và đã tự động khấu trừ công nợ!', 'success');
            setIsAddPolicyModalOpen(false);
            setNewPolicyData({
                studentId: '',
                policyType: 'MARTYR_CHILD',
                policyName: 'Con thương binh, liệt sĩ',
                discountRate: 1.0,
                documentNumber: '',
                documentExpiryDate: '',
                notes: ''
            });
            fetchStudentPolicies();
            fetchData();
            if (selectedClassId) {
                fetchClassTuition(selectedClassId);
            }
        } catch (err) {
            Swal.fire('Lỗi', err.response?.data?.message || 'Có lỗi khi tạo chính sách', 'error');
        }
    };

    const navigate = useNavigate();
    const currentUserRole = (localStorage.getItem('userRole') || '').toLowerCase();

    useEffect(() => {
        if (currentUserRole === 'student') {
            navigate('/student/tuition', { replace: true });
        }
    }, [currentUserRole, navigate]);

    useEffect(() => {
        if (currentUserRole === 'student') return;
        fetchData();
        fetchClasses();
        fetchStudentPolicies();
    }, [filterYear, filterSemester, currentUserRole]);

    useEffect(() => {
        if (currentUserRole === 'student') return;
        if (activeTab === 'classTracking' && selectedClassId) {
            fetchClassTuition(selectedClassId);
        }
    }, [selectedClassId, filterYear, filterSemester, activeTab, currentUserRole]);

    const fetchData = async () => {
        if (currentUserRole === 'student') return;
        try {
            setLoading(true);
            const [summaryRes, profilesRes] = await Promise.all([
                api.get(`/tuition/dashboard-summary?academicYear=${filterYear}&semester=${filterSemester}`),
                api.get(`/fee-profiles?academicYear=${filterYear}&semester=${filterSemester}`)
            ]);
            setSummary(summaryRes.data.data);
            setProfiles(profilesRes.data.data);
        } catch (error) {
            console.error('Error fetching tuition data:', error);
            Swal.fire('Lỗi', 'Không thể tải dữ liệu học phí', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchClasses = async () => {
        try {
            const res = await api.get('/classes');
            setClassesList(res.data);
            if (res.data && res.data.length > 0 && !selectedClassId) {
                setSelectedClassId(res.data[0].id);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchClassTuition = async (classId) => {
        if (!classId) return;
        try {
            setClassTuitionLoading(true);
            const res = await api.get(`/tuition/class-students/${classId}?academicYear=${filterYear}&semester=${filterSemester}`);
            setClassTuitionData(res.data?.data || null);
        } catch (err) {
            console.error('Error fetching class tuition:', err);
        } finally {
            setClassTuitionLoading(false);
        }
    };

    // Form handlers
    const handleAddProfile = () => {
        setSelectedProfile(null);
        setIsProfileModalOpen(true);
    };

    const handleEditProfile = (profile) => {
        setSelectedProfile(profile);
        setIsProfileModalOpen(true);
    };

    const handleProfileSubmit = async (formData) => {
        try {
            if (selectedProfile) {
                await api.put(`/fee-profiles/${selectedProfile.id}`, formData);
                Swal.fire('Thành công', 'Cập nhật đợt thu thành công', 'success');
            } else {
                await api.post('/fee-profiles', formData);
                Swal.fire('Thành công', 'Tạo đợt thu mới thành công', 'success');
            }
            setIsProfileModalOpen(false);
            fetchData();
        } catch (err) {
            Swal.fire('Lỗi', err.response?.data?.message || 'Có lỗi xảy ra', 'error');
        }
    };

    const handleAssign = (profile) => {
        setProfileToAssign(profile);
        setIsAssignModalOpen(true);
    };

    const handleAssignSubmit = async (data) => {
        try {
            const res = await api.post('/fee-profiles/assign', data);
            Swal.fire('Thành công', res.data.message || 'Đã gán học phí thành công', 'success');
            setIsAssignModalOpen(false);
            fetchData();
            if (selectedClassId) fetchClassTuition(selectedClassId);
        } catch (err) {
            Swal.fire('Lỗi', err.response?.data?.message || 'Có lỗi xảy ra', 'error');
        }
    };

    const handleViewDebtors = async (className) => {
        setSelectedDebtorClass(className);
        setIsDebtorsModalOpen(true);
        setDebtorsLoading(true);
        try {
            const res = await api.get(`/tuition/debtors/${className}?academicYear=${filterYear}&semester=${filterSemester}`);
            setDebtorsList(res.data.data);
        } catch (err) {
            console.error(err);
            Swal.fire('Lỗi', 'Không thể tải danh sách nợ', 'error');
        } finally {
            setDebtorsLoading(false);
        }
    };

    const handleLookupStudent = async (keyword) => {
        if (!keyword || !keyword.trim()) {
            Swal.fire('Nhắc nhở', 'Vui lòng nhập Mã học sinh hoặc Họ tên để tra cứu', 'info');
            return;
        }
        setIsLookupModalOpen(true);
        setLookupLoading(true);
        try {
            const res = await api.get(`/tuition/lookup?search=${encodeURIComponent(keyword.trim())}&academicYear=${filterYear}&semester=${filterSemester}`);
            setLookupStudents(res.data?.data || []);
        } catch (err) {
            console.error(err);
            Swal.fire('Lỗi', err.response?.data?.message || 'Không thể tra cứu học phí', 'error');
        } finally {
            setLookupLoading(false);
        }
    };

    const handleOpenStudentDetail = (student) => {
        setSelectedStudentForDetail(student);
        setIsStudentDetailOpen(true);
    };

    const handleStudentGlobalSearch = async (keyword) => {
        if (!keyword || !keyword.trim()) return;
        setStudentGlobalLoading(true);
        try {
            const res = await api.get(`/tuition/lookup?search=${encodeURIComponent(keyword.trim())}&academicYear=${filterYear}&semester=${filterSemester}`);
            setStudentGlobalResults(res.data?.data || []);
        } catch (err) {
            console.error('Error searching students globally:', err);
            Swal.fire('Lỗi', 'Không thể tìm kiếm học sinh', 'error');
        } finally {
            setStudentGlobalLoading(false);
        }
    };

    const handlePrintBill = (bill, className) => {
        setSelectedBillToPrint(bill);
        setSelectedPrintClass(className || '');
        setIsPrintModalOpen(true);
    };

    const handlePayBill = async (billId, studentName) => {
        const result = await Swal.fire({
            title: 'Xác nhận thu tiền',
            text: `Xác nhận học sinh ${studentName} đã nộp khoản học phí này?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/tuition/bills/${billId}/pay`);
                Swal.fire('Thành công', 'Đã gạch nợ thành công', 'success');
                
                // Cập nhật selectedStudentForDetail nếu đang mở
                setSelectedStudentForDetail(prev => {
                    if (!prev) return null;
                    const updatedBills = (prev.feeBills || []).map(b => b.id === billId ? { ...b, status: 'paid', paidAt: new Date().toISOString() } : b);
                    const getAmount = (b) => (b.finalAmount !== null && b.finalAmount !== undefined) ? b.finalAmount : (b.feeProfile?.amount || 0);
                    const studentTotal = updatedBills.reduce((sum, b) => sum + getAmount(b), 0);
                    const studentPaid = updatedBills.filter(b => b.status === 'paid').reduce((sum, b) => sum + getAmount(b), 0);
                    const studentUnpaid = studentTotal - studentPaid;
                    return {
                        ...prev,
                        feeBills: updatedBills,
                        studentTotal,
                        studentPaid,
                        studentUnpaid,
                        paymentStatus: studentUnpaid === 0 ? 'fully_paid' : 'partial_paid'
                    };
                });

                // Tải lại danh sách debtors, lookup nếu đang mở, danh sách theo lớp và dashboard summary
                if (selectedDebtorClass) {
                    handleViewDebtors(selectedDebtorClass);
                }
                if (searchStudentInput) {
                    handleLookupStudent(searchStudentInput);
                }
                if (studentGlobalQuery) {
                    handleStudentGlobalSearch(studentGlobalQuery);
                }
                if (selectedClassId) {
                    fetchClassTuition(selectedClassId);
                }
                fetchData();
            } catch (err) {
                Swal.fire('Lỗi', 'Có lỗi khi cập nhật thanh toán', 'error');
            }
        }
    };

    const handlePayAllStudentBills = async (studentId, studentName) => {
        const result = await Swal.fire({
            title: 'Thu tất cả khoản nợ',
            text: `Xác nhận học sinh ${studentName} đã nộp đầy đủ tất cả các khoản học phí còn nợ trong kỳ này?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Xác nhận thu đủ',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            try {
                const res = await api.patch(`/tuition/students/${studentId}/pay-all`, {
                    academicYear: filterYear,
                    semester: filterSemester
                });
                Swal.fire('Thành công', res.data?.message || 'Đã gạch nợ thành công', 'success');

                // Cập nhật selectedStudentForDetail nếu đang mở
                setSelectedStudentForDetail(prev => {
                    if (!prev || prev.id !== studentId) return prev;
                    const updatedBills = (prev.feeBills || []).map(b => ({ ...b, status: 'paid', paidAt: new Date().toISOString() }));
                    const getAmount = (b) => (b.finalAmount !== null && b.finalAmount !== undefined) ? b.finalAmount : (b.feeProfile?.amount || 0);
                    const studentTotal = updatedBills.reduce((sum, b) => sum + getAmount(b), 0);
                    return {
                        ...prev,
                        feeBills: updatedBills,
                        studentPaid: studentTotal,
                        studentUnpaid: 0,
                        paymentStatus: 'fully_paid'
                    };
                });

                if (selectedClassId) fetchClassTuition(selectedClassId);
                if (studentGlobalQuery) handleStudentGlobalSearch(studentGlobalQuery);
                fetchData();
            } catch (err) {
                Swal.fire('Lỗi', 'Có lỗi khi cập nhật thanh toán', 'error');
            }
        }
    };

    const filteredStudentsForPolicy = allStudentsList.filter(st => {
        if (policyClassFilter !== 'all' && st.classId !== policyClassFilter) return false;
        if (policyStudentSearch.trim()) {
            const kw = policyStudentSearch.trim().toLowerCase();
            const matchName = (st.fullName || '').toLowerCase().includes(kw);
            const matchCode = (st.studentCode || '').toLowerCase().includes(kw);
            return matchName || matchCode;
        }
        return true;
    });

    const selectedStudentForPolicy = allStudentsList.find(s => s.id === newPolicyData.studentId);

    return (
        <div className="space-y-6 font-poppins pb-10">
            {/* Header Title & Term Filters & Search Bar */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Quản lý Học phí</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Theo dõi công nợ, đợt thu và gạch nợ học phí học sinh</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {/* Quick Search Student */}
                    <form 
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleLookupStudent(searchStudentInput);
                        }} 
                        className="relative flex-1 sm:w-72"
                    >
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text"
                            value={searchStudentInput}
                            onChange={(e) => setSearchStudentInput(e.target.value)}
                            placeholder="Tra cứu Mã HS, Tên HS..."
                            className="w-full pl-10 pr-20 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                        />
                        <button 
                            type="submit" 
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition-colors"
                        >
                            Tra cứu
                        </button>
                    </form>

                    <div className="flex items-center space-x-2">
                        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">
                            <option value="2025-2026">2025-2026</option>
                            <option value="2026-2027">2026-2027</option>
                        </select>
                        <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">
                            <option value="HK1">Học kỳ 1</option>
                            <option value="HK2">Học kỳ 2</option>
                            <option value="Cả năm">Cả năm</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center space-x-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center space-x-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
                        activeTab === 'overview'
                            ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-xl'
                    }`}
                >
                    <DollarSign size={18} />
                    <span>Tổng Quan & Đợt Thu</span>
                </button>
                <button
                    onClick={() => {
                        setActiveTab('classTracking');
                        if (!selectedClassId && classesList.length > 0) {
                            setSelectedClassId(classesList[0].id);
                        }
                    }}
                    className={`flex items-center space-x-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
                        activeTab === 'classTracking'
                            ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-xl'
                    }`}
                >
                    <Users size={18} />
                    <span>Theo Dõi Học Phí Theo Lớp</span>
                    <span className="ml-1.5 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full font-bold">
                        {classesList.length} lớp
                    </span>
                </button>
                <button
                    onClick={() => {
                        setActiveTab('policies');
                        fetchStudentPolicies();
                    }}
                    className={`flex items-center space-x-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
                        activeTab === 'policies'
                            ? 'border-purple-600 text-purple-600 bg-purple-50/50 rounded-t-xl'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-xl'
                    }`}
                >
                    <ShieldCheck size={18} />
                    <span>Chính Sách Miễn Giảm (Policy Engine)</span>
                    <span className="ml-1.5 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full font-bold">
                        {policiesList.length}
                    </span>
                </button>
            </div>

            {/* TAB 1: TỔNG QUAN & ĐỢT THU */}
            {activeTab === 'overview' && (
                <>
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
                    ) : (
                        <>
                            {/* Dashboard Summary Cards */}
                            {summary && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                                        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><DollarSign size={24}/></div>
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Tổng thu dự kiến</p>
                                            <h3 className="text-xl font-bold text-gray-800">{formatCurrency(summary.Tong_Thu_Du_Kien)}</h3>
                                        </div>
                                    </motion.div>
                                    
                                    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.1}} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><Wallet size={24}/></div>
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Tổng đã thu</p>
                                            <h3 className="text-xl font-bold text-gray-800">{formatCurrency(summary.Tong_Da_Thu)}</h3>
                                        </div>
                                    </motion.div>

                                    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.2}} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                                        <div className="p-3 bg-rose-100 text-rose-600 rounded-xl"><CreditCard size={24}/></div>
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Tổng còn nợ</p>
                                            <h3 className="text-xl font-bold text-gray-800">{formatCurrency(summary.Tong_Con_No)}</h3>
                                        </div>
                                    </motion.div>

                                    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.3}} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                                        <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><PieChart size={24}/></div>
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Tỷ lệ hoàn thành</p>
                                            <h3 className="text-xl font-bold text-gray-800">{summary.Ty_Le_Hoan_Thanh}%</h3>
                                        </div>
                                    </motion.div>
                                </div>
                            )}

                            {/* Top Lớp nợ nhiều nhất */}
                            {summary?.Danh_Sach_Lop_Chua_Nop_Khieu?.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Users size={20} className="mr-2 text-rose-500"/> Top Lớp nợ học phí</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                        {summary.Danh_Sach_Lop_Chua_Nop_Khieu.map((c, idx) => (
                                            <div 
                                                key={idx} 
                                                onClick={() => handleViewDebtors(c.className)}
                                                className="bg-rose-50/50 rounded-xl p-4 border border-rose-100 flex flex-col justify-between cursor-pointer hover:bg-rose-100/60 hover:shadow-md transition-all group"
                                            >
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-bold text-gray-800 group-hover:text-rose-700 transition-colors">{c.className}</span>
                                                    <span className="bg-rose-100 text-rose-700 text-xs px-2 py-1 rounded font-medium">{c.soHocSinhNo} HS</span>
                                                </div>
                                                <p className="text-rose-600 font-semibold">{formatCurrency(c.tongNo)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Danh sách Đợt thu */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <h3 className="text-lg font-bold text-gray-800">Danh sách Đợt thu học phí</h3>
                                    <button onClick={handleAddProfile} className="btn-primary flex items-center px-4 py-2 text-sm">
                                        <Plus size={18} className="mr-2" /> Tạo đợt thu
                                    </button>
                                </div>
                                
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-gray-600">
                                        <thead className="bg-gray-50 text-gray-700 font-medium">
                                            <tr>
                                                <th className="px-6 py-4 border-b border-gray-100">Tên đợt thu</th>
                                                <th className="px-6 py-4 border-b border-gray-100">Số tiền</th>
                                                <th className="px-6 py-4 border-b border-gray-100">Phạm vi áp dụng (Khối / Lớp)</th>
                                                <th className="px-6 py-4 border-b border-gray-100 text-center">Đã gán (Hóa đơn)</th>
                                                <th className="px-6 py-4 border-b border-gray-100 text-right">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {profiles.length === 0 ? (
                                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Chưa có đợt thu học phí nào trong kỳ này.</td></tr>
                                            ) : profiles.map((p, pIdx) => (
                                                <tr key={p.id || `profile-${pIdx}`} className="hover:bg-blue-50/50 transition-colors border-b border-gray-50">
                                                    <td className="px-6 py-4 font-medium text-gray-800">{p.name}</td>
                                                    <td className="px-6 py-4 font-semibold text-blue-600">{formatCurrency(p.amount)}</td>
                                                    <td className="px-6 py-4">
                                                        {renderScopeBadges(p, classesList)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="bg-emerald-100 text-emerald-700 font-bold px-3 py-1 rounded-full">{p._count?.feeBills || 0}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex justify-end space-x-2">
                                                            <button onClick={() => handleAssign(p)} className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors">
                                                                Gán học sinh
                                                            </button>
                                                            <button onClick={() => handleEditProfile(p)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                                <Edit size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {/* TAB 2: THEO DÕI THEO LỚP & TRA CỨU HỌC SINH */}
            {activeTab === 'classTracking' && (
                <div className="space-y-6">
                    {/* View Switcher: Xem theo Lớp vs Tra cứu từng Học sinh */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3.5 rounded-2xl shadow-2xs border border-gray-100">
                        <div className="flex items-center space-x-1.5 p-1 bg-gray-100 rounded-xl border border-gray-200/60 shadow-inner">
                            <button
                                onClick={() => setClassViewMode('byClass')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    classViewMode === 'byClass'
                                        ? 'bg-white text-blue-700 shadow-xs'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <Users size={15} />
                                <span>Xem Theo Lớp Học</span>
                            </button>
                            <button
                                onClick={() => setClassViewMode('byStudent')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    classViewMode === 'byStudent'
                                        ? 'bg-white text-blue-700 shadow-xs'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <Search size={15} />
                                <span>Tra Cứu Từng Học Sinh (Tên / Số Báo Danh)</span>
                            </button>
                        </div>

                        <div className="text-xs text-gray-500 font-medium">
                            {classViewMode === 'byClass' ? (
                                <span>Đang lọc: <strong>Khối {selectedGradeFilter === 'all' ? 'Tất cả' : selectedGradeFilter}</strong> • <strong>Lớp {classTuitionData?.classInfo?.className || '—'}</strong></span>
                            ) : (
                                <span className="text-blue-600 font-semibold flex items-center gap-1">
                                    <Search size={14} /> Tra cứu học sinh toàn trường theo Họ tên hoặc SBD
                                </span>
                            )}
                        </div>
                    </div>

                    {/* CHẾ ĐỘ 1: XEM THEO LỚP */}
                    {classViewMode === 'byClass' && (
                        <div className="space-y-6">
                            {/* Filter Controls Bar */}
                            <div className="bg-white p-5 rounded-2xl shadow-2xs border border-gray-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    {/* Grade Filter */}
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs font-semibold text-gray-600">Khối:</span>
                                        <select 
                                            value={selectedGradeFilter} 
                                            onChange={(e) => {
                                                const newGrade = e.target.value;
                                                setSelectedGradeFilter(newGrade);
                                                const filtered = newGrade === 'all' 
                                                    ? classesList 
                                                    : classesList.filter(c => Number(c.grade) === Number(newGrade));
                                                if (filtered.length > 0) {
                                                    setSelectedClassId(filtered[0].id);
                                                }
                                            }}
                                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                        >
                                            <option value="all">Tất cả Khối</option>
                                            <option value="10">Khối 10</option>
                                            <option value="11">Khối 11</option>
                                            <option value="12">Khối 12</option>
                                        </select>
                                    </div>

                                    {/* Class Filter */}
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs font-semibold text-gray-600">Lớp:</span>
                                        <select 
                                            value={selectedClassId} 
                                            onChange={(e) => setSelectedClassId(e.target.value)}
                                            className="px-4 py-2 border border-blue-200 bg-blue-50/30 text-blue-900 font-bold rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 min-w-[130px]"
                                        >
                                            {(selectedGradeFilter === 'all' 
                                                ? classesList 
                                                : classesList.filter(c => Number(c.grade) === Number(selectedGradeFilter))
                                            ).map(c => (
                                                <option key={c.id} value={c.id}>
                                                    Lớp {c.className} (Khối {c.grade})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Search Student within class */}
                                <div className="relative min-w-[280px]">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input 
                                        type="text"
                                        value={studentNameSearch}
                                        onChange={(e) => setStudentNameSearch(e.target.value)}
                                        placeholder="Tìm theo Tên hoặc Số báo danh (Mã HS)..."
                                        className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-2xs"
                                    />
                                    {studentNameSearch && (
                                        <button 
                                            onClick={() => setStudentNameSearch('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                                            title="Xóa tìm kiếm"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Class Summary Banner */}
                            {classTuitionData && (
                                <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md">
                                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                        <div>
                                            <div className="flex items-center space-x-3">
                                                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
                                                    Khối {classTuitionData.classInfo?.grade}
                                                </span>
                                                <h2 className="text-2xl font-extrabold tracking-tight">
                                                    Lớp {classTuitionData.classInfo?.className}
                                                </h2>
                                            </div>
                                            <p className="text-blue-200 text-xs mt-1.5 flex items-center gap-2">
                                                <span>GVCN: <strong>{classTuitionData.classInfo?.homeroomTeacher?.fullName || 'Chưa phân công'}</strong></span>
                                                {classTuitionData.classInfo?.homeroomTeacher?.phone && (
                                                    <span>• SĐT: <strong>{classTuitionData.classInfo?.homeroomTeacher?.phone}</strong></span>
                                                )}
                                                <span>• Năm học: <strong>{filterYear} ({filterSemester})</strong></span>
                                            </p>
                                        </div>

                                        {/* 4 Mini Stat Badges */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
                                            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 text-center">
                                                <p className="text-2xs text-blue-200 uppercase font-semibold">Sĩ số</p>
                                                <p className="text-lg font-black text-white mt-0.5">{classTuitionData.stats?.totalStudents} HS</p>
                                            </div>
                                            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 text-center">
                                                <p className="text-2xs text-emerald-200 uppercase font-semibold">Đã hoàn thành</p>
                                                <p className="text-lg font-black text-emerald-300 mt-0.5">{classTuitionData.stats?.fullyPaidStudentsCount}/{classTuitionData.stats?.totalStudents} ({classTuitionData.stats?.completionRate}%)</p>
                                            </div>
                                            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 text-center">
                                                <p className="text-2xs text-blue-200 uppercase font-semibold">Tổng đã thu</p>
                                                <p className="text-lg font-black text-white mt-0.5">{formatCurrency(classTuitionData.stats?.totalPaidAmount)}</p>
                                            </div>
                                            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 text-center">
                                                <p className="text-2xs text-rose-200 uppercase font-semibold">Tổng còn nợ</p>
                                                <p className="text-lg font-black text-rose-300 mt-0.5">{formatCurrency(classTuitionData.stats?.totalUnpaidAmount)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Student Table & Status Filter */}
                            <div className="bg-white rounded-2xl shadow-2xs border border-gray-100 overflow-hidden flex flex-col">
                                {/* Table Filter Tabs */}
                                <div className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-3 bg-gray-50/50">
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => setStudentStatusFilter('all')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                                studentStatusFilter === 'all'
                                                    ? 'bg-blue-600 text-white shadow-2xs'
                                                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                                            }`}
                                        >
                                            Tất cả ({classTuitionData?.students?.length || 0})
                                        </button>
                                        <button
                                            onClick={() => setStudentStatusFilter('unpaid')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                                studentStatusFilter === 'unpaid'
                                                    ? 'bg-rose-600 text-white shadow-2xs'
                                                    : 'bg-white border border-gray-200 text-rose-700 hover:bg-rose-50'
                                            }`}
                                        >
                                            Còn nợ ({classTuitionData?.students?.filter(s => s.paymentStatus !== 'fully_paid').length || 0})
                                        </button>
                                        <button
                                            onClick={() => setStudentStatusFilter('paid')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                                studentStatusFilter === 'paid'
                                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                                    : 'bg-white border border-gray-200 text-emerald-700 hover:bg-emerald-50'
                                            }`}
                                        >
                                            Đã nộp đủ ({classTuitionData?.students?.filter(s => s.paymentStatus === 'fully_paid').length || 0})
                                        </button>
                                    </div>

                                    <div className="text-xs text-gray-500">
                                        Danh sách học sinh lớp <strong>{classTuitionData?.classInfo?.className}</strong>
                                    </div>
                                </div>

                                {/* Table Body */}
                                {classTuitionLoading ? (
                                    <div className="text-center py-16 text-gray-500 flex flex-col items-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                                        <span>Đang tải danh sách học sinh của lớp...</span>
                                    </div>
                                ) : !classTuitionData || classTuitionData.students.length === 0 ? (
                                    <div className="text-center py-16 text-gray-400">
                                        Lớp này chưa có học sinh nào trong hệ thống.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm text-gray-600">
                                            <thead className="bg-gray-50 text-gray-700 font-semibold text-xs uppercase">
                                                <tr>
                                                    <th className="px-5 py-3.5 border-b border-gray-100">Mã HS / SBD</th>
                                                    <th className="px-5 py-3.5 border-b border-gray-100">Họ và tên</th>
                                                    <th className="px-5 py-3.5 border-b border-gray-100">SĐT Phụ huynh</th>
                                                    <th className="px-5 py-3.5 border-b border-gray-100">Khoản thu chi tiết</th>
                                                    <th className="px-5 py-3.5 border-b border-gray-100 text-right">Tổng phải đóng</th>
                                                    <th className="px-5 py-3.5 border-b border-gray-100 text-right">Còn nợ</th>
                                                    <th className="px-5 py-3.5 border-b border-gray-100 text-center">Trạng thái</th>
                                                    <th className="px-5 py-3.5 border-b border-gray-100 text-right">Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 text-xs">
                                                {classTuitionData.students
                                                    .filter(st => {
                                                        if (studentStatusFilter === 'unpaid') return st.paymentStatus !== 'fully_paid';
                                                        if (studentStatusFilter === 'paid') return st.paymentStatus === 'fully_paid';
                                                        return true;
                                                    })
                                                    .filter(st => {
                                                        if (!studentNameSearch.trim()) return true;
                                                        const kw = studentNameSearch.toLowerCase();
                                                        return (
                                                            st.fullName.toLowerCase().includes(kw) ||
                                                            st.studentCode.toLowerCase().includes(kw)
                                                        );
                                                    })
                                                    .map((st) => (
                                                        <tr key={st.id} className="hover:bg-blue-50/30 transition-colors">
                                                            <td className="px-5 py-3.5 font-bold">
                                                                <button
                                                                    onClick={() => handleOpenStudentDetail(st)}
                                                                    className="text-blue-700 hover:text-blue-900 hover:underline font-bold text-left cursor-pointer transition-colors"
                                                                    title="Bấm để xem chi tiết học phí"
                                                                >
                                                                    {st.studentCode}
                                                                </button>
                                                            </td>
                                                            <td className="px-5 py-3.5 font-semibold">
                                                                <div className="flex flex-col items-start gap-1">
                                                                    <button
                                                                        onClick={() => handleOpenStudentDetail(st)}
                                                                        className="text-gray-900 hover:text-blue-600 hover:underline font-semibold text-left cursor-pointer transition-colors"
                                                                        title="Bấm để xem chi tiết học phí"
                                                                    >
                                                                        {st.fullName}
                                                                    </button>
                                                                    {st.policies && st.policies.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {st.policies.map((p, pIdx) => (
                                                                                <span 
                                                                                    key={p.id || `pol-badge-${pIdx}`} 
                                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200"
                                                                                    title={`Chính sách: ${p.policyName} - Giảm ${Math.round((p.discountRate || 0) * 100)}%`}
                                                                                >
                                                                                    <ShieldCheck size={11} /> {p.policyName} (-{Math.round((p.discountRate || 0) * 100)}%)
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-3.5 text-gray-600">{st.parentPhone || '—'}</td>
                                                            <td className="px-5 py-3.5">
                                                                <FeeBillsCell 
                                                                    feeBills={st.feeBills} 
                                                                    onViewDetail={() => handleOpenStudentDetail(st)}
                                                                />
                                                            </td>
                                                            <td className="px-5 py-3.5 font-semibold text-gray-800 text-right">
                                                                {formatCurrency(st.studentTotal)}
                                                            </td>
                                                            <td className="px-5 py-3.5 font-bold text-rose-600 text-right">
                                                                {formatCurrency(st.studentUnpaid)}
                                                            </td>
                                                            <td className="px-5 py-3.5 text-center">
                                                                {st.paymentStatus === 'fully_paid' ? (
                                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800">
                                                                        <CheckCircle size={12} className="mr-1" /> Đã nộp đủ
                                                                    </span>
                                                                ) : st.paymentStatus === 'partial_paid' ? (
                                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-2xs font-bold bg-amber-100 text-amber-800">
                                                                        Nộp 1 phần
                                                                    </span>
                                                                ) : st.paymentStatus === 'unpaid' ? (
                                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-2xs font-bold bg-rose-100 text-rose-800">
                                                                        Chưa nộp
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-400">Chưa gán</span>
                                                                )}
                                                            </td>
                                                            <td className="px-5 py-3.5 text-right">
                                                                <div className="flex items-center justify-end space-x-1.5">
                                                                    <button
                                                                        onClick={() => handleOpenStudentDetail(st)}
                                                                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-2xs font-bold transition-colors inline-flex items-center"
                                                                        title="Xem chi tiết hồ sơ học phí"
                                                                    >
                                                                        <Eye size={13} className="mr-1" /> Chi tiết
                                                                    </button>
                                                                    {st.feeBills?.length > 0 && (
                                                                        <button
                                                                            onClick={() => handlePrintBill({ ...st.feeBills[0], student: st }, classTuitionData.classInfo?.className)}
                                                                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-2xs font-medium transition-colors inline-flex items-center"
                                                                            title="In biên lai"
                                                                        >
                                                                            <Printer size={13} className="mr-1" /> In Bill
                                                                        </button>
                                                                    )}
                                                                    {st.studentUnpaid > 0 && (
                                                                        <button
                                                                            onClick={() => handlePayAllStudentBills(st.id, st.fullName)}
                                                                            className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md text-2xs font-bold transition-colors inline-flex items-center"
                                                                            title="Thu toàn bộ tiền còn nợ"
                                                                        >
                                                                            <CheckCircle size={13} className="mr-1" /> Thu tiền
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* CHẾ ĐỘ 2: TRA CỨU & XEM TỪNG HỌC SINH (TOÀN TRƯỜNG) */}
                    {classViewMode === 'byStudent' && (
                        <div className="bg-white p-6 rounded-2xl shadow-2xs border border-gray-100 space-y-6">
                            {/* Search Hero Box */}
                            <div className="max-w-2xl mx-auto text-center space-y-3 pt-2 pb-4">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mb-1">
                                    <Search size={24} />
                                </div>
                                <h3 className="text-xl font-extrabold text-gray-800">Tra Cứu & Xem Chi Tiết Học Phí Học Sinh</h3>
                                <p className="text-xs text-gray-500">
                                    Tìm kiếm học sinh theo <strong>Họ và tên</strong> hoặc <strong>Số báo danh (Mã học sinh)</strong> trên toàn bộ các khối lớp để xem chi tiết học phí, in hóa đơn hoặc gạch nợ.
                                </p>
                                <form 
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleStudentGlobalSearch(studentGlobalQuery);
                                    }}
                                    className="relative flex gap-2 pt-2"
                                >
                                    <div className="relative flex-1">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            value={studentGlobalQuery}
                                            onChange={(e) => {
                                                setStudentGlobalQuery(e.target.value);
                                                if (!e.target.value.trim()) {
                                                    setStudentGlobalResults([]);
                                                }
                                            }}
                                            placeholder="Nhập Họ tên hoặc Số báo danh (VD: HS001, Nguyễn Văn A...)"
                                            className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-2xs font-medium"
                                            autoFocus
                                        />
                                        {studentGlobalQuery && (
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setStudentGlobalQuery('');
                                                    setStudentGlobalResults([]);
                                                }}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                                title="Xóa tìm kiếm"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <button 
                                        type="submit" 
                                        disabled={studentGlobalLoading}
                                        className="btn-primary px-6 py-3 text-sm font-bold flex items-center shrink-0 cursor-pointer shadow-md"
                                    >
                                        {studentGlobalLoading ? (
                                            <span className="flex items-center gap-1.5">
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                Đang tìm...
                                            </span>
                                        ) : (
                                            'Tra cứu ngay'
                                        )}
                                    </button>
                                </form>
                            </div>

                            {/* Search Results Filter & Stats */}
                            {studentGlobalResults.length > 0 && (
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs font-semibold text-gray-500">Lọc kết quả:</span>
                                        <button
                                            onClick={() => setStudentGlobalFilter('all')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                                studentGlobalFilter === 'all' 
                                                    ? 'bg-blue-600 text-white shadow-2xs' 
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            Tất cả ({studentGlobalResults.length})
                                        </button>
                                        <button
                                            onClick={() => setStudentGlobalFilter('unpaid')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                                studentGlobalFilter === 'unpaid' 
                                                    ? 'bg-rose-600 text-white shadow-2xs' 
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            Còn nợ ({studentGlobalResults.filter(s => s.paymentStatus !== 'fully_paid').length})
                                        </button>
                                        <button
                                            onClick={() => setStudentGlobalFilter('paid')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                                studentGlobalFilter === 'paid' 
                                                    ? 'bg-emerald-600 text-white shadow-2xs' 
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            Đã nộp đủ ({studentGlobalResults.filter(s => s.paymentStatus === 'fully_paid').length})
                                        </button>
                                    </div>
                                    <span className="text-xs text-gray-400 font-medium">
                                        Tìm thấy <strong>{studentGlobalResults.length}</strong> học sinh phù hợp
                                    </span>
                                </div>
                            )}

                            {/* Results Display */}
                            {studentGlobalLoading ? (
                                <div className="text-center py-16 text-gray-500 flex flex-col items-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                                    <span className="text-sm font-medium">Đang tìm kiếm học sinh...</span>
                                </div>
                            ) : studentGlobalResults.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {studentGlobalResults
                                        .filter(st => {
                                            if (studentGlobalFilter === 'unpaid') return st.paymentStatus !== 'fully_paid';
                                            if (studentGlobalFilter === 'paid') return st.paymentStatus === 'fully_paid';
                                            return true;
                                        })
                                        .map((st) => {
                                            const total = st.studentTotal || 0;
                                            const paid = st.studentPaid || 0;
                                            const unpaid = st.studentUnpaid || 0;
                                            const className = st.class?.className || 'Chưa xếp lớp';

                                            return (
                                                <div 
                                                    key={st.id} 
                                                    className="border border-gray-200/80 rounded-2xl p-5 bg-white hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
                                                >
                                                    {/* Header Card */}
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                                                                {st.fullName ? st.fullName.split(' ').pop().slice(0, 2).toUpperCase() : 'HS'}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                                    {st.fullName}
                                                                </h4>
                                                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                                                    <span className="bg-blue-50 text-blue-700 text-2xs px-2 py-0.5 rounded-md font-bold border border-blue-100">
                                                                        SBD: {st.studentCode}
                                                                    </span>
                                                                    <span className="bg-purple-50 text-purple-700 text-2xs px-2 py-0.5 rounded-md font-bold border border-purple-100">
                                                                        Lớp: {className}
                                                                    </span>
                                                                    {st.policies && st.policies.length > 0 && (
                                                                        <span className="bg-purple-100 text-purple-800 text-3xs px-2 py-0.5 rounded-md font-black border border-purple-200 inline-flex items-center gap-1">
                                                                            <ShieldCheck size={10} /> {st.policies[0].policyName} (-{Math.round((st.policies[0].discountRate || 0) * 100)}%)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            {st.paymentStatus === 'fully_paid' ? (
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800">
                                                                    <CheckCircle size={11} className="mr-1" /> Đã nộp đủ
                                                                </span>
                                                            ) : st.paymentStatus === 'partial_paid' ? (
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-2xs font-bold bg-amber-100 text-amber-800">
                                                                    Nộp 1 phần
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-2xs font-bold bg-rose-100 text-rose-800">
                                                                    Chưa nộp
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Financial Info & Parent */}
                                                    <div className="grid grid-cols-3 gap-2 bg-gray-50/80 p-3 rounded-xl border border-gray-100 text-center">
                                                        <div>
                                                            <p className="text-2xs text-gray-500 font-semibold">Tổng phải nộp</p>
                                                            <p className="text-xs font-bold text-gray-800 mt-0.5">{formatCurrency(total)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-2xs text-emerald-600 font-semibold">Đã thanh toán</p>
                                                            <p className="text-xs font-bold text-emerald-700 mt-0.5">{formatCurrency(paid)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-2xs text-rose-600 font-semibold">Còn nợ</p>
                                                            <p className="text-xs font-bold text-rose-700 mt-0.5">{formatCurrency(unpaid)}</p>
                                                        </div>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                                                        <span className="text-2xs text-gray-400">
                                                            {st.feeBills?.length || 0} khoản thu
                                                        </span>
                                                        <div className="flex items-center space-x-2">
                                                            <button
                                                                onClick={() => handleOpenStudentDetail(st)}
                                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                                            >
                                                                <Eye size={13} /> Xem Chi Tiết
                                                            </button>
                                                            {unpaid > 0 && (
                                                                <button
                                                                    onClick={() => handlePayAllStudentBills(st.id, st.fullName)}
                                                                    className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                                                    title="Gạch nợ toàn bộ"
                                                                >
                                                                    <CheckCircle size={13} /> Thu tiền
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            ) : studentGlobalQuery ? (
                                <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100 text-gray-500">
                                    <Search size={36} className="mx-auto mb-2 text-gray-300" />
                                    <p className="font-semibold text-gray-700">Không tìm thấy học sinh nào phù hợp với &quot;{studentGlobalQuery}&quot;</p>
                                    <p className="text-xs text-gray-400 mt-1">Vui lòng kiểm tra lại Mã học sinh (Số báo danh) hoặc Họ tên vừa nhập</p>
                                </div>
                            ) : (
                                <div className="text-center py-14 bg-gradient-to-b from-gray-50/50 to-blue-50/20 rounded-2xl border border-dashed border-gray-200 text-gray-500 space-y-2">
                                    <p className="font-semibold text-gray-700 text-sm">Chưa có thông tin tìm kiếm</p>
                                    <p className="text-xs text-gray-400 max-w-md mx-auto">
                                        Nhập Tên hoặc Số báo danh (Mã học sinh) vào ô trên rồi nhấn <strong>Tra cứu ngay</strong> để bắt đầu xem hồ sơ học phí của học sinh.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: CHÍNH SÁCH MIỄN GIẢM (POLICY ENGINE) */}
            {activeTab === 'policies' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden space-y-4 p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <ShieldCheck size={22} className="text-purple-600" />
                                Quản lý Chính Sách Miễn Giảm Học Phí
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">Tự động hóa khấu trừ học phí theo đối tượng chính sách an sinh giáo dục</p>
                        </div>
                        <button
                            onClick={() => setIsAddPolicyModalOpen(true)}
                            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 flex items-center gap-2"
                        >
                            <Plus size={16} /> + Thêm Đối Tượng Ưu Tiên
                        </button>
                    </div>

                    {policiesLoading ? (
                        <div className="py-16 text-center text-gray-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                            Đang tải danh sách chính sách miễn giảm...
                        </div>
                    ) : (
                        <div className="overflow-x-auto border border-gray-100 rounded-xl">
                            <table className="w-full text-left text-xs text-gray-600">
                                <thead className="bg-gray-50 text-gray-700 font-bold uppercase">
                                    <tr>
                                        <th className="px-5 py-3.5">Học sinh</th>
                                        <th className="px-5 py-3.5">Lớp</th>
                                        <th className="px-5 py-3.5">Diện chính sách</th>
                                        <th className="px-5 py-3.5 text-center">Mức giảm</th>
                                        <th className="px-5 py-3.5">Số quyết định / Hạn giấy tờ</th>
                                        <th className="px-5 py-3.5 text-center">Trạng thái</th>
                                        <th className="px-5 py-3.5 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {policiesList.map((pol) => {
                                        const isExp = pol.documentExpiryDate && new Date(pol.documentExpiryDate) < new Date();
                                        return (
                                            <tr key={pol.id} className="hover:bg-purple-50/30 transition-colors">
                                                <td className="px-5 py-3.5 font-bold text-gray-900">
                                                    {pol.student?.fullName}
                                                    <span className="block text-[11px] text-gray-400 font-normal">{pol.student?.studentCode}</span>
                                                </td>
                                                <td className="px-5 py-3.5 font-semibold text-gray-700">
                                                    {pol.student?.class?.className || 'Chưa xếp lớp'}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800">
                                                        {pol.policyName}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-center font-black text-purple-700 text-sm">
                                                    {Math.round((pol.discountRate || 0) * 100)}%
                                                </td>
                                                <td className="px-5 py-3.5 text-[11px] text-gray-600">
                                                    <p>Số: <strong>{pol.documentNumber || 'N/A'}</strong></p>
                                                    {pol.documentExpiryDate && (
                                                        <p className={isExp ? 'text-red-600 font-bold' : 'text-gray-500'}>
                                                            Hạn: {new Date(pol.documentExpiryDate).toLocaleDateString('vi-VN')} {isExp && '(Hết hạn)'}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                        isExp ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                        {isExp ? 'HẾT HẠN' : 'ĐANG HIỆU LỰC'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <button
                                                        onClick={() => handleDeletePolicy(pol.id)}
                                                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Xóa chính sách"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {policiesList.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                                                Chưa có học sinh nào được áp dụng chính sách miễn giảm học phí.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            <AnimatePresence>
                <FeeProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} profile={selectedProfile} classesList={classesList} onSubmit={handleProfileSubmit} />
                <AssignModal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} profile={profileToAssign} classesList={classesList} onSubmit={handleAssignSubmit} />
                <DebtorsModal 
                    isOpen={isDebtorsModalOpen} 
                    onClose={() => setIsDebtorsModalOpen(false)} 
                    className={selectedDebtorClass} 
                    debtorsList={debtorsList} 
                    loading={debtorsLoading} 
                    onPay={handlePayBill} 
                    onPrint={handlePrintBill}
                />
                <StudentFeeLookupModal 
                    isOpen={isLookupModalOpen}
                    onClose={() => setIsLookupModalOpen(false)}
                    searchKeyword={searchStudentInput}
                    onSearch={handleLookupStudent}
                    students={lookupStudents}
                    loading={lookupLoading}
                    onPay={handlePayBill}
                    onPrint={handlePrintBill}
                    onViewDetail={handleOpenStudentDetail}
                />
                <StudentFeeDetailModal
                    isOpen={isStudentDetailOpen}
                    onClose={() => {
                        setIsStudentDetailOpen(false);
                        setSelectedStudentForDetail(null);
                    }}
                    student={selectedStudentForDetail}
                    onPayBill={handlePayBill}
                    onPayAll={handlePayAllStudentBills}
                    onPrintBill={handlePrintBill}
                />
                <PrintBillModal
                    isOpen={isPrintModalOpen}
                    onClose={() => setIsPrintModalOpen(false)}
                    bill={selectedBillToPrint}
                    className={selectedPrintClass}
                />

                {isAddPolicyModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-purple-100 my-8"
                        >
                            <div className="p-5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white flex justify-between items-center shadow-sm">
                                <div>
                                    <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                                        <ShieldCheck size={20} /> Thêm Đối Tượng Ưu Tiên Miễn Giảm
                                    </h3>
                                    <p className="text-3xs text-purple-100 mt-0.5">Liên kết diện chính sách & tự động khấu trừ công nợ học phí</p>
                                </div>
                                <button
                                    onClick={() => setIsAddPolicyModalOpen(false)}
                                    className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreatePolicy} className="p-5 space-y-4">
                                {/* Student Selection & Filter */}
                                <div className="bg-purple-50/50 p-3 rounded-2xl border border-purple-100 space-y-2.5">
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                            <input
                                                type="text"
                                                value={policyStudentSearch}
                                                onChange={e => setPolicyStudentSearch(e.target.value)}
                                                placeholder="Tìm theo tên hoặc SBD..."
                                                className="w-full pl-8 pr-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                                            />
                                        </div>
                                        <select
                                            value={policyClassFilter}
                                            onChange={e => setPolicyClassFilter(e.target.value)}
                                            className="px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-purple-500"
                                        >
                                            <option value="all">Tất cả lớp ({classesList.length})</option>
                                            {classesList.map(c => (
                                                <option key={c.id} value={c.id}>Lớp {c.className}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-700 block mb-1">
                                            Chọn học sinh áp dụng * <span className="text-purple-600 font-normal">({filteredStudentsForPolicy.length} học sinh)</span>
                                        </label>
                                        <select
                                            required
                                            value={newPolicyData.studentId}
                                            onChange={e => setNewPolicyData({ ...newPolicyData, studentId: e.target.value })}
                                            className="w-full text-xs font-semibold p-2.5 bg-white border border-purple-300 rounded-xl outline-none focus:border-purple-600 shadow-xs"
                                        >
                                            <option value="">-- Bấm chọn học sinh ({filteredStudentsForPolicy.length} HS) --</option>
                                            {filteredStudentsForPolicy.map(st => (
                                                <option key={st.id} value={st.id}>
                                                    {st.fullName} ({st.studentCode}) - {st.class?.className || 'Chưa lớp'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedStudentForPolicy && (
                                        <div className="p-2.5 bg-white rounded-xl border border-purple-200 text-xs flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-gray-900">{selectedStudentForPolicy.fullName} <span className="text-purple-700 font-black">({selectedStudentForPolicy.studentCode})</span></p>
                                                <p className="text-gray-500 text-3xs mt-0.5">Lớp: <strong>{selectedStudentForPolicy.class?.className || 'Chưa xếp lớp'}</strong> • SĐT PH: {selectedStudentForPolicy.parentPhone || 'Chưa có'}</p>
                                            </div>
                                            <span className="px-2 py-0.5 rounded-full text-3xs font-black bg-emerald-100 text-emerald-800">
                                                Đã chọn ✓
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-700 block mb-1">Diện ưu tiên *</label>
                                        <select
                                            value={newPolicyData.policyType}
                                            onChange={e => {
                                                const type = e.target.value;
                                                let defaultRate = 0.5;
                                                let name = 'Chính sách khác';
                                                if (type === 'MARTYR_CHILD') { defaultRate = 1.0; name = 'Con thương binh, liệt sĩ'; }
                                                else if (type === 'DISABILITY') { defaultRate = 0.7; name = 'Học sinh khuyết tật'; }
                                                else if (type === 'POOR_HOUSEHOLD') { defaultRate = 0.7; name = 'Hộ nghèo'; }
                                                else if (type === 'NEAR_POOR') { defaultRate = 0.5; name = 'Hộ cận nghèo'; }
                                                else if (type === 'TEACHER_CHILD') { defaultRate = 0.3; name = 'Con cán bộ / giáo viên'; }
                                                else if (type === 'ORPHAN') { defaultRate = 0.7; name = 'Học sinh mồ côi'; }
                                                else if (type === 'MERIT_SCHOLARSHIP') { defaultRate = 0.5; name = 'Học bổng khuyến học'; }
                                                setNewPolicyData({ ...newPolicyData, policyType: type, policyName: name, discountRate: defaultRate });
                                            }}
                                            className="w-full text-xs font-semibold p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500"
                                        >
                                            <option value="MARTYR_CHILD">Con liệt sĩ / TB (100%)</option>
                                            <option value="DISABILITY">Học sinh khuyết tật (70% - 100%)</option>
                                            <option value="POOR_HOUSEHOLD">Hộ nghèo (70% - 100%)</option>
                                            <option value="NEAR_POOR">Hộ cận nghèo (50%)</option>
                                            <option value="TEACHER_CHILD">Con GV trong trường (30%)</option>
                                            <option value="ORPHAN">Mồ côi (70%)</option>
                                            <option value="MERIT_SCHOLARSHIP">Học bổng khuyến học (50%)</option>
                                            <option value="OTHER">Chính sách hỗ trợ khác</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-700 block mb-1">
                                            Mức giảm: <strong className="text-purple-700">{Math.round((newPolicyData.discountRate || 0) * 100)}%</strong>
                                        </label>
                                        <input
                                            type="number"
                                            step="0.05"
                                            min="0"
                                            max="1"
                                            value={newPolicyData.discountRate}
                                            onChange={e => setNewPolicyData({ ...newPolicyData, discountRate: parseFloat(e.target.value) || 0 })}
                                            className="w-full text-xs font-semibold p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500"
                                        />
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setNewPolicyData({ ...newPolicyData, discountRate: 1.0 })}
                                                className={`px-2 py-0.5 rounded text-3xs font-bold transition-colors ${newPolicyData.discountRate === 1.0 ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                            >
                                                100% (Miễn hoàn toàn)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNewPolicyData({ ...newPolicyData, discountRate: 0.7 })}
                                                className={`px-2 py-0.5 rounded text-3xs font-bold transition-colors ${newPolicyData.discountRate === 0.7 ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                            >
                                                70%
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNewPolicyData({ ...newPolicyData, discountRate: 0.5 })}
                                                className={`px-2 py-0.5 rounded text-3xs font-bold transition-colors ${newPolicyData.discountRate === 0.5 ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                            >
                                                50%
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-700 block mb-1">Số quyết định / Thẻ xác nhận</label>
                                        <input
                                            type="text"
                                            placeholder="VD: 142/QĐ-UBND hoặc Thẻ TBLS..."
                                            value={newPolicyData.documentNumber}
                                            onChange={e => setNewPolicyData({ ...newPolicyData, documentNumber: e.target.value })}
                                            className="w-full text-xs font-semibold p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-700 block mb-1">Ngày hết hạn giấy tờ</label>
                                        <input
                                            type="date"
                                            value={newPolicyData.documentExpiryDate}
                                            onChange={e => setNewPolicyData({ ...newPolicyData, documentExpiryDate: e.target.value })}
                                            className="w-full text-xs font-semibold p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">Ghi chú xác minh</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Đã đối chiếu bản gốc thẻ thương binh/giấy xác nhận khuyết tật..."
                                        value={newPolicyData.notes}
                                        onChange={e => setNewPolicyData({ ...newPolicyData, notes: e.target.value })}
                                        className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500"
                                    />
                                </div>

                                <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddPolicyModalOpen(false)}
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5"
                                    >
                                        <CheckCircle size={15} /> Lưu Chính Sách & Khấu Trừ
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Tuition;

