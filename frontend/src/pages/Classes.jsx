import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Swal from 'sweetalert2';
import api from '../services/api';
import { Search, Plus, Edit, Trash2, X, Eye, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

const ClassFormModal = ({ isOpen, onClose, classData, onSuccess, allClasses }) => {
    const { register, handleSubmit, reset, watch, setValue } = useForm();
    const [loading, setLoading] = useState(false);
    const [teachers, setTeachers] = useState([]);

    const classNameValue = watch('className') || '';

    useEffect(() => {
        if (isOpen) {
            fetchTeachers();
            if (classData) {
                const match = classData.className?.trim().match(/^(10|11|12)/);
                const derivedGrade = match ? match[1] : (classData.grade ? String(classData.grade) : '10');
                reset({
                    className: classData.className || '',
                    grade: derivedGrade,
                    schoolYear: classData.academicYear || '2025-2026',
                    homeroomTeacherId: classData.homeroomTeacher?.id || '',
                    status: classData.status || 'active'
                });
            } else {
                reset({
                    className: '',
                    grade: '10',
                    schoolYear: '2025-2026',
                    homeroomTeacherId: '',
                    status: 'active'
                });
            }
        }
    }, [classData, isOpen, reset]);

    // Automatically synchronize grade when user types className
    useEffect(() => {
        if (classNameValue) {
            const match = classNameValue.trim().match(/^(10|11|12)/);
            if (match) {
                setValue('grade', match[1]);
            } else {
                setValue('grade', '');
            }
        }
    }, [classNameValue, setValue]);

    const fetchTeachers = async () => {
        try {
            const res = await api.get('/users');
            const teacherList = res.data.filter(u => u.role === 'teacher').map(u => u.profile);
            setTeachers(teacherList.filter(t => t != null));
        } catch (error) {
            console.error("Lỗi lấy danh sách giáo viên", error);
        }
    };

    const currentSchoolYear = watch('schoolYear') || '2025-2026';
    
    const availableTeachers = teachers.filter(t => {
        const assignedClass = allClasses?.find(c => c.homeroomTeacherId === t.id && c.academicYear === currentSchoolYear);
        if (!assignedClass) return true;
        if (classData && assignedClass.id === classData.id) return true;
        return false;
    });

    const onSubmit = async (data) => {
        try {
            const trimmedClassName = data.className?.trim() || '';
            const match = trimmedClassName.match(/^(10|11|12)/);
            if (!match) {
                return Swal.fire('Tên lớp không hợp lệ', 'Tên lớp phải bắt đầu bằng khối 10, 11 hoặc 12 (VD: 10A1, 11B2, 12 Tin)', 'warning');
            }

            setLoading(true);
            const payload = {
                ...data,
                className: trimmedClassName,
                grade: parseInt(match[1], 10),
                homeroomTeacherId: data.homeroomTeacherId || null
            };

            if (classData) {
                await api.put(`/classes/${classData.id}`, payload);
                Swal.fire('Thành công', 'Cập nhật lớp học thành công', 'success');
            } else {
                await api.post('/classes', payload);
                Swal.fire('Thành công', 'Tạo lớp học mới thành công', 'success');
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
                className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-gray-800">
                        {classData ? 'Chỉnh sửa Lớp học' : 'Thêm Lớp học mới'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
                        <X size={24} />
                    </button>
                </div>
                
                <form className="p-6" onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tên lớp * <span className="text-xs text-gray-400 font-normal">(VD: 10A1, 11B2, 12 Tin)</span>
                            </label>
                            <input 
                                {...register('className', { required: true })} 
                                placeholder="Nhập tên lớp..."
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Khối <span className="text-xs text-blue-500 font-normal">(Tự động theo tên lớp)</span>
                            </label>
                            <select 
                                {...register('grade')} 
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-100 text-gray-700 outline-none cursor-not-allowed font-medium" 
                                disabled
                            >
                                <option value="">-- Chưa xác định --</option>
                                <option value="10">Khối 10</option>
                                <option value="11">Khối 11</option>
                                <option value="12">Khối 12</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Năm học</label>
                            <input 
                                {...register('schoolYear', { required: true })} 
                                disabled={!!classData}
                                placeholder="VD: 2025-2026"
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100" 
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Giáo viên chủ nhiệm</label>
                            <select {...register('homeroomTeacherId')} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none">
                                <option value="">-- Chưa phân công --</option>
                                {availableTeachers.map(t => (
                                    <option key={t.id} value={t.id}>{t.fullName} ({t.teacherCode})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                            <select {...register('status')} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none">
                                <option value="active">Đang hoạt động</option>
                                <option value="inactive">Đã đóng</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                            Hủy bỏ
                        </button>
                        <button type="submit" disabled={loading} className="btn-primary px-5 py-2.5 disabled:opacity-50">
                            {loading ? 'Đang lưu...' : 'Lưu Lớp học'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const ClassRosterModal = ({ isOpen, onClose, selectedClass, onRefreshClasses }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [eligibleStudents, setEligibleStudents] = useState([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    const [addLoading, setAddLoading] = useState(false);

    useEffect(() => {
        if (isOpen && selectedClass) {
            fetchRoster();
        }
    }, [isOpen, selectedClass]);

    const fetchRoster = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/classes/${selectedClass.id}/students`);
            setStudents(res.data || []);
        } catch (error) {
            console.error('Error fetching roster:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEligibleStudents = async () => {
        try {
            setAddLoading(true);
            const res = await api.get('/students');
            const unassigned = (res.data || []).filter(s => s.classId !== selectedClass.id);
            setEligibleStudents(unassigned);
            setSelectedStudentIds([]);
        } catch (error) {
            console.error(error);
        } finally {
            setAddLoading(false);
        }
    };

    const handleOpenAddStudent = () => {
        setIsAddStudentOpen(true);
        fetchEligibleStudents();
    };

    const handleConfirmAddStudents = async () => {
        if (selectedStudentIds.length === 0) return;
        try {
            setAddLoading(true);
            await api.post(`/classes/${selectedClass.id}/students`, { studentIds: selectedStudentIds });
            Swal.fire('Thành công', `Đã thêm ${selectedStudentIds.length} học sinh vào lớp ${selectedClass.className}`, 'success');
            setIsAddStudentOpen(false);
            fetchRoster();
            if (onRefreshClasses) onRefreshClasses();
        } catch (error) {
            Swal.fire('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra khi thêm học sinh', 'error');
        } finally {
            setAddLoading(false);
        }
    };

    const handleRemoveStudent = async (student) => {
        const result = await Swal.fire({
            title: 'Xóa học sinh khỏi lớp?',
            text: `Bạn có chắc muốn xóa ${student.fullName} khỏi lớp ${selectedClass.className}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonText: 'Hủy',
            confirmButtonText: 'Đồng ý xóa'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/classes/${selectedClass.id}/students/${student.id}`);
                Swal.fire('Thành công', 'Đã xóa học sinh khỏi lớp', 'success');
                fetchRoster();
                if (onRefreshClasses) onRefreshClasses();
            } catch (error) {
                Swal.fire('Lỗi', error.response?.data?.message || 'Lỗi khi xóa học sinh', 'error');
            }
        }
    };

    if (!isOpen || !selectedClass) return null;

    const filtered = students.filter(s => 
        s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.phone && s.phone.includes(searchTerm))
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200"
            >
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                            <Users size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-black">Danh sách Học sinh - Lớp {selectedClass.className}</h2>
                                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold uppercase">
                                    Khối {selectedClass.grade}
                                </span>
                            </div>
                            <p className="text-xs text-indigo-200 mt-0.5 font-medium">
                                GVCN: {selectedClass.homeroomTeacher?.fullName || 'Chưa phân công'} • Sĩ số hiện tại: {students.length} học sinh
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full sm:w-80">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm mã HS, tên học sinh..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={handleOpenAddStudent}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
                        >
                            <Plus size={16} /> Thêm học sinh vào lớp
                        </button>
                    </div>
                </div>

                {/* Student Table */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 text-sm">Đang tải danh sách học sinh...</div>
                    ) : filtered.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 text-sm">Lớp này hiện chưa có học sinh nào. Hãy bấm "+ Thêm học sinh vào lớp".</div>
                    ) : (
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3">STT</th>
                                    <th className="px-4 py-3">Mã Học Sinh</th>
                                    <th className="px-4 py-3">Họ và Tên</th>
                                    <th className="px-4 py-3">Giới tính</th>
                                    <th className="px-4 py-3">Số điện thoại</th>
                                    <th className="px-4 py-3 text-center">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((student, idx) => (
                                    <tr key={student.id} className="hover:bg-indigo-50/40 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-400">{idx + 1}</td>
                                        <td className="px-4 py-3 font-bold text-indigo-700">{student.studentCode}</td>
                                        <td className="px-4 py-3 font-bold text-slate-900">{student.fullName}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                student.gender === 'Nữ' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {student.gender || 'Nam'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-700">{student.phone || '—'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => handleRemoveStudent(student)}
                                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                title="Xóa khỏi lớp"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Submodal for Adding Students */}
                <AnimatePresence>
                    {isAddStudentOpen && (
                        <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col border border-slate-200"
                            >
                                <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                    <h3 className="text-base font-bold text-slate-800">Chọn học sinh thêm vào lớp {selectedClass.className}</h3>
                                    <button onClick={() => setIsAddStudentOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="p-4 flex-1 overflow-y-auto space-y-2">
                                    {addLoading ? (
                                        <div className="p-8 text-center text-slate-500 text-sm">Đang tải...</div>
                                    ) : eligibleStudents.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 text-sm">Tất cả học sinh đã có lớp.</div>
                                    ) : (
                                        eligibleStudents.map(st => {
                                            const checked = selectedStudentIds.includes(st.id);
                                            return (
                                                <div
                                                    key={st.id}
                                                    onClick={() => setSelectedStudentIds(prev => 
                                                        prev.includes(st.id) ? prev.filter(x => x !== st.id) : [...prev, st.id]
                                                    )}
                                                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                                        checked ? 'border-indigo-500 bg-indigo-50/60' : 'border-slate-200 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => {}}
                                                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                                        />
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800">{st.fullName}</p>
                                                            <p className="text-xs text-slate-500 font-medium">Mã: {st.studentCode} • Lớp cũ: {st.class?.className || 'Chưa có lớp'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                                    <span className="text-xs font-semibold text-slate-600">Đã chọn: <strong className="text-indigo-700">{selectedStudentIds.length}</strong> học sinh</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsAddStudentOpen(false)} className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg">Hủy</button>
                                        <button
                                            onClick={handleConfirmAddStudents}
                                            disabled={selectedStudentIds.length === 0 || addLoading}
                                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm"
                                        >
                                            Xác nhận thêm ({selectedStudentIds.length})
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

const Classes = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);
    const [rosterClass, setRosterClass] = useState(null);
    const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            setLoading(true);
            const res = await api.get('/classes');
            setClasses(res.data);
        } catch (error) {
            Swal.fire('Lỗi', 'Không thể tải danh sách lớp học', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setSelectedClass(null);
        setIsModalOpen(true);
    };

    const handleEdit = (c, e) => {
        if (e) e.stopPropagation();
        setSelectedClass(c);
        setIsModalOpen(true);
    };

    const handleViewRoster = (c, e) => {
        if (e) e.stopPropagation();
        setRosterClass(c);
        setIsRosterModalOpen(true);
    };

    const handleDelete = async (c, e) => {
        if (e) e.stopPropagation();
        if (c.studentCount > 0) {
            return Swal.fire('Không thể xóa', 'Lớp học vẫn còn học sinh. Vui lòng chuyển hoặc xóa học sinh trước.', 'warning');
        }

        const result = await Swal.fire({
            title: 'Xóa lớp học?',
            text: `Bạn có chắc muốn xóa lớp ${c.className}? Hành động này không thể hoàn tác.`,
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonText: 'Hủy',
            confirmButtonText: 'Xóa ngay'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/classes/${c.id}`);
                Swal.fire('Đã xóa!', 'Lớp học đã bị xóa.', 'success');
                fetchClasses();
            } catch (error) {
                Swal.fire('Lỗi', error.response?.data?.message || 'Xóa thất bại', 'error');
            }
        }
    };

    const filteredClasses = classes.filter(c => {
        const matchSearch = c.className.toLowerCase().includes(searchTerm.toLowerCase());
        const matchGrade = gradeFilter ? c.grade === parseInt(gradeFilter) : true;
        return matchSearch && matchGrade;
    });

    return (
        <div className="space-y-6 font-sans">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Quản lý Lớp học</h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">Bấm vào bất kỳ dòng nào để xem danh sách học sinh của lớp</p>
                </div>
                <button onClick={handleAdd} className="btn-primary flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer">
                    <Plus size={18} className="mr-2" />
                    Thêm Lớp học
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
                    <div className="relative w-full sm:w-1/3">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Tìm mã lớp, tên lớp..."
                            className="pl-10 pr-4 py-2.5 w-full border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex space-x-2 w-full sm:w-auto">
                        <select 
                            value={gradeFilter} 
                            onChange={e => setGradeFilter(e.target.value)}
                            className="px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-white font-medium text-slate-700"
                        >
                            <option value="">Tất cả Khối</option>
                            <option value="10">Khối 10</option>
                            <option value="11">Khối 11</option>
                            <option value="12">Khối 12</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Đang tải dữ liệu...</div>
                    ) : (
                        <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                            <thead className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">Tên Lớp</th>
                                    <th className="px-6 py-4">Khối</th>
                                    <th className="px-6 py-4">Sĩ số</th>
                                    <th className="px-6 py-4 min-w-[200px]">GV Chủ nhiệm</th>
                                    <th className="px-6 py-4">Trạng thái</th>
                                    <th className="px-6 py-4 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredClasses.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                                            Không có lớp học nào.
                                        </td>
                                    </tr>
                                ) : filteredClasses.map((c) => (
                                    <tr 
                                        key={c.id} 
                                        onClick={() => handleViewRoster(c)}
                                        className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4 font-bold text-indigo-600 group-hover:text-indigo-800 text-base">
                                            {c.className}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-slate-700">Khối {c.grade}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold shadow-2xs">
                                                <Users size={13} className="text-indigo-600" />
                                                {c.studentCount} HS
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-800">
                                            {c.homeroomTeacher?.fullName || <span className="text-slate-400 italic font-normal">Chưa phân công</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                                                c.status === 'active' 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                                {c.status === 'active' ? 'Hoạt động' : 'Đã đóng'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end items-center space-x-1.5">
                                                <button 
                                                    onClick={(e) => handleViewRoster(c, e)} 
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-105 transition-all cursor-pointer" 
                                                    title="Xem danh sách học sinh trong lớp"
                                                >
                                                    <Eye size={15} />
                                                </button>
                                                <button 
                                                    onClick={(e) => handleEdit(c, e)} 
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-105 transition-all cursor-pointer" 
                                                    title="Sửa thông tin lớp"
                                                >
                                                    <Edit size={15} />
                                                </button>
                                                <button 
                                                    onClick={(e) => handleDelete(c, e)} 
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-100 hover:scale-105 transition-all cursor-pointer" 
                                                    title="Xóa lớp"
                                                >
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
                    <ClassFormModal 
                        isOpen={isModalOpen} 
                        onClose={() => setIsModalOpen(false)} 
                        classData={selectedClass} 
                        onSuccess={fetchClasses} 
                        allClasses={classes}
                    />
                )}
                {isRosterModalOpen && (
                    <ClassRosterModal
                        isOpen={isRosterModalOpen}
                        onClose={() => setIsRosterModalOpen(false)}
                        selectedClass={rosterClass}
                        onRefreshClasses={fetchClasses}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Classes;
