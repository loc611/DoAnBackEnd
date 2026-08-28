import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, User, Calendar, MapPin, BookOpen, GraduationCap, 
  Award, Clock, Bell, CalendarCheck, BarChart2, Book, CheckSquare
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Thông tin sinh viên');

  useEffect(() => {
    fetchStudentDetails();
  }, [id]);

  const fetchStudentDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/students/${id}`);
      setStudent(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>;
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
    { name: 'Thông tin sinh viên', icon: User },
    { name: 'Chương trình khung', icon: Book },
    { name: 'Kết quả học tập', icon: BarChart2 },
    { name: 'Thông tin điểm danh', icon: CheckSquare },
    { name: 'Lịch theo tuần', icon: Calendar },
    { name: 'Lịch theo tiến độ', icon: Clock }
  ];

  // Mock data for charts
  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, title: { display: false } },
    scales: { y: { beginAtZero: true, max: 10 } }
  };

  const progressData = {
    labels: ['Hoàn thành', 'Chưa hoàn thành'],
    datasets: [{
      data: [75, 25],
      backgroundColor: ['#10B981', '#E5E7EB'],
      borderWidth: 0,
      cutout: '80%'
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
            <div className="w-28 h-28 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
               <User size={48} className="text-gray-400" />
            </div>
            <button className="text-sm text-blue-500 hover:underline">Xem chi tiết</button>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-sm z-10">
            <div>
              <span className="text-gray-500">Mã HS:</span> <span className="font-medium text-gray-800">{student.studentCode}</span>
            </div>
            <div>
              <span className="text-gray-500">Lớp học:</span> <span className="font-medium text-gray-800">{student.class?.className || 'Chưa xếp'}</span>
            </div>
            <div>
              <span className="text-gray-500">Họ tên:</span> <span className="font-bold text-gray-800">{student.fullName}</span>
            </div>
            <div>
              <span className="text-gray-500">Khóa học:</span> <span className="font-medium text-gray-800">{student.class?.academicYear || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-500">Giới tính:</span> <span className="font-medium text-gray-800">{student.gender || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-500">Bậc đào tạo:</span> <span className="font-medium text-gray-800">Phổ thông</span>
            </div>
            <div>
              <span className="text-gray-500">Ngày sinh:</span> <span className="font-medium text-gray-800">{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('vi-VN') : 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-500">Loại hình:</span> <span className="font-medium text-gray-800">Chính quy</span>
            </div>
            <div>
              <span className="text-gray-500">SĐT:</span> <span className="font-medium text-gray-800">{student.phone || 'N/A'}</span>
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
             <div className="z-10">
                <p className="text-gray-500 text-sm mb-1">Nhắc nhở mới, chưa xem</p>
                <h3 className="text-2xl font-bold text-gray-800">0</h3>
                <button className="text-xs text-blue-500 hover:underline mt-1">Xem chi tiết</button>
             </div>
             <div className="w-10 h-10 rounded-full border border-gray-200 flex justify-center items-center text-gray-400 z-10 bg-white">
                <Bell size={18} />
             </div>
          </div>
          
          <div className="bg-cyan-50/50 rounded-xl shadow-sm border border-cyan-100 p-4 flex justify-between items-center">
             <div>
                <p className="text-gray-500 text-sm mb-1">Lịch học trong tuần</p>
                <h3 className="text-2xl font-bold text-cyan-700">8</h3>
                <button className="text-xs text-cyan-600 hover:underline mt-1">Xem chi tiết</button>
             </div>
             <div className="w-10 h-10 rounded-full border border-cyan-200 flex justify-center items-center text-cyan-500 bg-white">
                <CalendarCheck size={18} />
             </div>
          </div>
          
          <div className="bg-amber-50/50 rounded-xl shadow-sm border border-amber-100 p-4 flex justify-between items-center">
             <div>
                <p className="text-gray-500 text-sm mb-1">Lịch thi trong tuần</p>
                <h3 className="text-2xl font-bold text-amber-700">0</h3>
                <button className="text-xs text-amber-600 hover:underline mt-1">Xem chi tiết</button>
             </div>
             <div className="w-10 h-10 rounded-full border border-amber-200 flex justify-center items-center text-amber-500 bg-white">
                <Clock size={18} />
             </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Main Content Area */}
      {activeTab === 'Thông tin sinh viên' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col h-80">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold text-gray-800">Kết quả học tập</h3>
               <select className="border border-gray-200 rounded-md text-sm px-2 py-1 outline-none">
                 <option>HK1 - 2026-2027</option>
               </select>
            </div>
            <div className="flex-1 w-full relative pt-4 flex justify-center items-center opacity-40">
               <div className="text-center">
                  <BarChart2 size={48} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-400 text-sm font-medium">Chưa có dữ liệu hiển thị</p>
               </div>
               {/* Uncomment for actual chart
               <Bar 
                  options={barChartOptions} 
                  data={{
                      labels: ['T1', 'T2', 'T3', 'T4', 'T5'],
                      datasets: [{ data: [6, 8, 7, 9, 8], backgroundColor: '#a78bfa', borderRadius: 4 }]
                  }} 
               />
               */}
            </div>
          </div>
          
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col h-80">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Tiến độ học tập</h3>
            <div className="flex-1 flex justify-center items-center relative">
               <div className="w-48 h-48">
                  <Doughnut data={progressData} options={{ maintainAspectRatio: true, plugins: { tooltip: { enabled: false } } }} />
               </div>
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-emerald-500">75%</span>
                  <span className="text-xs text-gray-500 uppercase font-medium">Hoàn thành</span>
               </div>
            </div>
          </div>
          
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-0 flex flex-col h-80 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
               <h3 className="text-lg font-bold text-gray-800">Lớp học phần</h3>
               <select className="border border-gray-200 rounded-md text-sm px-2 py-1 outline-none text-gray-600">
                 <option>HK1 - 2026-2027</option>
               </select>
            </div>
            <div className="flex-1 overflow-y-auto">
               <table className="w-full text-sm text-left">
                  <thead className="text-gray-500 font-normal sticky top-0 bg-white/90 backdrop-blur-sm">
                     <tr>
                        <th className="px-4 py-2">Môn học/học phần</th>
                        <th className="px-4 py-2 text-right">Số tín chỉ</th>
                     </tr>
                  </thead>
                  <tbody>
                     <tr className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3">
                           <p className="text-blue-500 font-medium">Toán học đại cương 1</p>
                           <p className="text-xs text-gray-500 mt-0.5">Mã LHP: MAT101</p>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">3</td>
                     </tr>
                     <tr className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3">
                           <p className="text-blue-500 font-medium">Lập trình cơ bản</p>
                           <p className="text-xs text-gray-500 mt-0.5">Mã LHP: INT102</p>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">4</td>
                     </tr>
                     <tr className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3">
                           <p className="text-blue-500 font-medium">Vật lý đại cương 1</p>
                           <p className="text-xs text-gray-500 mt-0.5">Mã LHP: PHY101</p>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">3</td>
                     </tr>
                  </tbody>
               </table>
            </div>
          </div>
          
        </div>
      )}
      
      {activeTab !== 'Thông tin sinh viên' && (
         <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 flex justify-center items-center text-gray-400">
            Tính năng "{activeTab}" đang được phát triển...
         </div>
      )}

    </div>
  );
};

export default StudentProfile;
