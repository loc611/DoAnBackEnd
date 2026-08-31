import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Swal from 'sweetalert2';
import api from '../services/api';
import { Search, Plus, Filter, Edit, Lock, Unlock, KeyRound, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateStudentCode, generateTeacherCode } from '../utils/codeGenerator';
import { PHONE_10_DIGITS_REGEX, PHONE_ERROR_MESSAGES, sanitizePhoneNumber } from '../utils/phoneValidation';

const UserFormModal = ({ isOpen, onClose, user, classesList = [], onSuccess }) => {
    const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm({
        mode: 'onChange'
    });
    const [loading, setLoading] = useState(false);
    
    const role = watch('role');

    useEffect(() => {
        if (user) {
            reset({
                username: user.username,
                email: user.email,
                role: user.role,
                fullName: user.profile?.fullName || '',
                phone: user.profile?.phone || '',
                // Teacher fields
                teacherCode: user.profile?.teacherCode || '',
                subject: user.profile?.subject || '',
                department: user.profile?.department || '',
                gender: user.profile?.gender || 'Nam',
                // Student fields
                studentCode: user.profile?.studentCode || '',
                classId: user.profile?.classId || '',
                parentPhone: user.profile?.parentPhone || '',
            });
        } else {
            reset({
                username: '',
                email: '',
                password: '',
                confirmPassword: '',
                role: 'student',
                fullName: '',
                phone: '',
                teacherCode: generateTeacherCode(),
                subject: '',
                department: '',
                gender: 'Nam',
                studentCode: generateStudentCode(),
                classId: '',
                parentPhone: ''
            });
        }
    }, [user, isOpen, reset]);

    useEffect(() => {
        if (!user && isOpen) {
            if (role === 'student' && !watch('studentCode')) {
                setValue('studentCode', generateStudentCode());
            } else if (role === 'teacher' && !watch('teacherCode')) {
                setValue('teacherCode', generateTeacherCode());
            }
        }
    }, [role, user, isOpen, setValue, watch]);

    const onSubmit = async (data) => {
        if (!user && data.password !== data.confirmPassword) {
            return Swal.fire('Lỗi', 'Mật khẩu xác nhận không khớp', 'error');
        }

        try {
            setLoading(true);
            if (user) {
                // Update
                await api.put(`/users/${user.id}`, data);
                Swal.fire('Thành công', 'Cập nhật hồ sơ thành công', 'success');
            } else {
                // Create
                await api.post('/users', data);
                Swal.fire('Thành công', 'Tạo tài khoản mới thành công', 'success');
            }
            onSuccess();
            onClose();
        } catch (error) {
            Swal.fire('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-gray-800">
                        {user ? 'Sửa thông tin hồ sơ' : 'Thêm tài khoản mới'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
                        <X size={24} />
                    </button>
                </div>
                
                <form className="p-6" onSubmit={handleSubmit(onSubmit)}>
                    {/* Thông tin tài khoản */}
                    <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Thông tin Đăng nhập</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
                            <input 
                                {...register('username', { 
                                    required: 'Tên đăng nhập là bắt buộc',
                                    minLength: { value: 3, message: 'Tên đăng nhập phải có ít nhất 3 ký tự' }
                                })} 
                                disabled={!!user}
                                placeholder="VD: nguyenvana"
                                className={`w-full px-4 py-2 rounded-lg border outline-none transition-colors disabled:bg-gray-100 ${
                                    errors.username ? 'border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50/20' : 'border-gray-200 focus:ring-2 focus:ring-blue-500'
                                }`} 
                            />
                            {errors.username && (
                                <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                                    <span>⚠️</span> {errors.username.message}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                            <input 
                                type="email"
                                {...register('email', { 
                                    required: 'Email là bắt buộc',
                                    pattern: {
                                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                        message: 'Email không đúng định dạng'
                                    }
                                })} 
                                disabled={!!user}
                                placeholder="VD: user@school.edu.vn"
                                className={`w-full px-4 py-2 rounded-lg border outline-none transition-colors disabled:bg-gray-100 ${
                                    errors.email ? 'border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50/20' : 'border-gray-200 focus:ring-2 focus:ring-blue-500'
                                }`} 
                            />
                            {errors.email && (
                                <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                                    <span>⚠️</span> {errors.email.message}
                                </p>
                            )}
                        </div>

                        {!user && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu *</label>
                                    <input 
                                        type="password"
                                        {...register('password', { 
                                            required: !user ? 'Mật khẩu là bắt buộc' : false, 
                                            minLength: {
                                                value: 6,
                                                message: 'Mật khẩu phải có ít nhất 6 ký tự'
                                            }
                                        })} 
                                        placeholder="Tối thiểu 6 ký tự"
                                        className={`w-full px-4 py-2 rounded-lg border outline-none transition-colors ${
                                            errors.password ? 'border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50/20' : 'border-gray-200 focus:ring-2 focus:ring-blue-500'
                                        }`} 
                                    />
                                    {errors.password && (
                                        <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                                            <span>⚠️</span> {errors.password.message}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Xác nhận mật khẩu *</label>
                                    <input 
                                        type="password"
                                        {...register('confirmPassword', { 
                                            required: !user ? 'Vui lòng xác nhận mật khẩu' : false,
                                            validate: (val) => {
                                                if (!user && val !== watch('password')) {
                                                    return 'Mật khẩu xác nhận không khớp';
                                                }
                                                return true;
                                            }
                                        })} 
                                        placeholder="Nhập lại mật khẩu"
                                        className={`w-full px-4 py-2 rounded-lg border outline-none transition-colors ${
                                            errors.confirmPassword ? 'border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50/20' : 'border-gray-200 focus:ring-2 focus:ring-blue-500'
                                        }`} 
                                    />
                                    {errors.confirmPassword && (
                                        <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                                            <span>⚠️</span> {errors.confirmPassword.message}
                                        </p>
                                    )}
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Vai trò (Role) *</label>
                            <select 
                                {...register('role')} 
                                disabled={!!user}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                            >
                                <option value="student">Học sinh</option>
                                <option value="teacher">Giáo viên</option>
                                <option value="admin">Quản trị viên (Admin)</option>
                            </select>
                        </div>
                    </div>

                    {/* Thông tin hồ sơ */}
                    <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Thông tin Hồ sơ</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Họ và Tên *</label>
                            <input 
                                {...register('fullName', { required: 'Họ và tên là bắt buộc' })} 
                                placeholder="VD: Nguyễn Văn A"
                                className={`w-full px-4 py-2 rounded-lg border outline-none transition-colors ${
                                    errors.fullName ? 'border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50/20' : 'border-gray-200 focus:ring-2 focus:ring-blue-500'
                                }`} 
                            />
                            {errors.fullName && (
                                <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                                    <span>⚠️</span> {errors.fullName.message}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại *</label>
                            <input 
                                type="tel"
                                {...register('phone', { 
                                    required: PHONE_ERROR_MESSAGES.REQUIRED,
                                    pattern: {
                                        value: PHONE_10_DIGITS_REGEX,
                                        message: PHONE_ERROR_MESSAGES.INVALID
                                    }
                                })} 
                                onInput={(e) => {
                                    const cleaned = sanitizePhoneNumber(e.target.value);
                                    e.target.value = cleaned;
                                    setValue('phone', cleaned, { shouldValidate: true });
                                }}
                                placeholder="VD: 0912345678"
                                maxLength={10}
                                className={`w-full px-4 py-2 rounded-lg border outline-none transition-colors ${
                                    errors.phone ? 'border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50/20' : 'border-gray-200 focus:ring-2 focus:ring-blue-500'
                                }`} 
                            />
                            {errors.phone && (
                                <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                                    <span>⚠️</span> {errors.phone.message}
                                </p>
                            )}
                        </div>

                        {role === 'teacher' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Mã Giáo viên (Tự động) *</label>
                                    <input 
                                        {...register('teacherCode')} 
                                        readOnly
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-100 font-mono font-semibold text-blue-600 outline-none cursor-not-allowed" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Giới tính</label>
                                    <select {...register('gender')} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none">
                                        <option value="Nam">Nam</option>
                                        <option value="Nữ">Nữ</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Bộ môn giảng dạy</label>
                                    <input {...register('subject')} placeholder="VD: Toán học" className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tổ chuyên môn (Department)</label>
                                    <input {...register('department')} placeholder="VD: Tự nhiên" className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none" />
                                </div>
                            </>
                        )}

                        {role === 'student' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Mã Học sinh (Tự động) *</label>
                                    <input 
                                        {...register('studentCode')} 
                                        readOnly
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-100 font-mono font-semibold text-blue-600 outline-none cursor-not-allowed" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Giới tính</label>
                                    <select {...register('gender')} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none">
                                        <option value="Nam">Nam</option>
                                        <option value="Nữ">Nữ</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Lớp học</label>
                                    <select 
                                        {...register('classId')} 
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    >
                                        <option value="">-- Chưa phân lớp --</option>
                                        {classesList.map((c, idx) => (
                                            <option key={c.id || `cls-opt-${idx}`} value={c.id}>
                                                {c.className} (Khối {c.grade || ''})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">SĐT Phụ huynh *</label>
                                    <input 
                                        type="tel"
                                        {...register('parentPhone', { 
                                            required: PHONE_ERROR_MESSAGES.PARENT_REQUIRED,
                                            pattern: {
                                                value: PHONE_10_DIGITS_REGEX,
                                                message: PHONE_ERROR_MESSAGES.PARENT_INVALID
                                            }
                                        })} 
                                        onInput={(e) => {
                                            const cleaned = sanitizePhoneNumber(e.target.value);
                                            e.target.value = cleaned;
                                            setValue('parentPhone', cleaned, { shouldValidate: true });
                                        }}
                                        placeholder="VD: 0987654321"
                                        maxLength={10}
                                        className={`w-full px-4 py-2 rounded-lg border outline-none transition-colors ${
                                            errors.parentPhone ? 'border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50/20' : 'border-gray-200 focus:ring-2 focus:ring-blue-500'
                                        }`} 
                                    />
                                    {errors.parentPhone && (
                                        <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                                            <span>⚠️</span> {errors.parentPhone.message}
                                        </p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="mt-8 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                            Hủy bỏ
                        </button>
                        <button type="submit" disabled={loading} className="btn-primary px-5 py-2.5 disabled:opacity-50">
                            {loading ? 'Đang lưu...' : 'Lưu thông tin'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const UsersManagement = () => {
    const [users, setUsers] = useState([]);
    const [classesList, setClassesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        fetchUsers();
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            const res = await api.get('/classes');
            setClassesList(res.data || []);
        } catch (err) {
            console.error('Lỗi khi tải danh sách lớp học:', err);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (error) {
            Swal.fire('Lỗi', 'Không thể tải danh sách tài khoản', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const handleEdit = (user) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleToggleStatus = async (user) => {
        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        const confirmMsg = newStatus === 'inactive' 
            ? `Bạn có chắc muốn KHÓA tài khoản ${user.username}? Người này sẽ không thể đăng nhập.`
            : `MỞ KHÓA cho tài khoản ${user.username}?`;
            
        const result = await Swal.fire({
            title: 'Xác nhận',
            text: confirmMsg,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: newStatus === 'inactive' ? '#d33' : '#3085d6',
            cancelButtonColor: '#gray',
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Hủy'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/users/${user.id}/status`, { status: newStatus });
                Swal.fire('Thành công', 'Đã cập nhật trạng thái', 'success');
                fetchUsers();
            } catch (error) {
                Swal.fire('Lỗi', 'Không thể đổi trạng thái', 'error');
            }
        }
    };

    const handleResetPassword = async (user) => {
        const { value: formValues } = await Swal.fire({
            title: `Đổi mật khẩu cho ${user.username}`,
            html:
                '<input id="swal-input1" type="password" class="swal2-input" placeholder="Mật khẩu mới">' +
                '<input id="swal-input2" type="password" class="swal2-input" placeholder="Xác nhận mật khẩu mới">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Cập nhật',
            preConfirm: () => {
                const p1 = document.getElementById('swal-input1').value;
                const p2 = document.getElementById('swal-input2').value;
                if (!p1 || p1.length < 6) {
                    Swal.showValidationMessage('Mật khẩu phải có ít nhất 6 ký tự');
                } else if (p1 !== p2) {
                    Swal.showValidationMessage('Mật khẩu xác nhận không khớp');
                }
                return p1;
            }
        });

        if (formValues) {
            try {
                await api.patch(`/users/${user.id}/reset-password`, { password: formValues });
                Swal.fire('Thành công', 'Đã đặt lại mật khẩu', 'success');
            } catch (error) {
                Swal.fire('Lỗi', 'Không thể đặt lại mật khẩu', 'error');
            }
        }
    };

    const handleDelete = async (user) => {
        const result = await Swal.fire({
            title: 'Xóa vĩnh viễn?',
            text: `Hành động này sẽ xóa tài khoản ${user.username} và toàn bộ hồ sơ liên quan. KHÔNG THỂ KHÔI PHỤC!`,
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonText: 'Hủy',
            confirmButtonText: 'Xóa ngay!'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/users/${user.id}`);
                Swal.fire('Đã xóa!', 'Tài khoản đã bị xóa hoàn toàn khỏi hệ thống.', 'success');
                fetchUsers();
            } catch (error) {
                Swal.fire('Lỗi', 'Xóa thất bại', 'error');
            }
        }
    };

    const filteredUsers = users.filter(u => {
        const matchSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) 
                         || u.email.toLowerCase().includes(searchTerm.toLowerCase())
                         || u.profile?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchRole = roleFilter ? u.role === roleFilter : true;
        const matchStatus = statusFilter ? u.status === statusFilter : true;
        return matchSearch && matchRole && matchStatus;
    });

    const getRoleBadge = (role) => {
        switch(role) {
            case 'admin': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">Admin</span>;
            case 'teacher': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">Teacher</span>;
            case 'student': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Student</span>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 font-poppins">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Quản lý Hệ thống Tài khoản</h2>
                <button onClick={handleAdd} className="btn-primary flex items-center">
                    <Plus size={20} className="mr-2" />
                    Thêm Tài khoản
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50">
                    <div className="relative w-full sm:w-1/3">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Tìm username, email, họ tên..."
                            className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex space-x-2 w-full sm:w-auto">
                        <select 
                            value={roleFilter} 
                            onChange={e => setRoleFilter(e.target.value)}
                            className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none text-sm bg-white"
                        >
                            <option value="">Tất cả Vai trò</option>
                            <option value="admin">Admin</option>
                            <option value="teacher">Giáo viên</option>
                            <option value="student">Học sinh</option>
                        </select>
                        <select 
                            value={statusFilter} 
                            onChange={e => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none text-sm bg-white"
                        >
                            <option value="">Tất cả Trạng thái</option>
                            <option value="active">Đang hoạt động</option>
                            <option value="inactive">Đã khóa</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
                    ) : (
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-700 font-medium">
                                <tr>
                                    <th className="px-6 py-4 border-b border-gray-100">Username</th>
                                    <th className="px-6 py-4 border-b border-gray-100">Họ và tên</th>
                                    <th className="px-6 py-4 border-b border-gray-100">Email</th>
                                    <th className="px-6 py-4 border-b border-gray-100">Vai trò</th>
                                    <th className="px-6 py-4 border-b border-gray-100">Trạng thái</th>
                                    <th className="px-6 py-4 border-b border-gray-100 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            Không tìm thấy tài khoản nào.
                                        </td>
                                    </tr>
                                ) : filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-0">
                                        <td className="px-6 py-4 font-medium text-gray-800">{u.username}</td>
                                        <td className="px-6 py-4 font-medium text-blue-600">{u.profile?.fullName || 'N/A'}</td>
                                        <td className="px-6 py-4">{u.email}</td>
                                        <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                                        <td className="px-6 py-4">
                                            {u.status === 'active' 
                                                ? <span className="text-emerald-600 font-medium flex items-center"><Unlock size={14} className="mr-1"/> Hoạt động</span>
                                                : <span className="text-red-500 font-medium flex items-center"><Lock size={14} className="mr-1"/> Đã khóa</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end space-x-1">
                                                <button onClick={() => handleEdit(u)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Sửa hồ sơ">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleResetPassword(u)} className="p-2 text-amber-500 hover:bg-amber-100 rounded-lg transition-colors" title="Đặt lại mật khẩu">
                                                    <KeyRound size={18} />
                                                </button>
                                                <button onClick={() => handleToggleStatus(u)} className={`p-2 rounded-lg transition-colors ${u.status === 'active' ? 'text-gray-500 hover:bg-gray-100' : 'text-emerald-600 hover:bg-emerald-100'}`} title={u.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}>
                                                    {u.status === 'active' ? <Lock size={18} /> : <Unlock size={18} />}
                                                </button>
                                                <button onClick={() => handleDelete(u)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa vĩnh viễn">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <AnimatePresence>
                <UserFormModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    user={selectedUser} 
                    classesList={classesList}
                    onSuccess={fetchUsers} 
                />
            </AnimatePresence>
        </div>
    );
};

export default UsersManagement;
