import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit, X, DollarSign, Wallet, CreditCard, PieChart, Users, CheckCircle, Printer } from 'lucide-react';
import api from '../services/api';
import Swal from 'sweetalert2';

// --- Format Currency ---
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// --- Modal: Thêm/Sửa đợt thu học phí ---
const FeeProfileModal = ({ isOpen, onClose, profile, onSubmit }) => {
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        academicYear: '2026-2027',
        semester: 'HK1',
        targetGrades: []
    });

    const gradesList = [10, 11, 12];

    useEffect(() => {
        if (profile) {
            setFormData({
                name: profile.name || '',
                amount: profile.amount || '',
                academicYear: profile.academicYear || '2026-2027',
                semester: profile.semester || 'HK1',
                targetGrades: profile.targetGrades || []
            });
        } else {
            setFormData({
                name: '',
                amount: '',
                academicYear: '2026-2027',
                semester: 'HK1',
                targetGrades: []
            });
        }
    }, [profile, isOpen]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCheckboxChange = (grade) => {
        setFormData(prev => {
            const currentGrades = prev.targetGrades;
            if (currentGrades.includes(grade)) {
                return { ...prev, targetGrades: currentGrades.filter(g => g !== grade) };
            } else {
                return { ...prev, targetGrades: [...currentGrades, grade] };
            }
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.targetGrades.length === 0) {
            Swal.fire('Lỗi', 'Vui lòng chọn ít nhất 1 khối áp dụng', 'warning');
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
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-800">
                        {profile ? 'Sửa Đợt Thu Học Phí' : 'Tạo Đợt Thu Mới'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
                        <X size={24} />
                    </button>
                </div>
                
                <form className="p-6 space-y-4" onSubmit={handleSubmit}>
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Khối lớp áp dụng *</label>
                        <div className="flex gap-4">
                            {gradesList.map(grade => (
                                <label key={grade} className="flex items-center space-x-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                        checked={formData.targetGrades.includes(grade)}
                                        onChange={() => handleCheckboxChange(grade)}
                                    />
                                    <span className="text-gray-700">Khối {grade}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end space-x-3 pt-4">
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
    const [assignType, setAssignType] = useState('grade'); // 'grade' or 'class'
    const [selectedGrades, setSelectedGrades] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');

    useEffect(() => {
        if (isOpen && profile) {
            setAssignType('grade');
            setSelectedGrades(profile.targetGrades || []);
            setSelectedClass('');
        }
    }, [isOpen, profile]);

    const handleGradeCheckbox = (grade) => {
        setSelectedGrades(prev => 
            prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (assignType === 'grade' && selectedGrades.length === 0) {
            Swal.fire('Lỗi', 'Vui lòng chọn ít nhất 1 khối', 'warning');
            return;
        }
        if (assignType === 'class' && !selectedClass) {
            Swal.fire('Lỗi', 'Vui lòng chọn lớp học', 'warning');
            return;
        }

        onSubmit({
            feeProfileId: profile.id,
            targetGrades: assignType === 'grade' ? selectedGrades : undefined,
            classId: assignType === 'class' ? selectedClass : undefined
        });
    };

    if (!isOpen || !profile) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-800">Gán Đợt Thu</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
                        <X size={24} />
                    </button>
                </div>
                
                <form className="p-6 space-y-4" onSubmit={handleSubmit}>
                    <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-4">
                        <span className="font-semibold">Đợt thu:</span> {profile.name} <br/>
                        <span className="font-semibold">Số tiền:</span> {formatCurrency(profile.amount)}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phương thức gán</label>
                        <div className="flex gap-4 mb-4">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" name="assignType" value="grade" checked={assignType === 'grade'} onChange={() => setAssignType('grade')} className="text-blue-600" />
                                <span>Theo toàn Khối</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" name="assignType" value="class" checked={assignType === 'class'} onChange={() => setAssignType('class')} className="text-blue-600" />
                                <span>Theo Lớp cụ thể</span>
                            </label>
                        </div>
                    </div>

                    {assignType === 'grade' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Chọn Khối</label>
                            <div className="flex gap-4">
                                {profile.targetGrades.map((grade, gIdx) => (
                                    <label key={grade || `grade-assign-${gIdx}`} className="flex items-center space-x-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="rounded text-blue-600"
                                            checked={selectedGrades.includes(grade)}
                                            onChange={() => handleGradeCheckbox(grade)}
                                        />
                                        <span>Khối {grade}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Hệ thống sẽ tự động bỏ qua những học sinh đã được gán đợt thu này trước đó.</p>
                        </div>
                    )}

                    {assignType === 'class' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Chọn Lớp</label>
                            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">-- Chọn lớp --</option>
                                {classesList.filter(c => profile.targetGrades.includes(c.grade)).map((c, cIdx) => (
                                    <option key={c.id || `class-assign-${cIdx}`} value={c.id}>{c.className} (Khối {c.grade})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="mt-8 flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                            Hủy bỏ
                        </button>
                        <button type="submit" className="btn-primary px-5 py-2.5">
                            Gán Ngay
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
                                <span>{bill.student.fullName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-semibold">Mã học sinh:</span>
                                <span>{bill.student.studentCode}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-semibold">Lớp:</span>
                                <span>{className}</span>
                            </div>
                            <div className="flex justify-between mt-4 pt-4 border-t border-gray-100">
                                <span className="font-semibold">Khoản thu:</span>
                                <span>{bill.feeProfile.name}</span>
                            </div>
                            <div className="flex justify-between text-lg">
                                <span className="font-bold">Số tiền:</span>
                                <span className="font-bold text-rose-600">{formatCurrency(bill.feeProfile.amount)}</span>
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

// --- Modal: Danh sách học sinh nợ học phí ---
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
                                                        onClick={() => onPrint(bill)} 
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

// --- Main Component ---
const Tuition = () => {
    const [summary, setSummary] = useState(null);
    const [profiles, setProfiles] = useState([]);
    const [classesList, setClassesList] = useState([]);
    
    const [filterYear, setFilterYear] = useState('2026-2027');
    const [filterSemester, setFilterSemester] = useState('HK1');
    const [loading, setLoading] = useState(true);
    
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

    // Print Modal
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [selectedBillToPrint, setSelectedBillToPrint] = useState(null);

    useEffect(() => {
        fetchData();
        fetchClasses();
    }, [filterYear, filterSemester]);

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
        } catch (error) {
            console.error(error);
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

    const handlePrintBill = (bill) => {
        setSelectedBillToPrint(bill);
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
                // Tải lại danh sách debtors và dashboard summary
                handleViewDebtors(selectedDebtorClass);
                fetchData();
            } catch (err) {
                Swal.fire('Lỗi', 'Có lỗi khi cập nhật thanh toán', 'error');
            }
        }
    };


    return (
        <div className="space-y-6 font-poppins pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Quản lý Học phí</h2>
                <div className="flex items-center space-x-3">
                    <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="2025-2026">2025-2026</option>
                        <option value="2026-2027">2026-2027</option>
                    </select>
                    <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="HK1">Học kỳ 1</option>
                        <option value="HK2">Học kỳ 2</option>
                        <option value="Cả năm">Cả năm</option>
                    </select>
                </div>
            </div>

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
                                        <th className="px-6 py-4 border-b border-gray-100">Khối áp dụng</th>
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
                                                <div className="flex gap-1">
                                                    {p.targetGrades.map((g, gIdx) => <span key={g || `grade-badge-${gIdx}`} className="bg-gray-100 px-2 py-1 rounded text-xs">Khối {g}</span>)}
                                                </div>
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

            <AnimatePresence>
                <FeeProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} profile={selectedProfile} onSubmit={handleProfileSubmit} />
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
                <PrintBillModal
                    isOpen={isPrintModalOpen}
                    onClose={() => setIsPrintModalOpen(false)}
                    bill={selectedBillToPrint}
                    className={selectedDebtorClass}
                />
            </AnimatePresence>
        </div>
    );
};

export default Tuition;
