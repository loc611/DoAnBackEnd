import { useState, useEffect } from 'react';
import { CalendarPlus, Save, Edit } from 'lucide-react';
import api from '../services/api';

const Schedule = () => {
  const [schedule, setSchedule] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const userRole = localStorage.getItem('userRole') || 'student';
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  useEffect(() => {
    if (userRole !== 'student') {
      const fetchClasses = async () => {
        try {
          const res = await api.get('/classes');
          setClasses(res.data);
          if (res.data.length > 0) {
            setSelectedClass(res.data[0].id);
          }
        } catch (error) {
          console.error("Failed to fetch classes", error);
        }
      };
      fetchClasses();
    } else {
      if (userData.classId) {
        setSelectedClass(userData.classId);
      }
    }
  }, [userRole, userData.classId]);

  useEffect(() => {
    if (!selectedClass) return;
    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/schedule/class/${selectedClass}?semester=HK1_2026`);
        setSchedule(res.data);
      } catch (error) {
        console.error("Failed to fetch schedule", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [selectedClass]);

  const handleChange = (period, day, value) => {
    setSchedule(prev => prev.map(row => 
      row.period === period ? { ...row, [day]: value || '-' } : row
    ));
  };

  const handleSave = async () => {
    try {
      await api.put(`/schedule/class/${selectedClass}`, {
        semester: 'HK1_2026',
        schedules: schedule
      });
      setIsEditing(false);
      alert('Đã lưu thời khóa biểu thành công!');
    } catch (error) {
      console.error('Failed to save schedule', error);
      alert('Lỗi khi lưu thời khóa biểu');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Thời khóa biểu</h2>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {userRole === 'student' ? (
             <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium border border-blue-100">
               TKB của bạn
             </div>
          ) : (
            <select 
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white w-full sm:w-auto"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.className}</option>
              ))}
            </select>
          )}
          
          {userRole === 'admin' && (
             <>
               <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-sm ${isEditing ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
               >
                 <Edit size={18} className="mr-2" />
                 {isEditing ? 'Hủy sửa' : 'Chỉnh sửa'}
               </button>
               {isEditing && (
                 <button 
                    onClick={handleSave}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                 >
                   <Save size={18} className="mr-2" />
                   Lưu TKB
                 </button>
               )}
             </>
          )}
          
          {userRole === 'teacher' && (
            <button className="flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium whitespace-nowrap shadow-sm shadow-amber-500/30">
              <CalendarPlus size={18} className="mr-2" />
              Đề xuất dạy bù
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
          ) : (
            <table className="w-full text-center text-sm text-gray-600">
              <thead className="bg-blue-600 text-white font-medium">
                <tr>
                  <th className="px-4 py-4 border-r border-blue-500/30 w-48">Tiết / Thời gian</th>
                  <th className="px-4 py-4 border-r border-blue-500/30 w-1/5">Thứ Hai</th>
                  <th className="px-4 py-4 border-r border-blue-500/30 w-1/5">Thứ Ba</th>
                  <th className="px-4 py-4 border-r border-blue-500/30 w-1/5">Thứ Tư</th>
                  <th className="px-4 py-4 border-r border-blue-500/30 w-1/5">Thứ Năm</th>
                  <th className="px-4 py-4 w-1/5">Thứ Sáu</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-6 font-medium text-gray-700 border-r border-gray-100 bg-gray-50/30">{row.period}</td>
                    
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day) => (
                      <td key={day} className="px-4 py-6 border-r border-gray-100 last:border-0">
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="w-full px-2 py-1 text-center border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            value={row[day] === '-' ? '' : row[day]}
                            onChange={(e) => handleChange(row.period, day, e.target.value)}
                            placeholder="Môn học"
                          />
                        ) : (
                          row[day] !== '-' ? (
                            <div className="inline-block px-4 py-2 rounded-lg bg-blue-50 text-blue-700 font-medium border border-blue-100 shadow-sm w-full max-w-xs transition-transform hover:scale-105 cursor-pointer">
                              {row[day]}
                            </div>
                          ) : (
                             <span className="text-gray-300">-</span>
                          )
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Schedule;
