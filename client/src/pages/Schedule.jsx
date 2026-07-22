const mockSchedule = [
  { period: 'Tiết 1 (07:00 - 07:45)', mon: 'Toán', tue: 'Văn', wed: 'Anh', thu: 'Lý', fri: 'Hóa' },
  { period: 'Tiết 2 (07:50 - 08:35)', mon: 'Toán', tue: 'Văn', wed: 'Anh', thu: 'Lý', fri: 'Hóa' },
  { period: 'Tiết 3 (08:55 - 09:40)', mon: 'Vật lý', tue: 'Toán', wed: 'Sinh', thu: 'Tin', fri: 'Toán' },
  { period: 'Tiết 4 (09:45 - 10:30)', mon: 'Vật lý', tue: 'Toán', wed: 'Sinh', thu: 'GDCD', fri: 'Toán' },
  { period: 'Tiết 5 (10:35 - 11:20)', mon: 'SH Lớp', tue: '-', wed: '-', thu: '-', fri: 'Thể dục' },
];

import { CalendarPlus } from 'lucide-react';

const Schedule = () => {
  const userRole = localStorage.getItem('userRole') || 'student';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Thời khóa biểu</h2>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {userRole === 'student' ? (
             <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium border border-blue-100">
               Lớp 10A1
             </div>
          ) : (
            <select className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white w-full sm:w-auto">
              <option>Lớp 10A1</option>
              <option>Lớp 10A2</option>
              <option>Lớp 11B1</option>
            </select>
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
              {mockSchedule.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-6 font-medium text-gray-700 border-r border-gray-100 bg-gray-50/30">{row.period}</td>
                  
                  {[row.mon, row.tue, row.wed, row.thu, row.fri].map((subject, sIdx) => (
                    <td key={sIdx} className="px-4 py-6 border-r border-gray-100 last:border-0">
                      {subject !== '-' ? (
                        <div className="inline-block px-4 py-2 rounded-lg bg-blue-50 text-blue-700 font-medium border border-blue-100 shadow-sm w-full max-w-xs transition-transform hover:scale-105 cursor-pointer">
                          {subject}
                        </div>
                      ) : (
                         <span className="text-gray-300">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Schedule;
