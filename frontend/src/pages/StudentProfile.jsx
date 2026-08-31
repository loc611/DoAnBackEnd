import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, User, Calendar, MapPin, BookOpen, GraduationCap, 
  Award, Clock, Bell, CalendarCheck, BarChart2, Book, CheckSquare,
  CreditCard, CheckCircle, AlertCircle
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import api from '../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Thông tin học sinh');

  useEffect(() => {
    fetchStudentDetails();
    fetchSubjects();
  }, [id]);

  const fetchStudentDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/students/${id}`);
      setStudent(res.data);
    } catch (error) {
      console.error('Error fetching student details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/subjects');
      setSubjects(res.data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu học sinh từ hệ thống...</div>;
  }

  if (!student) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>Không tìm thấy thông tin học sinh.</p>
        <button onClick={() => navigate('/students')} className="mt-4 text-blue-500 hover:underline">Quay lại danh sách</button>
      </div>
    );
  }

  const tabs = [
    { name: 'Thông tin học sinh', icon: User },
    { name: 'Kết quả học tập', icon: BarChart2 },
    { name: 'Thông tin điểm danh', icon: CheckSquare },
    { name: 'Học phí & Hóa đơn', icon: CreditCard },
  ];

  // Calculate real metrics from DB relations
  const latestGrade = student.grades && student.grades.length > 0 ? student.grades[0] : null;
  const gradeValues = latestGrade ? [
    latestGrade.math,
    latestGrade.literature,
    latestGrade.english,
    latestGrade.physics,
    latestGrade.chemistry,
    latestGrade.it
  ] : [];

  const validGrades = gradeValues.filter(g => g !== undefined && g !== null && g > 0);
  const avgScore = validGrades.length > 0 
    ? (validGrades.reduce((a, b) => a + b, 0) / validGrades.length).toFixed(1)
    : 'Chưa có';

  const attendances = student.attendances || [];
  const presentCount = attendances.filter(a => a.status === 'present').length;
  const lateCount = attendances.filter(a => a.status === 'late').length;
  const absentCount = attendances.filter(a => a.status === 'unexcused' || a.status === 'excused').length;

  const feeBills = student.feeBills || [];
  const unpaidBillsCount = feeBills.filter(b => b.status === 'unpaid').length;

  // Real Grade Chart
  const gradeChartData = {
    labels: ['Toán', 'Văn', 'Anh', 'Lý', 'Hóa', 'Tin'],
    datasets: [{
      label: 'Điểm số',
      data: latestGrade ? [
        latestGrade.math || 0,
        latestGrade.literature || 0,
        latestGrade.english || 0,
        latestGrade.physics || 0,
        latestGrade.chemistry || 0,
        latestGrade.it || 0
      ] : [0, 0, 0, 0, 0, 0],
      backgroundColor: '#3B82F6',
      borderRadius: 6
    }]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, max: 10 } }
  };

  // Real Attendance Doughnut
  const totalAtt = attendances.length || 1;
  const attendanceProgressData = {
    labels: ['Có mặt', 'Đi trễ', 'Nghỉ'],
    datasets: [{
      data: attendances.length > 0 
        ? [presentCount, lateCount, absentCount]
        : [1, 0, 0],
      backgroundColor: attendances.length > 0 
        ? ['#10B981', '#F59E0B', '#EF4444']
        : ['#E5E7EB', '#E5E7EB', '#E5E7EB'],
      borderWidth: 0,
      cutout: '75%'
    }]
  };

  return (
    <div className="space-y-6 font-poppins pb-10">
      <div className="flex items-center space-x-4 mb-2">
        <button onClick={() => navigate('/students')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Hồ sơ Học sinh</h2>
      </div>

      {/* Top Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
             <User size={120} />
          </div>
          
          <div className="flex flex-col items-center space-y-3 z-10">
            <div className="w-28 h-28 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-md text-white font-bold text-3xl">
               {student.fullName ? student.fullName.charAt(0).toUpperCase() : 'H'}
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">
              {student.studentCode}
            </span>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-sm z-10">
            <div>
              <span className="text-gray-500">Họ tên:</span> <span className="font-bold text-gray-800">{student.fullName}</span>
            </div>
            <div>
              <span className="text-gray-500">Lớp học:</span> <span className="font-semibold text-blue-600">{student.class?.className || 'Chưa xếp lớp'}</span>
            </div>
            <div>
              <span className="text-gray-500">Giới tính:</span> <span className="font-medium text-gray-800">{student.gender || 'Chưa cập nhật'}</span>
            </div>
            <div>
              <span className="text-gray-500">Niên khóa:</span> <span className="font-medium text-gray-800">{student.class?.academicYear || '2026-2027'}</span>
            </div>
            <div>
              <span className="text-gray-500">Ngày sinh:</span> <span className="font-medium text-gray-800">{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</span>
            </div>
            <div>
              <span className="text-gray-500">GVCN:</span> <span className="font-medium text-gray-800">{student.class?.homeroomTeacher?.fullName || 'Chưa phân công'}</span>
            </div>
            <div>
              <span className="text-gray-500">SĐT phụ huynh:</span> <span className="font-medium text-gray-800">{student.parentPhone || student.phone || 'Chưa có'}</span>
            </div>
            <div>
              <span className="text-gray-500">Trạng thái:</span> 
              <span className={`ml-2 px-2 py-0.5 rounded text-xs ${student.user?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                 {student.user?.status === 'active' ? 'Đang học' : 'Đã nghỉ'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="lg:col-span-1 grid grid-cols-1 grid-rows-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-center relative overflow-hidden">
             <div>
                <p className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Điểm trung bình (ĐTB)</p>
                <h3 className="text-2xl font-bold text-blue-600">{avgScore}</h3>
             </div>
             <div className="w-10 h-10 rounded-full border border-blue-100 flex justify-center items-center text-blue-500 bg-blue-50">
                <Award size={20} />
             </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-center">
             <div>
                <p className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Buổi có mặt / Ghi nhận</p>
                <h3 className="text-2xl font-bold text-emerald-600">{presentCount} / {attendances.length}</h3>
             </div>
             <div className="w-10 h-10 rounded-full border border-emerald-100 flex justify-center items-center text-emerald-500 bg-emerald-50">
                <CheckCircle size={20} />
             </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-center">
             <div>
                <p className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Hóa đơn học phí chưa đóng</p>
                <h3 className={`text-2xl font-bold ${unpaidBillsCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {unpaidBillsCount}
                </h3>
             </div>
             <div className="w-10 h-10 rounded-full border border-amber-100 flex justify-center items-center text-amber-500 bg-amber-50">
                <CreditCard size={20} />
             </div>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex flex-wrap gap-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.name;
          return (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`flex-1 min-w-[150px] bg-white rounded-xl shadow-sm border p-4 flex flex-col items-center justify-center transition-all ${
                isActive ? 'border-blue-500 shadow-md ring-1 ring-blue-500' : 'border-gray-100 hover:border-blue-300'
              }`}
            >
              <Icon size={24} className={`mb-2 ${isActive ? 'text-blue-500' : 'text-blue-400'}`} />
              <span className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>{tab.name}</span>
            </button>
          )
        })}
      </div>

      {/* Tab 1: Tổng quan */}
      {activeTab === 'Thông tin học sinh' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col h-80">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-base font-bold text-gray-800">Biểu đồ kết quả học tập</h3>
               <span className="text-xs text-gray-500">{latestGrade?.semester || 'HK1'}</span>
            </div>
            <div className="flex-1 w-full relative">
               {latestGrade ? (
                 <Bar options={barChartOptions} data={gradeChartData} />
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <BarChart2 size={36} className="mb-1 text-gray-300" />
                    <p className="text-xs">Chưa có bảng điểm trong DB</p>
                 </div>
               )}
            </div>
          </div>
          
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col h-80">
            <h3 className="text-base font-bold text-gray-800 mb-4">Tỉ lệ chuyên cần</h3>
            <div className="flex-1 flex justify-center items-center relative">
               <div className="w-44 h-44">
                  <Doughnut data={attendanceProgressData} options={{ maintainAspectRatio: true, plugins: { tooltip: { enabled: true } } }} />
               </div>
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-emerald-600">
                    {attendances.length > 0 ? Math.round((presentCount / attendances.length) * 100) : 100}%
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase font-bold">Chuyên cần</span>
               </div>
            </div>
          </div>
          
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-0 flex flex-col h-80 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
               <h3 className="text-base font-bold text-gray-800">Môn học đào tạo</h3>
               <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{subjects.length} môn</span>
            </div>
            <div className="flex-1 overflow-y-auto">
               {subjects.length > 0 ? (
                 <table className="w-full text-sm text-left">
                    <thead className="text-gray-500 font-normal sticky top-0 bg-white/95 backdrop-blur-sm border-b text-xs">
                       <tr>
                          <th className="px-4 py-2">Tên môn học</th>
                          <th className="px-4 py-2 text-center">Mã</th>
                          <th className="px-4 py-2 text-right">Tiết/tuần</th>
                       </tr>
                    </thead>
                    <tbody>
                       {subjects.map((sub) => (
                         <tr key={sub.id} className="border-t border-gray-50 hover:bg-gray-50/80">
                            <td className="px-4 py-2.5 font-medium text-gray-800">{sub.name}</td>
                            <td className="px-4 py-2.5 text-center text-xs text-blue-600 font-mono">{sub.subjectCode}</td>
                            <td className="px-4 py-2.5 text-right text-gray-600">{sub.credits || 2}</td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
               ) : (
                 <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                    Chưa có danh sách môn học
                 </div>
               )}
            </div>
          </div>
          
        </div>
      )}

      {/* Tab 2: Bảng điểm chi tiết */}
      {activeTab === 'Kết quả học tập' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Chi tiết điểm số các môn</h3>
          {student.grades && student.grades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b">
                  <tr>
                    <th className="p-3">Học kỳ</th>
                    <th className="p-3 text-center">Toán</th>
                    <th className="p-3 text-center">Ngữ Văn</th>
                    <th className="p-3 text-center">Tiếng Anh</th>
                    <th className="p-3 text-center">Vật Lý</th>
                    <th className="p-3 text-center">Hóa Học</th>
                    <th className="p-3 text-center">Tin Học</th>
                  </tr>
                </thead>
                <tbody>
                  {student.grades.map((g) => (
                    <tr key={g.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-semibold text-blue-600">{g.semester}</td>
                      <td className="p-3 text-center font-medium">{g.math ?? '-'}</td>
                      <td className="p-3 text-center font-medium">{g.literature ?? '-'}</td>
                      <td className="p-3 text-center font-medium">{g.english ?? '-'}</td>
                      <td className="p-3 text-center font-medium">{g.physics ?? '-'}</td>
                      <td className="p-3 text-center font-medium">{g.chemistry ?? '-'}</td>
                      <td className="p-3 text-center font-medium">{g.it ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Học sinh chưa có bản ghi điểm số nào trong cơ sở dữ liệu.</p>
          )}
        </div>
      )}

      {/* Tab 3: Điểm danh */}
      {activeTab === 'Thông tin điểm danh' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Lịch sử điểm danh gần đây</h3>
          {attendances.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b">
                  <tr>
                    <th className="p-3">Ngày</th>
                    <th className="p-3">Buổi</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {attendances.map((att) => (
                    <tr key={att.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{new Date(att.date).toLocaleDateString('vi-VN')}</td>
                      <td className="p-3 capitalize">{att.session === 'morning' ? 'Buổi Sáng' : 'Buổi Chiều'}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          att.status === 'present' ? 'bg-green-100 text-green-700' :
                          att.status === 'late' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {att.status === 'present' ? 'Có mặt' : att.status === 'late' ? 'Đi trễ' : 'Vắng'}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500 text-xs">{att.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Chưa có dữ liệu điểm danh cho học sinh này.</p>
          )}
        </div>
      )}

      {/* Tab 4: Học phí */}
      {activeTab === 'Học phí & Hóa đơn' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Danh sách hóa đơn học phí</h3>
          {feeBills.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b">
                  <tr>
                    <th className="p-3">Khoản thu</th>
                    <th className="p-3">Học kỳ / Năm</th>
                    <th className="p-3 text-right">Số tiền</th>
                    <th className="p-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {feeBills.map((bill) => (
                    <tr key={bill.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-800">{bill.feeProfile?.name || 'Học phí'}</td>
                      <td className="p-3 text-gray-500">{bill.feeProfile?.semester} - {bill.feeProfile?.academicYear}</td>
                      <td className="p-3 text-right font-bold text-gray-800">
                        {Number(bill.feeProfile?.amount || 0).toLocaleString('vi-VN')} VNĐ
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          bill.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {bill.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Học sinh chưa có khoản học phí nào cần thanh toán.</p>
          )}
        </div>
      )}

    </div>
  );
};

export default StudentProfile;
