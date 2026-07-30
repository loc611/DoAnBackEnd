import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Swal from 'sweetalert2';
import api from '../services/api';
import { Search, Plus, Edit, Trash2, X, Eye, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

const ClassFormModal = ({ isOpen, onClose, classData, onSuccess }) => {
    const { register, handleSubmit, reset } = useForm();
    const [loading, setLoading] = useState(false);
    const [teachers, setTeachers] = useState([]);

    useEffect(() => {
        if (isOpen) {
            fetchTeachers();
            if (classData) {
                reset({
                    classCode: classData.classCode,
                    className: classData.className,
                    grade: classData.grade,
                    schoolYear: classData.schoolYear,
                    homeroomTeacher: classData.homeroomTeacher?.id || '',
                    description: classData.description || '',
                    status: classData.status
                });
            } else {
                reset({
                    classCode: '',
                    className: '',
                    grade: '10',
                    schoolYear: '2023-2024',
                    homeroomTeacher: '',
                    description: '',
                    status: 'active'
                });
            }
        }
    }, [classData, isOpen, reset]);

    const fetchTeachers = async () => {
        try {
            // Wait, we need to fetch all teachers.
            // The /api/users endpoint returns all users and their profiles.
            // We can filter by role = teacher.
            const res = await api.get('/users');
            const teacherList = res.data.filter(u => u.role === 'teacher').map(u => u.profile);
            setTeachers(teacherList.filter(t => t != null));
        } catch (error) {
            console.error("Lỗi lấy danh sách giáo viên", error);
        }
    };

    const onSubmit = async (data) => {
        try {
            setLoading(true);
            const payload = {
                ...data,
                homeroomTeacher: data.homeroomTeacher || null
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">Mã lớp *</label>
                            <input 
                                {...register('classCode', { required: true })} 
                                disabled={!!classData}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tên lớp *</label>
                            <input 
                                {...register('className', { required: true })} 
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Khối</label>
                            <select {...register('grade')} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none" disabled={!!classData}>
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
                                placeholder="VD: 2023-2024"
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100" 
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Giáo viên chủ nhiệm</label>
                            <select {...register('homeroomTeacher')} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none">
                                <option value="">-- Chưa phân công --</option>
                                {teachers.map(t => (
                                    <option key={t.id} value={t.id}>{t.fullName} ({t.teacherCode})</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
                            <textarea 
                                {...register('description')} 
                                rows="3"
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" 
                            ></textarea>
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

const Classes = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);
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

    const handleEdit = (c) => {
        setSelectedClass(c);
        setIsModalOpen(true);
    };

    const handleDelete = async (c) => {
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
        const matchSearch = c.className.toLowerCase().includes(searchTerm.toLowerCase()) || c.classCode.toLowerCase().includes(searchTerm.toLowerCase());
        const matchGrade = gradeFilter ? c.grade === gradeFilter : true;
        return matchSearch && matchGrade;
    });

    return (
        <div className="space-y-6 font-poppins">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Quản lý Lớp học</h2>
                <button onClick={handleAdd} className="btn-primary flex items-center">
                    <Plus size={20} className="mr-2" />
                    Thêm Lớp học
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
                            placeholder="Tìm mã lớp, tên lớp..."
                            className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex space-x-2 w-full sm:w-auto">
                        <select 
                            value={gradeFilter} 
                            onChange={e => setGradeFilter(e.target.value)}
                            className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none text-sm bg-white"
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
                        <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
                    ) : (
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-700 font-medium">
                                <tr>
                                    <th className="px-6 py-4 border-b border-gray-100">Mã Lớp</th>
                                    <th className="px-6 py-4 border-b border-gray-100">Tên Lớp</th>
                                    <th className="px-6 py-4 border-b border-gray-100">Khối</th>
                                    <th className="px-6 py-4 border-b border-gray-100">Sĩ số</th>
                                    <th className="px-6 py-4 border-b border-gray-100">GV Chủ nhiệm</th>
                                    <th className="px-6 py-4 border-b border-gray-100">Trạng thái</th>
                                    <th className="px-6 py-4 border-b border-gray-100 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredClasses.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                            Không có lớp học nào.
                                        </td>
                                    </tr>
                                ) : filteredClasses.map((c) => (
                                    <tr key={c.id} className="hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-0">
                                        <td className="px-6 py-4 font-medium text-gray-800">{c.classCode}</td>
                                        <td className="px-6 py-4 font-bold text-blue-600">{c.className}</td>
                                        <td className="px-6 py-4">Khối {c.grade}</td>
                                        <td className="px-6 py-4 font-medium"><Users size={16} className="inline mr-1 text-gray-400" />{c.studentCount}</td>
                                        <td className="px-6 py-4">{c.homeroomTeacher?.fullName || <span className="text-gray-400 italic">Chưa có</span>}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {c.status === 'active' ? 'Hoạt động' : 'Đã đóng'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end space-x-1">
                                                <button onClick={() => navigate(`/classes/${c.id}`)} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors" title="Xem chi tiết & DSSH">
                                                    <Eye size={18} />
                                                </button>
                                                <button onClick={() => handleEdit(c)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Sửa thông tin">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(c)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa lớp">
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
                <ClassFormModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    classData={selectedClass} 
                    onSuccess={fetchClasses} 
                />
            </AnimatePresence>
        </div>
    );
};

export default Classes;
