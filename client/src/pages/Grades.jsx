import { useState, useMemo } from 'react';
import { Search, Filter, Save, Edit, BookOpenCheck } from 'lucide-react';

const initialGrades = [
  { id: 'HS001', name: 'Nguyễn Văn A', class: '10A1', math: 8.5, literature: 7.0, english: 9.0, it: 9.5, physics: 8.0, chemistry: 8.0 },
  { id: 'HS002', name: 'Trần Thị B', class: '10A1', math: 9.0, literature: 8.5, english: 8.5, it: 9.0, physics: 9.0, chemistry: 8.5 },
  { id: 'HS003', name: 'Lê Hoàng C', class: '10A2', math: 6.5, literature: 6.0, english: 7.0, it: 8.0, physics: 6.5, chemistry: 7.0 },
  { id: 'HS004', name: 'Phạm Thu D', class: '10A2', math: 9.5, literature: 9.0, english: 9.5, it: 10.0, physics: 9.5, chemistry: 9.0 },
];

const Grades = () => {
  const [grades, setGrades] = useState(initialGrades);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const userRole = localStorage.getItem('userRole') || 'student';

  // Auto calculate average
  const processedGrades = useMemo(() => {
    let filteredList = grades;
    if (userRole === 'student') {
      // Giả lập học sinh đăng nhập là HS001 (Nguyễn Văn A)
      filteredList = grades.filter(s => s.id === 'HS001');
    } else {
      filteredList = grades.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return filteredList.map(student => {
      const avg = (student.math + student.literature + student.english + student.it + student.physics + student.chemistry) / 6;
      return {
        ...student,
        average: avg.toFixed(2),
        rank: avg >= 8.0 ? 'Giỏi' : avg >= 6.5 ? 'Khá' : avg >= 5.0 ? 'Trung bình' : 'Yếu'
      };
    });
  }, [grades, searchTerm, userRole]);

  const handleGradeChange = (id, field, value) => {
    let numVal = parseFloat(value);
    if (isNaN(numVal)) numVal = 0;
    if (numVal > 10) numVal = 10;
    if (numVal < 0) numVal = 0;

    setGrades(prev => prev.map(s => s.id === id ? { ...s, [field]: numVal } : s));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý Bảng điểm</h2>
        <div className="flex space-x-3">
            {userRole !== 'student' && (
              <>
                <button 
                    onClick={() => setIsEditing(!isEditing)} 
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isEditing ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                    <Edit size={18} className="mr-2" />
                    {isEditing ? 'Hủy sửa' : 'Nhập điểm'}
                </button>
                {isEditing && (
                    <button 
                        onClick={() => setIsEditing(false)} 
                        className="btn-primary flex items-center"
                    >
                        <Save size={18} className="mr-2" />
                        Lưu Bảng điểm
                    </button>
                )}
              </>
            )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50">
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm học sinh, mã HS..."
              className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={userRole === 'student'}
            />
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
             {userRole !== 'student' ? (
               <select className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 outline-none text-sm bg-white">
                  <option>Tất cả các lớp</option>
                  <option>10A1</option>
                  <option>10A2</option>
               </select>
             ) : (
               <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium border border-blue-100">
                 Lớp 10A1
               </div>
             )}
            <button className="flex items-center px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium justify-center" disabled={userRole === 'student'}>
              <Filter size={18} className="mr-2" />
              Lọc
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-center text-sm text-gray-600 whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-700 font-medium">
              <tr>
                <th className="px-4 py-4 border-b border-gray-100 text-left">Mã HS</th>
                <th className="px-4 py-4 border-b border-gray-100 text-left min-w-[150px]">Họ và tên</th>
                <th className="px-4 py-4 border-b border-gray-100">Lớp</th>
                <th className="px-4 py-4 border-b border-gray-100">Toán</th>
                <th className="px-4 py-4 border-b border-gray-100">Văn</th>
                <th className="px-4 py-4 border-b border-gray-100">Anh</th>
                <th className="px-4 py-4 border-b border-gray-100">Tin học</th>
                <th className="px-4 py-4 border-b border-gray-100">Vật lý</th>
                <th className="px-4 py-4 border-b border-gray-100">Hóa học</th>
                <th className="px-4 py-4 border-b border-gray-100 bg-blue-50/50">Điểm TB</th>
                <th className="px-4 py-4 border-b border-gray-100">Xếp loại</th>
              </tr>
            </thead>
            <tbody>
              {processedGrades.map((student) => (
                <tr key={student.id} className="hover:bg-blue-50/30 transition-colors border-b border-gray-50 last:border-0">
                  <td className="px-4 py-4 font-medium text-gray-600 text-left">{student.id}</td>
                  <td className="px-4 py-4 font-medium text-gray-800 text-left">{student.name}</td>
                  <td className="px-4 py-4">{student.class}</td>
                  
                  {/* Grade Inputs */}
                  {['math', 'literature', 'english', 'it', 'physics', 'chemistry'].map(subject => (
                     <td key={subject} className="px-2 py-4">
                        {isEditing ? (
                            <input 
                                type="number" 
                                min="0" max="10" step="0.1"
                                className="w-16 px-2 py-1 text-center border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                value={student[subject]}
                                onChange={(e) => handleGradeChange(student.id, subject, e.target.value)}
                            />
                        ) : (
                            <span className={student[subject] < 5 ? 'text-red-500 font-medium' : ''}>
                                {student[subject]}
                            </span>
                        )}
                     </td>
                  ))}
                  
                  <td className="px-4 py-4 font-bold text-blue-700 bg-blue-50/30">
                    {student.average}
                  </td>
                  <td className="px-4 py-4">
                     <span className={`px-2 py-1 rounded text-xs font-medium ${
                         student.rank === 'Giỏi' ? 'bg-emerald-100 text-emerald-700' :
                         student.rank === 'Khá' ? 'bg-blue-100 text-blue-700' :
                         student.rank === 'Trung bình' ? 'bg-amber-100 text-amber-700' :
                         'bg-red-100 text-red-700'
                     }`}>
                         {student.rank}
                     </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Grades;
