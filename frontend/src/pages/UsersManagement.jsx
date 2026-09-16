import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Swal from 'sweetalert2';
import api from '../services/api';
import { 
    Search, Plus, Filter, Edit, Lock, Unlock, KeyRound, Trash2, X, 
    ShieldAlert, UserCheck, UserX, AlertTriangle, Calendar, GraduationCap, 
    Users, PhoneCall, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateStudentCode, generateTeacherCode } from '../utils/codeGenerator';
import { PHONE_10_DIGITS_REGEX, PHONE_ERROR_MESSAGES, sanitizePhoneNumber } from '../utils/phoneValidation';

const TEACHER_POSITIONS = [
    'Hiệu trưởng',
    'Phó Hiệu trưởng',
    'Tổ trưởng chuyên môn',
    'Tổ phó chuyên môn',
    'Giáo viên bộ môn',
    'Bí thư Đoàn trường',
    'Giám thị'
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
                status: user.status || 'active',
                fullName: user.profile?.fullName || '',
                phone: user.profile?.phone || '',
                gender: user.profile?.gender || 'Nam',
                // Teacher fields
                teacherCode: user.profile?.teacherCode || '',
                position: user.profile?.position || 'Giáo viên bộ môn',
                subject: user.profile?.subject || user.profile?.specialization || '',
                department: user.profile?.department || '',
                // Student fields
                studentCode: user.profile?.studentCode || '',
                classId: user.profile?.classId || '',
                dateOfBirth: user.profile?.dateOfBirth ? String(user.profile.dateOfBirth).slice(0, 10) : '',
                parentName: user.profile?.parentName || '',
                parentPhone: user.profile?.parentPhone || '',
                academicYear: user.profile?.academicYear || '',
            });
        } else {
            reset({
                username: '',
                email: '',
                password: '',
                confirmPassword: '',
                role: 'student',
                status: 'active',
                fullName: '',
                phone: '',
                gender: 'Nam',
                teacherCode: generateTeacherCode(),
                position: 'Giáo viên bộ môn',
                subject: '',
                department: '',
                studentCode: generateStudentCode(),
                classId: '',
                dateOfBirth: '',
                parentName: '',
                parentPhone: '',
                academicYear: ''
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto border border-slate-200 flex flex-col"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/40 sticky top-0 z-10 backdrop-blur-md">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-slate-800">
                                {user ? 'Cập nhật Hồ sơ Người dùng' : 'Cấp tài khoản mới (Hệ thống)'}
                            </h2>
                            {user && (
                                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase bg-indigo-100 text-indigo-700 border border-indigo-200">
                                    {user.role === 'student' ? 'Học sinh' : user.role === 'teacher' ? 'Giáo viên' : 'Admin'}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {user ? 'Chỉnh sửa thông tin đăng nhập, hồ sơ cá nhân và quản lý trạng thái tài khoản' : 'Khởi tạo tài khoản và hồ sơ học sinh/giáo viên mới'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-xl hover:bg-white shadow-xs">
                        <X size={20} />
                    </button>
                </div>
                
                <form className="p-6 md:p-8 font-sans space-y-8" onSubmit={handleSubmit(onSubmit)}>
                    {/* SECTION 1: Thông tin đăng nhập & Trạng thái */}
                    <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-200/80">
                        <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm mb-4 pb-2 border-b border-slate-200/60">
                            <ShieldCheck size={18} />
                            <span>1. Thông tin Đăng nhập & Trạng thái tài khoản</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tên đăng nhập *</label>
                                <input 
                                    {...register('username', { 
                                        required: 'Tên đăng nhập là bắt buộc',
                                        minLength: { value: 3, message: 'Tên đăng nhập phải có ít nhất 3 ký tự' }
                                    })} 
                                    disabled={!!user}
                                    placeholder="VD: hs_nguyenvana"
                                    className={`w-full px-3.5 py-2 rounded-xl border outline-none text-sm font-medium disabled:bg-slate-100 disabled:text-slate-500 ${
                                        errors.username ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                                    }`} 
                                />
                                {errors.username && (
                                    <p className="text-rose-500 text-xs mt-1 font-medium">{errors.username.message}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email liên hệ *</label>
                                <input 
                                    type="email"
                                    {...register('email', { 
                                        required: 'Email là bắt buộc',
                                        pattern: {
                                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                            message: 'Email không đúng định dạng'
                                        }
                                    })} 
                                    placeholder="VD: user@school.edu.vn"
                                    className={`w-full px-3.5 py-2 rounded-xl border outline-none text-sm font-medium ${
                                        errors.email ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                                    }`} 
                                />
                                {errors.email && (
                                    <p className="text-rose-500 text-xs mt-1 font-medium">{errors.email.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Vai trò *</label>
                                <select 
                                    {...register('role')} 
                                    disabled={!!user}
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-semibold disabled:bg-slate-100 text-slate-700"
                                >
                                    <option value="student">Học sinh</option>
                                    <option value="teacher">Giáo viên</option>
                                    <option value="admin">Quản trị viên (Admin)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Trạng thái tài khoản *</label>
                                <select 
                                    {...register('status')} 
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-bold text-slate-800 bg-white"
                                >
                                    <option value="active">🟢 Hoạt động</option>
                                    <option value="suspended">🟡 Tạm khóa (Đình chỉ)</option>
                                    <option value="withdrawn">🟠 Đã thôi học</option>
                                    <option value="blocked">🔴 Khóa hoàn toàn</option>
                                </select>
                            </div>

                            {!user && (
                                <>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Mật khẩu ban đầu *</label>
                                        <input 
                                            type="password"
                                            autoComplete="new-password"
                                            {...register('password', { 
                                                required: !user ? 'Mật khẩu là bắt buộc' : false, 
                                                minLength: { value: 4, message: 'Mật khẩu phải có ít nhất 4 ký tự' }
                                            })} 
                                            placeholder="Tối thiểu 4 ký tự (mặc định: 1111)"
                                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium" 
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Xác nhận mật khẩu *</label>
                                        <input 
                                            type="password"
                                            autoComplete="new-password"
                                            {...register('confirmPassword', { 
                                                required: !user ? 'Vui lòng xác nhận mật khẩu' : false,
                                                validate: (val) => (!user && val !== watch('password') ? 'Mật khẩu xác nhận không khớp' : true)
                                            })} 
                                            placeholder="Nhập lại mật khẩu"
                                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium" 
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* SECTION 2: Hồ sơ chi tiết theo vai trò */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm mb-4 pb-2 border-b border-slate-100">
                            <GraduationCap size={18} />
                            <span>2. Hồ sơ Chi tiết {role === 'student' ? 'Học sinh' : role === 'teacher' ? 'Giáo viên' : 'Quản trị viên'}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {/* Họ và tên chung */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Họ và Tên *</label>
                                <input 
                                    {...register('fullName', { required: 'Họ và tên là bắt buộc' })} 
                                    placeholder="VD: Nguyễn Văn A"
                                    className={`w-full px-3.5 py-2 rounded-xl border outline-none text-sm font-medium ${
                                        errors.fullName ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                                    }`} 
                                />
                                {errors.fullName && (
                                    <p className="text-rose-500 text-xs mt-1 font-medium">{errors.fullName.message}</p>
                                )}
                            </div>

                            {/* Số điện thoại cá nhân */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Số điện thoại cá nhân *</label>
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
                                    className={`w-full px-3.5 py-2 rounded-xl border outline-none text-sm font-medium ${
                                        errors.phone ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                                    }`} 
                                />
                                {errors.phone && (
                                    <p className="text-rose-500 text-xs mt-1 font-medium">{errors.phone.message}</p>
                                )}
                            </div>

                            {/* Giới tính */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Giới tính</label>
                                <select {...register('gender')} className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none text-sm bg-white font-medium text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                                    <option value="Nam">Nam</option>
                                    <option value="Nữ">Nữ</option>
                                    <option value="Khác">Khác</option>
                                </select>
                            </div>

                            {/* Teacher specific fields */}
                            {role === 'teacher' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Mã Giáo viên (Bất biến) *</label>
                                        <div className="relative flex items-center">
                                            <input 
                                                {...register('teacherCode')} 
                                                readOnly
                                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 font-mono font-bold text-indigo-600 outline-none cursor-not-allowed text-sm pl-9" 
                                            />
                                            <Lock size={15} className="absolute left-3 text-slate-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Chức vụ trong trường *</label>
                                        <select {...register('position')} className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none text-sm bg-white font-medium text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                                            {TEACHER_POSITIONS.map(pos => (
                                                <option key={pos} value={pos}>{pos}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Bộ môn giảng dạy</label>
                                        <input {...register('subject')} placeholder="VD: Toán học" className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                                    </div>
                                </>
                            )}

                            {/* Student specific fields */}
                            {role === 'student' && (
                                <>
                                    {/* Mã học sinh - Bất biến */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Mã Học sinh (Bất biến) *</label>
                                            <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5">
                                                <Lock size={11} /> Không thể sửa
                                            </span>
                                        </div>
                                        <div className="relative flex items-center">
                                            <input 
                                                {...register('studentCode')} 
                                                readOnly
                                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 font-mono font-bold text-indigo-600 outline-none cursor-not-allowed text-sm pl-9 select-all" 
                                            />
                                            <Lock size={15} className="absolute left-3 text-indigo-400" />
                                        </div>
                                    </div>

                                    {/* Ngày sinh */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Ngày sinh</label>
                                        <div className="relative flex items-center">
                                            <input 
                                                type="date"
                                                {...register('dateOfBirth')} 
                                                max={new Date().toISOString().split('T')[0]}
                                                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none text-sm font-medium text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" 
                                            />
                                        </div>
                                    </div>

                                    {/* Lớp học */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Lớp học</label>
                                        <select {...register('classId')} className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none text-sm bg-white font-medium text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                                            <option value="">-- Chưa phân lớp --</option>
                                            {classesList.map(c => (
                                                <option key={c.id} value={c.id}>{c.className} (Khối {c.grade})</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Năm học / Niên khóa */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Năm học / Niên khóa</label>
                                        <input 
                                            {...register('academicYear')} 
                                            placeholder="VD: 2024-2027 hoặc K24" 
                                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" 
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* SECTION 3: Thông tin Phụ huynh & Liên hệ khẩn cấp (Học sinh) */}
                    {role === 'student' && (
                        <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-200/70">
                            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-4 pb-2 border-b border-amber-200/50">
                                <Users size={18} />
                                <span>3. Thông tin Phụ huynh & Liên hệ Khẩn cấp</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Họ và tên Phụ huynh / Người giám hộ</label>
                                    <input 
                                        {...register('parentName')} 
                                        placeholder="VD: Nguyễn Văn Phụ Huynh"
                                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white outline-none text-sm font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-100" 
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">SĐT Phụ huynh (Liên hệ khẩn cấp)</label>
                                    <div className="relative flex items-center">
                                        <input 
                                            type="tel"
                                            {...register('parentPhone', {
                                                pattern: {
                                                    value: PHONE_10_DIGITS_REGEX,
                                                    message: 'SĐT phụ huynh phải gồm đúng 10 chữ số, bắt đầu bằng 0'
                                                }
                                            })} 
                                            onInput={(e) => {
                                                const cleaned = sanitizePhoneNumber(e.target.value);
                                                e.target.value = cleaned;
                                                setValue('parentPhone', cleaned, { shouldValidate: true });
                                            }}
                                            placeholder="VD: 0988123456"
                                            maxLength={10}
                                            className={`w-full px-3.5 py-2 rounded-xl border bg-white outline-none text-sm font-medium pl-9 ${
                                                errors.parentPhone ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                                            }`} 
                                        />
                                        <PhoneCall size={15} className="absolute left-3 text-amber-600" />
                                    </div>
                                    {errors.parentPhone && (
                                        <p className="text-rose-500 text-xs mt-1 font-medium">{errors.parentPhone.message}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer buttons */}
                    <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-100">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors font-semibold text-sm cursor-pointer"
                        >
                            Hủy bỏ
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    Đang lưu...
                                </>
                            ) : (
                                'Lưu thay đổi'
                            )}
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
            active: { text: 'Mở hoạt động / Kích hoạt', color: '#10b981' },
            suspended: { text: 'Đình chỉ hoạt động', color: '#f59e0b' },
            withdrawn: { text: 'Cho thôi học', color: '#64748b' },
            blocked: { text: 'Khóa hoàn toàn tài khoản', color: '#ef4444' }
        };

        const target = statusMap[newStatus] || { text: newStatus, color: '#6366f1' };

        const { value: reason } = await Swal.fire({
            title: `Xác nhận ${target.text}?`,
            text: `Bạn có chắc muốn chuyển tài khoản ${user.username} (${user.profile?.fullName || user.role}) sang trạng thái "${target.text}"?`,
            input: 'textarea',
            inputLabel: 'Lý do thực hiện (Audit Log):',
            inputPlaceholder: newStatus === 'active' 
                ? 'Nhập lý do kích hoạt lại tài khoản...' 
                : 'Nhập lý do khóa / đình chỉ (VD: Vi phạm nội quy, học sinh tạm nghỉ học, nghỉ công tác...)',
            inputValidator: (val) => {
                if (newStatus !== 'active' && (!val || !val.trim())) {
                    return 'Vui lòng nhập lý do để ghi nhận vào hệ thống kiểm toán!';
                }
            },
            icon: newStatus === 'active' ? 'question' : 'warning',
            showCancelButton: true,
            confirmButtonColor: target.color,
            cancelButtonText: 'Hủy bỏ',
            confirmButtonText: 'Xác nhận thực hiện'
        });

        if (reason !== undefined) {
            try {
                const res = await api.patch(`/users/${user.id}/status`, { 
                    status: newStatus,
                    reason: reason ? reason.trim() : 'Thay đổi trạng thái tài khoản'
                });
                Swal.fire('Thành công', res.data?.message || `Đã chuyển tài khoản sang: ${target.text}`, 'success');
                fetchUsers();
            } catch (error) {
                Swal.fire('Lỗi', error.response?.data?.message || 'Không thể đổi trạng thái', 'error');
            }
        }
    };

    const handleResetPassword = async (user) => {
        const eyeOpenSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
        const eyeOffSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`;

        const { value: formValues } = await Swal.fire({
            title: `Đặt lại mật khẩu cho ${user.username}`,
            html: `
                <!-- Fake inputs to prevent aggressive browser autofill -->
                <input style="display:none" type="text" name="fakeusernameremembered"/>
                <input style="display:none" type="password" name="fakepasswordremembered"/>
                <div style="text-align: left; margin: 15px 0 12px 0;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px;">Mật khẩu mới</label>
                    <div style="position: relative; display: flex; align-items: center;">
                        <input id="swal-input1" type="password" autocomplete="new-password" placeholder="Nhập mật khẩu mới (tối thiểu 4 ký tự)" class="swal2-input" style="margin: 0; width: 100%; height: 42px; font-size: 14px; padding-right: 42px; box-sizing: border-box;" />
                        <button type="button" id="toggle-p1" tabindex="-1" style="position: absolute; right: 12px; background: transparent; border: none; cursor: pointer; color: #64748b; display: flex; align-items: center; justify-content: center; padding: 4px;" title="Ẩn/Hiện mật khẩu">
                            ${eyeOffSvg}
                        </button>
                    </div>
                </div>
                <div style="text-align: left; margin-bottom: 15px;">
                    <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px;">Xác nhận mật khẩu mới</label>
                    <div style="position: relative; display: flex; align-items: center;">
                        <input id="swal-input2" type="password" autocomplete="new-password" placeholder="Nhập lại mật khẩu mới" class="swal2-input" style="margin: 0; width: 100%; height: 42px; font-size: 14px; padding-right: 42px; box-sizing: border-box;" />
                        <button type="button" id="toggle-p2" tabindex="-1" style="position: absolute; right: 12px; background: transparent; border: none; cursor: pointer; color: #64748b; display: flex; align-items: center; justify-content: center; padding: 4px;" title="Ẩn/Hiện mật khẩu">
                            ${eyeOffSvg}
                        </button>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Cập nhật',
            cancelButtonText: 'Hủy',
            didOpen: () => {
                const p1 = document.getElementById('swal-input1');
                const p2 = document.getElementById('swal-input2');
                const btn1 = document.getElementById('toggle-p1');
                const btn2 = document.getElementById('toggle-p2');

                // Clear any unwanted autofill
                const resetVal = () => {
                    if (p1 && p1.value) p1.value = '';
                    if (p2 && p2.value) p2.value = '';
                };
                resetVal();
                setTimeout(resetVal, 50);
                setTimeout(resetVal, 150);
                setTimeout(resetVal, 300);

                if (btn1 && p1) {
                    btn1.addEventListener('click', (e) => {
                        e.preventDefault();
                        const isPass = p1.type === 'password';
                        p1.type = isPass ? 'text' : 'password';
                        btn1.innerHTML = isPass ? eyeOpenSvg : eyeOffSvg;
                    });
                }

                if (btn2 && p2) {
                    btn2.addEventListener('click', (e) => {
                        e.preventDefault();
                        const isPass = p2.type === 'password';
                        p2.type = isPass ? 'text' : 'password';
                        btn2.innerHTML = isPass ? eyeOpenSvg : eyeOffSvg;
                    });
                }

                setTimeout(() => {
                    if (p1) p1.focus();
                }, 100);
            },
            preConfirm: () => {
                const p1 = document.getElementById('swal-input1')?.value?.trim();
                const p2 = document.getElementById('swal-input2')?.value?.trim();
                if (!p1 || p1.length < 4) {
                    Swal.showValidationMessage('Mật khẩu phải có ít nhất 4 ký tự');
                    return false;
                } else if (p1 !== p2) {
                    Swal.showValidationMessage('Mật khẩu xác nhận không khớp');
                    return false;
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
                    <span className="whitespace-nowrap bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-2xs">
                        {profile?.position || 'Giáo viên bộ môn'}
                    </span>
                    {profile?.homeroomClasses && profile.homeroomClasses.length > 0 && (
                        <span className="whitespace-nowrap text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-full">
                            CN: {profile.homeroomClasses.map(c => c.className).join(', ')}
                        </span>
                    )}
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
        if (status === 'withdrawn') {
            return (
                <span className="whitespace-nowrap px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Đã thôi học
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
                            <option value="withdrawn">Đã thôi học</option>
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
