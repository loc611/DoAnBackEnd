import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Swal from 'sweetalert2';
import api from '../services/api';
import { Search, Plus, Filter, Edit, Lock, Unlock, KeyRound, Trash2, X, ShieldAlert, UserCheck, UserX, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateStudentCode, generateTeacherCode } from '../utils/codeGenerator';
import { PHONE_10_DIGITS_REGEX, PHONE_ERROR_MESSAGES, sanitizePhoneNumber } from '../utils/phoneValidation';

const TEACHER_POSITIONS = [
    'Giáo viên bộ môn',
    'Giáo viên chủ nhiệm',
    'Trưởng bộ môn',
    'Trưởng khoa / Quản khoa',
    'Ban giám hiệu'
];

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
                position: user.profile?.position || 'Giáo viên bộ môn',
                subject: user.profile?.subject || user.profile?.specialization || '',
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
                position: 'Giáo viên bộ môn',
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
                await api.put(`/users/${user.id}`, data);
                Swal.fire('Thành công', 'Cập nhật hồ sơ thành công', 'success');
            } else {
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
                className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-200"
            >
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/70 sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-slate-800">
                        {user ? 'Sửa thông tin hồ sơ tài khoản' : 'Cấp tài khoản mới (Hệ thống)'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-xl hover:bg-slate-100">
                        <X size={20} />
                    </button>
                </div>
                
                <form className="p-6 font-sans" onSubmit={handleSubmit(onSubmit)}>
                    <h3 className="text-base font-bold text-indigo-700 mb-4 border-b border-slate-100 pb-2">1. Thông tin Đăng nhập</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Username *</label>
                            <input 
                                {...register('username', { 
                                    required: 'Tên đăng nhập là bắt buộc',
                                    minLength: { value: 3, message: 'Tên đăng nhập phải có ít nhất 3 ký tự' }
                                })} 
                                disabled={!!user}
                                placeholder="VD: hs_nguyenvana"
                                className={`w-full px-4 py-2.5 rounded-xl border outline-none transition-colors text-sm font-medium disabled:bg-slate-100 ${
                                    errors.username ? 'border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/20' : 'border-slate-200 focus:ring-2 focus:ring-indigo-500'
                                }`} 
                            />
                            {errors.username && (
                                <p className="text-rose-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                                    <span>⚠️</span> {errors.username.message}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Email *</label>
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
                                className={`w-full px-4 py-2.5 rounded-xl border outline-none transition-colors text-sm font-medium disabled:bg-slate-100 ${
                                    errors.email ? 'border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/20' : 'border-slate-200 focus:ring-2 focus:ring-indigo-500'
                                }`} 
                            />
                            {errors.email && (
                                <p className="text-rose-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                                    <span>⚠️</span> {errors.email.message}
                                </p>
                            )}
                        </div>

                        {!user && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Mật khẩu ban đầu *</label>
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
                                        className={`w-full px-4 py-2.5 rounded-xl border outline-none transition-colors text-sm font-medium ${
                                            errors.password ? 'border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/20' : 'border-slate-200 focus:ring-2 focus:ring-indigo-500'
                                        }`} 
                                    />
                                    {errors.password && (
                                        <p className="text-rose-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                                            <span>⚠️</span> {errors.password.message}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Xác nhận mật khẩu *</label>
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
                                        className={`w-full px-4 py-2.5 rounded-xl border outline-none transition-colors text-sm font-medium ${
                                            errors.confirmPassword ? 'border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/20' : 'border-slate-200 focus:ring-2 focus:ring-indigo-500'
                                        }`} 
                                    />
                                    {errors.confirmPassword && (
                                        <p className="text-rose-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                                            <span>⚠️</span> {errors.confirmPassword.message}
                                        </p>
                                    )}
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Vai trò người dùng *</label>
                            <select 
                                {...register('role')} 
                                disabled={!!user}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium disabled:bg-slate-100 text-slate-700"
                            >
                                <option value="student">Học sinh</option>
                                <option value="teacher">Giáo viên</option>
                                <option value="admin">Quản trị viên (Admin)</option>
                            </select>
                        </div>
                    </div>

                    <h3 className="text-base font-bold text-indigo-700 mb-4 border-b border-slate-100 pb-2">2. Thông tin Hồ sơ Chi tiết</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Họ và Tên *</label>
                            <input 
                                {...register('fullName', { required: 'Họ và tên là bắt buộc' })} 
                                placeholder="VD: Nguyễn Văn A"
                                className={`w-full px-4 py-2.5 rounded-xl border outline-none transition-colors text-sm font-medium ${
                                    errors.fullName ? 'border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/20' : 'border-slate-200 focus:ring-2 focus:ring-indigo-500'
                                }`} 
                            />
                            {errors.fullName && (
                                <p className="text-rose-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                                    <span>⚠️</span> {errors.fullName.message}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Số điện thoại *</label>
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
                                className={`w-full px-4 py-2.5 rounded-xl border outline-none transition-colors text-sm font-medium ${
                                    errors.phone ? 'border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/20' : 'border-slate-200 focus:ring-2 focus:ring-indigo-500'
                                }`} 
                            />
                            {errors.phone && (
                                <p className="text-rose-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                                    <span>⚠️</span> {errors.phone.message}
                                </p>
                            )}
                        </div>

                        {role === 'teacher' && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Mã Giáo viên (Bất biến) *</label>
                                    <input 
                                        {...register('teacherCode')} 
                                        readOnly
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 font-mono font-bold text-indigo-600 outline-none cursor-not-allowed text-sm" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Chức vụ trong trường *</label>
                                    <select {...register('position')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none text-sm bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500">
                                        {TEACHER_POSITIONS.map(pos => (
                                            <option key={pos} value={pos}>{pos}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Giới tính</label>
                                    <select {...register('gender')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none text-sm bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500">
                                        <option value="Nam">Nam</option>
                                        <option value="Nữ">Nữ</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Bộ môn giảng dạy</label>
                                    <input {...register('subject')} placeholder="VD: Toán học" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none text-sm font-medium focus:ring-2 focus:ring-indigo-500" />
                                </div>
                            </>
                        )}

                        {role === 'student' && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Mã Học sinh (Bất biến) *</label>
                                    <input 
                                        {...register('studentCode')} 
                                        readOnly
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 font-mono font-bold text-indigo-600 outline-none cursor-not-allowed text-sm" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Lớp học</label>
                                    <select {...register('classId')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none text-sm bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500">
                                        <option value="">-- Chưa phân lớp --</option>
                                        {classesList.map(c => (
                                            <option key={c.id} value={c.id}>{c.className} (Khối {c.grade})</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="mt-8 flex justify-end space-x-3 pt-4 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors font-semibold text-sm">
                            Hủy bỏ
                        </button>
                        <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer">
                            {loading ? 'Đang lưu...' : 'Lưu tài khoản'}
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        fetchUsers();
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            const res = await api.get('/classes');
            setClassesList(res.data || []);
        } catch (error) {
            console.error('Error fetching classes:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/users');
            setUsers(res.data || []);
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

    const handleSetStatus = async (user, newStatus) => {
        const statusMap = {
            active: { text: 'Mở hoạt động', color: '#10b981' },
            suspended: { text: 'Đình chỉ tạm thời', color: '#f59e0b' },
            blocked: { text: 'Khóa hoàn toàn', color: '#ef4444' }
        };

        const target = statusMap[newStatus] || { text: newStatus, color: '#6366f1' };

        const result = await Swal.fire({
            title: `Đổi trạng thái: ${target.text}?`,
            text: `Bạn có chắc muốn chuyển tài khoản ${user.username} sang trạng thái "${target.text}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: target.color,
            cancelButtonText: 'Hủy',
            confirmButtonText: 'Xác nhận'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/users/${user.id}/status`, { status: newStatus });
                Swal.fire('Thành công', `Đã chuyển tài khoản sang: ${target.text}`, 'success');
                fetchUsers();
            } catch (error) {
                Swal.fire('Lỗi', error.response?.data?.message || 'Không thể đổi trạng thái', 'error');
            }
        }
    };

    const handleResetPassword = async (user) => {
        const { value: formValues } = await Swal.fire({
            title: `Đặt lại mật khẩu cho ${user.username}`,
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
                         || (u.profile?.fullName && u.profile.fullName.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchRole = roleFilter ? u.role === roleFilter : true;
        const matchStatus = statusFilter ? u.status === statusFilter : true;
        return matchSearch && matchRole && matchStatus;
    });

    const getRoleBadge = (role, profile) => {
        switch(role) {
            case 'admin': return <span className="whitespace-nowrap bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold shadow-2xs">Admin</span>;
            case 'teacher': return (
                <div className="flex flex-col gap-1 items-start">
                    <span className="whitespace-nowrap bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-0.5 rounded-full text-xs font-bold shadow-2xs">Giáo viên</span>
                    {profile?.position && <span className="whitespace-nowrap text-[11px] text-slate-500 font-medium">{profile.position}</span>}
                </div>
            );
            case 'student': return <span className="whitespace-nowrap bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold shadow-2xs">Học sinh</span>;
            default: return null;
        }
    };

    const getStatusBadge = (status) => {
        if (status === 'active') {
            return (
                <span className="whitespace-nowrap px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Hoạt động
                </span>
            );
        }
        if (status === 'suspended') {
            return (
                <span className="whitespace-nowrap px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Đình chỉ
                </span>
            );
        }
        return (
            <span className="whitespace-nowrap px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Bị khóa
            </span>
        );
    };

    return (
        <div className="space-y-6 font-sans">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Quản lý Tài khoản Hệ thống</h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">Toàn quyền cấp phát, kiểm soát trạng thái hoạt động và bảo mật</p>
                </div>
                <button onClick={handleAdd} className="btn-primary flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-2xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 transition-all cursor-pointer">
                    <Plus size={18} className="mr-2" />
                    Cấp Tài khoản
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/60">
                    <div className="relative w-full sm:w-80">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Search size={18} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Tìm username, email, họ tên..."
                            className="pl-10 pr-4 py-2.5 w-full border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium text-slate-800 shadow-xs"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex space-x-2 w-full sm:w-auto">
                        <select 
                            value={roleFilter} 
                            onChange={e => setRoleFilter(e.target.value)}
                            className="px-4 py-2.5 border border-slate-200 rounded-2xl outline-none text-sm bg-white font-semibold text-slate-700 shadow-xs"
                        >
                            <option value="">Tất cả Vai trò</option>
                            <option value="admin">Admin</option>
                            <option value="teacher">Giáo viên</option>
                            <option value="student">Học sinh</option>
                        </select>
                        <select 
                            value={statusFilter} 
                            onChange={e => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 border border-slate-200 rounded-2xl outline-none text-sm bg-white font-semibold text-slate-700 shadow-xs"
                        >
                            <option value="">Tất cả Trạng thái</option>
                            <option value="active">Hoạt động</option>
                            <option value="suspended">Đình chỉ</option>
                            <option value="blocked">Bị khóa</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 font-medium">Đang tải dữ liệu...</div>
                    ) : (
                        <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                            <thead className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">Tên đăng nhập</th>
                                    <th className="px-6 py-4 min-w-[200px]">Họ và tên</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4 min-w-[170px]">Vai trò / Chức vụ</th>
                                    <th className="px-6 py-4">Trạng thái</th>
                                    <th className="px-6 py-4 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                                            Không tìm thấy tài khoản nào.
                                        </td>
                                    </tr>
                                ) : filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-indigo-50/40 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-slate-900 text-sm">{u.username}</td>
                                        <td className="px-6 py-4 font-bold text-indigo-700 text-sm">{u.profile?.fullName || '—'}</td>
                                        <td className="px-6 py-4 font-medium text-slate-500 font-mono text-xs">{u.email}</td>
                                        <td className="px-6 py-4">{getRoleBadge(u.role, u.profile)}</td>
                                        <td className="px-6 py-4">{getStatusBadge(u.status)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end items-center space-x-1.5">
                                                <button onClick={() => handleEdit(u)} className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-105 transition-all cursor-pointer" title="Sửa hồ sơ">
                                                    <Edit size={15} />
                                                </button>
                                                <button onClick={() => handleResetPassword(u)} className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 hover:bg-amber-100 hover:scale-105 transition-all cursor-pointer" title="Đặt lại mật khẩu">
                                                    <KeyRound size={15} />
                                                </button>
                                                {u.status !== 'active' && (
                                                    <button onClick={() => handleSetStatus(u, 'active')} className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:scale-105 transition-all cursor-pointer" title="Mở khóa tài khoản">
                                                        <Unlock size={15} />
                                                    </button>
                                                )}
                                                {u.status === 'active' && (
                                                    <button onClick={() => handleSetStatus(u, 'blocked')} className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-100 hover:scale-105 transition-all cursor-pointer" title="Khóa tài khoản">
                                                        <Lock size={15} />
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(u)} className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-100 hover:scale-105 transition-all cursor-pointer" title="Xóa vĩnh viễn">
                                                    <Trash2 size={15} />
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
                {isModalOpen && (
                    <UserFormModal 
                        isOpen={isModalOpen} 
                        onClose={() => setIsModalOpen(false)} 
                        user={selectedUser} 
                        classesList={classesList}
                        onSuccess={fetchUsers} 
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default UsersManagement;
