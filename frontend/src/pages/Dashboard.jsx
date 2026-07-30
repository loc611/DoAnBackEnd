import { Users, BookOpen, GraduationCap, School } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center hover:shadow-md transition-shadow">
    <div className={`p-4 rounded-xl mr-4 ${colorClass}`}>
      <Icon size={24} className="text-white" />
    </div>
    <div>
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <h4 className="text-2xl font-bold text-gray-800">{value}</h4>
    </div>
  </div>
);

const Dashboard = () => {
  const userRole = localStorage.getItem('userRole') || 'student';

  // Chart Data cho Admin/Teacher
  const barChartData = {
    labels: ['Khối 10', 'Khối 11', 'Khối 12'],
    datasets: [
      {
        label: 'Số học sinh',
        data: [450, 420, 390],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 6,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: false },
    },
  };

  const doughnutData = {
    labels: ['Giỏi', 'Khá', 'Trung bình', 'Yếu'],
    datasets: [
      {
        data: [35, 45, 15, 5],
        backgroundColor: [
          '#10B981', // success
          '#3B82F6', // primary
          '#F59E0B', // warning
          '#EF4444', // danger
        ],
        borderWidth: 0,
      },
    ],
  };

  // Giao diện riêng cho Học sinh
  if (userRole === 'student') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Tổng quan học tập cá nhân</h2>
        </div>
  
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Điểm Trung bình" value="8.50" icon={BookOpen} colorClass="bg-blue-500" />
          <StatCard title="Xếp loại" value="Giỏi" icon={GraduationCap} colorClass="bg-emerald-500" />
          <StatCard title="Hạnh kiểm" value="Tốt" icon={Users} colorClass="bg-purple-500" />
          <StatCard title="Số ngày nghỉ" value="0" icon={School} colorClass="bg-amber-500" />
        </div>
  
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Biểu đồ điểm số cá nhân</h3>
          <div className="h-full pb-8">
            <Bar 
               options={barChartOptions} 
               data={{
                  labels: ['Toán', 'Văn', 'Anh', 'Tin học', 'Vật lý', 'Hóa học'],
                  datasets: [{
                     label: 'Điểm số',
                     data: [8.5, 7.0, 9.0, 9.5, 8.0, 8.0],
                     backgroundColor: 'rgba(16, 185, 129, 0.8)',
                     borderRadius: 6,
                  }]
               }} 
            />
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Thông báo từ nhà trường</h3>
          </div>
          <div className="p-0">
              {[1, 2].map((_, idx) => (
                  <div key={idx} className="px-6 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors flex justify-between items-center">
                      <div>
                          <p className="font-medium text-gray-800">Cập nhật lịch thi học kỳ 1</p>
                          <p className="text-sm text-gray-500">Phòng Đào tạo • {idx + 1} ngày trước</p>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Chung</span>
                  </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  // Giao diện chung cho Admin và Giáo viên
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Tổng quan toàn trường</h2>
        <button className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors shadow-sm">
          Tải báo cáo
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Tổng Học sinh" value="1,260" icon={Users} colorClass="bg-blue-500" />
        <StatCard title="Tổng Giáo viên" value="84" icon={GraduationCap} colorClass="bg-emerald-500" />
        <StatCard title="Tổng Lớp học" value="32" icon={School} colorClass="bg-purple-500" />
        <StatCard title="Tổng Môn học" value="12" icon={BookOpen} colorClass="bg-amber-500" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Số lượng học sinh theo khối</h3>
          <div className="h-full pb-8">
            <Bar options={barChartOptions} data={barChartData} />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Phân loại học lực</h3>
          <div className="flex-1 flex justify-center items-center pb-8">
             <div className="w-full max-w-[250px]">
                <Doughnut data={doughnutData} options={{ maintainAspectRatio: true }} />
             </div>
          </div>
        </div>
      </div>
      
      {/* Recent Activities Placeholder */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800">Thông báo mới nhất</h3>
        </div>
        <div className="p-0">
            {[1, 2, 3].map((_, idx) => (
                <div key={idx} className="px-6 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors flex justify-between items-center">
                    <div>
                        <p className="font-medium text-gray-800">Cập nhật lịch thi học kỳ 1</p>
                        <p className="text-sm text-gray-500">Phòng Đào tạo • 2 giờ trước</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Chung</span>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
