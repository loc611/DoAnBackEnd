import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api';
import { ArrowLeft, UserPlus, UserMinus, Search, Users, GraduationCap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AddStudentModal = ({ isOpen, onClose, classId, onSuccess }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        if (isOpen) {
            fetchEligibleStudents();
            setSelectedIds([]);
            setSearchTerm('');
        }
    }, [isOpen]);

    const fetchEligibleStudents = async () => {
        try {
            setLoading(true);
            const res = await api.get('/users');
            // Filter students who are not in this class
            const eligible = res.data
                .filter(u => u.role === 'student' && u.profile && u.profile.classId !== classId)
                .map(u => ({
                    id: u.profile.id, // Notice we need Student document id, wait, the API expects Student id or User id?
                    // userController creates Student with userId.
                    // When we add students to class, we update Student collection. So we need Student id.
                    studentId: u.profile.id,
                    studentCode: u.profile.studentCode,
                    fullName: u.profile.fullName,
                    currentClassId: u.profile.classId
                }));
            setStudents(eligible);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSelect = (studentId) => {
        setSelectedIds(prev => 
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };

    const handleAdd = async () => {
        if (selectedIds.length === 0) return;
        try {
            setLoading(true);
            await api.post(`/classes/${classId}/students`, { studentIds: selectedIds });
            Swal.fire('Thành công', `Đã gán ${selectedIds.length} học sinh vào lớp`, 'success');
            onSuccess();
            onClose();
        } catch (error) {
            Swal.fire('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(s => 
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.studentCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-800">Thêm Học sinh vào lớp</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm mã học sinh, tên..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Đang tải danh sách...</div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">Không tìm thấy học sinh nào khả dụng.</div>
                    ) : (
                        <div className="space-y-2">
                            {filteredStudents.map(s => (
                                <div 
                                    key={s.studentId} 
                                    onClick={() => handleToggleSelect(s.studentId)}
                                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${selectedIds.includes(s.studentId) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.includes(s.studentId)}
                                            readOnly
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                        <div>
                                            <p className="font-medium text-gray-800">{s.fullName}</p>
                                            <p className="text-xs text-gray-500">Mã: {s.studentCode} {s.currentClassId ? '(Đang ở lớp khác)' : '(Chưa có lớp)'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-600">Đã chọn: {selectedIds.length} học sinh</span>
                    <div className="flex space-x-3">
                        <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white transition-colors font-medium">Hủy</button>
                        <button onClick={handleAdd} disabled={selectedIds.length === 0 || loading} className="btn-primary px-5 py-2.5 disabled:opacity-50">
                            Thêm vào lớp
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const ClassDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [classInfo, setClassInfo] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchClassDetails();
    }, [id]);

    const fetchClassDetails = async () => {
        try {
            setLoading(true);
            const resClass = await api.get(`/classes/${id}`);
            setClassInfo(resClass.data);
            
            const resStudents = await api.get(`/classes/${id}/students`);
            setStudents(resStudents.data);
        } catch (error) {
            Swal.fire('Lỗi', 'Không thể tải thông tin lớp học', 'error');
            navigate('/classes');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveStudent = async (student) => {
        const result = await Swal.fire({
            title: 'Xóa khỏi lớp?',
            text: `Xóa học sinh ${student.fullName} khỏi lớp ${classInfo.className}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonText: 'Hủy',
            confirmButtonText: 'Đồng ý'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/classes/${id}/students/${student.id}`);
                Swal.fire('Thành công', 'Đã xóa học sinh khỏi lớp', 'success');
                fetchClassDetails();
            } catch (error) {
                Swal.fire('Lỗi', 'Có lỗi xảy ra', 'error');
            }
        }
    };

    if (loading || !classInfo) return <div className="p-8 text-center">Đang tải...</div>;

    return (
        <div className="space-y-6 font-poppins">
            <div className="flex items-center gap-4 mb-2">
                <button onClick={() => navigate('/classes')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-2xl font-bold text-gray-800">Chi tiết Lớp {classInfo.className}</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Thông tin chung */}
                <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit">
                    <h3 className="text-lg font-bold text-gray-800 border-b pb-3 mb-4">Thông tin chung</h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Tên lớp</p>
                            <p className="font-semibold text-gray-800">{classInfo.className || classInfo.classCode}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Khối - Năm học</p>
                            <p className="font-medium text-gray-800">Khối {classInfo.grade} ({classInfo.academicYear || classInfo.schoolYear || '2026-2027'})</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Giáo viên chủ nhiệm</p>
                            {classInfo.homeroomTeacher ? (
                                <div className="flex items-center gap-2">
                                    <GraduationCap size={18} className="text-blue-600" />
                                    <span className="font-medium text-blue-600">{classInfo.homeroomTeacher.fullName}</span>
                                </div>
                            ) : (
                                <p className="italic text-gray-400">Chưa phân công</p>
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Sĩ số hiện tại</p>
                            <div className="flex items-center gap-2">
                                <Users size={18} className="text-emerald-600" />
                                <span className="font-bold text-emerald-600 text-lg">{classInfo.studentCount}</span> học sinh
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Trạng thái</p>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${classInfo.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                {classInfo.status === 'active' ? 'Đang hoạt động' : 'Đã đóng'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Danh sách học sinh */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="text-lg font-bold text-gray-800">Danh sách Học sinh</h3>
                        <button onClick={() => setIsModalOpen(true)} className="btn-primary py-2 text-sm flex items-center">
                            <UserPlus size={16} className="mr-2" /> Thêm Học sinh
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-700 font-medium">
                                <tr>
                                    <th className="px-6 py-4 border-b border-gray-100">STT</th>
                                    <th className="px-6 py-4 border-b border-gray-100">Mã HS</th>
                                    <th className="px-6 py-4 border-b border-gray-100">Họ và tên</th>
                                    <th className="px-6 py-4 border-b border-gray-100">Giới tính</th>
                                    <th className="px-6 py-4 border-b border-gray-100 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                                            Chưa có học sinh nào trong lớp này.
                                        </td>
                                    </tr>
                                ) : students.map((s, index) => (
                                    <tr key={s.id} className="hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-0">
                                        <td className="px-6 py-4 font-medium">{index + 1}</td>
                                        <td className="px-6 py-4 font-medium text-gray-800">{s.studentCode}</td>
                                        <td className="px-6 py-4 font-bold text-blue-600">{s.fullName}</td>
                                        <td className="px-6 py-4">{s.gender}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleRemoveStudent(s)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors" title="Xóa khỏi lớp">
                                                <UserMinus size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                <AddStudentModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    classId={id} 
                    onSuccess={fetchClassDetails}
                />
            </AnimatePresence>
        </div>
    );
};

export default ClassDetails;
