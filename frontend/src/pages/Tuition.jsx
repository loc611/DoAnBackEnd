import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit, X, DollarSign, Wallet, CreditCard, PieChart, Users, CheckCircle, Printer, Layers } from 'lucide-react';
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
const StudentFeeLookupModal = ({ isOpen, onClose, searchKeyword, onSearch, students, loading, onPay, onPrint }) => {
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
                                placeholder="Nhập Mã học sinh (VD: HS001) hoặc Họ và tên..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-2xs"
                            />
                        </div>
                        <button type="submit" className="btn-primary px-6 py-2.5 text-sm font-semibold flex items-center">
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
                            <p className="text-xs text-gray-400 mt-1">Vui lòng kiểm tra lại Mã học sinh hoặc Họ tên vừa nhập</p>
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
                                                    <h3 className="text-lg font-bold text-gray-900">{st.fullName}</h3>
                                                    <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                                                        {st.studentCode}
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

                                            <div className="flex items-center space-x-2 text-xs font-semibold">
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
    const [selectedGradeFilter, setSelectedGradeFilter] = useState('all');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [classTuitionData, setClassTuitionData] = useState(null);
    const [classTuitionLoading, setClassTuitionLoading] = useState(false);
    const [studentStatusFilter, setStudentStatusFilter] = useState('all'); // 'all' | 'unpaid' | 'paid'
    const [studentNameSearch, setStudentNameSearch] = useState('');
    
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

    useEffect(() => {
        fetchData();
        fetchClasses();
    }, [filterYear, filterSemester]);

    useEffect(() => {
        if (activeTab === 'classTracking' && selectedClassId) {
            fetchClassTuition(selectedClassId);
        }
    }, [selectedClassId, filterYear, filterSemester, activeTab]);

    const fetchData = async () => {
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
                // Tải lại danh sách debtors, lookup nếu đang mở, danh sách theo lớp và dashboard summary
                if (selectedDebtorClass) {
                    handleViewDebtors(selectedDebtorClass);
                }
                if (searchStudentInput) {
                    handleLookupStudent(searchStudentInput);
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
                if (selectedClassId) fetchClassTuition(selectedClassId);
                fetchData();
            } catch (err) {
                Swal.fire('Lỗi', 'Có lỗi khi cập nhật thanh toán', 'error');
            }
        }
    };

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

            {/* TAB 2: THEO DÕI THEO LỚP */}
            {activeTab === 'classTracking' && (
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
                        <div className="relative min-w-[240px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text"
                                value={studentNameSearch}
                                onChange={(e) => setStudentNameSearch(e.target.value)}
                                placeholder="Tìm học sinh trong lớp..."
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                            />
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
                                Danh sách học sinh lớp {classTuitionData?.classInfo?.className}
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
                                            <th className="px-5 py-3.5 border-b border-gray-100">Mã HS</th>
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
                                                    <td className="px-5 py-3.5 font-bold text-gray-800">{st.studentCode}</td>
                                                    <td className="px-5 py-3.5 font-semibold text-gray-900">{st.fullName}</td>
                                                    <td className="px-5 py-3.5 text-gray-600">{st.parentPhone || '—'}</td>
                                                    <td className="px-5 py-3.5">
                                                        {(!st.feeBills || st.feeBills.length === 0) ? (
                                                            <span className="text-gray-400 italic">Chưa gán đợt thu nào</span>
                                                        ) : (
                                                            <div className="flex flex-wrap gap-1.5 max-w-sm">
                                                                {st.feeBills.map(b => (
                                                                    <span 
                                                                        key={b.id}
                                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold border ${
                                                                            b.status === 'paid'
                                                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                                : 'bg-rose-50 text-rose-800 border-rose-200'
                                                                        }`}
                                                                        title={`${b.feeProfile?.name}: ${formatCurrency(b.feeProfile?.amount || 0)} (${b.status === 'paid' ? 'Đã đóng' : 'Chưa đóng'})`}
                                                                    >
                                                                        {b.feeProfile?.name} • {formatCurrency(b.feeProfile?.amount || 0)}
                                                                        {b.status === 'paid' && <CheckCircle size={10} className="ml-1 text-emerald-600" />}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
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
                />
                <PrintBillModal
                    isOpen={isPrintModalOpen}
                    onClose={() => setIsPrintModalOpen(false)}
                    bill={selectedBillToPrint}
                    className={selectedPrintClass}
                />
            </AnimatePresence>
        </div>
    );
};

export default Tuition;

