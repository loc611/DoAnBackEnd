import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Save, Edit } from 'lucide-react';
import api from '../services/api';

const Grades = () => {
  const [grades, setGrades] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const userRole = localStorage.getItem('userRole') || 'student';
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  // Fetch classes for dropdown (if admin/teacher)
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
      // If student, implicitly they belong to a class, but we need their classId.
      // Usually userData contains classId. Let's assume userData.classId exists.
      if (userData.classId) {
        setSelectedClass(userData.classId);
      }
    }
  }, [userRole, userData.classId]);

  // Fetch grades when selectedClass changes
  useEffect(() => {
    if (!selectedClass) return;
    
    const fetchGrades = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/grades/class/${selectedClass}?semester=HK1_2026`);
        // Format data to match our UI state
        const formatted = res.data.map(item => ({
          id: item.id,
          studentId: item.studentId,
          name: item.name,
          class: classes.find(c => c.id === selectedClass)?.className || 'Lớp của bạn',
          math: item.scores.math,
          literature: item.scores.literature,
          english: item.scores.english,
          it: item.scores.it,
          physics: item.scores.physics,
          chemistry: item.scores.chemistry,
        }));
        setGrades(formatted);
      } catch (error) {
        console.error("Failed to fetch grades", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, [selectedClass, classes]);

  // Auto calculate average
  const processedGrades = useMemo(() => {
    let filteredList = grades;
    if (userRole === 'student') {
      filteredList = grades.filter(s => s.id === userData.studentCode || s.studentId === userData.id);
    } else {
      if (searchTerm) {
        filteredList = grades.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase()));
      }
    }

    return filteredList.map(student => {
      const avg = (student.math + student.literature + student.english + student.it + student.physics + student.chemistry) / 6;
      return {
        ...student,
        average: avg.toFixed(2),
        rank: avg >= 8.0 ? 'Giỏi' : avg >= 6.5 ? 'Khá' : avg >= 5.0 ? 'Trung bình' : 'Yếu'
      };
    });
  }, [grades, searchTerm, userRole, userData]);

  const handleGradeChange = (studentId, field, value) => {
    let numVal = parseFloat(value);
    if (isNaN(numVal)) numVal = 0;
    if (numVal > 10) numVal = 10;
    if (numVal < 0) numVal = 0;

    setGrades(prev => prev.map(s => s.studentId === studentId ? { ...s, [field]: numVal } : s));
  };

  const handleSave = async () => {
    try {
      const payload = grades.map(g => ({
        studentId: g.studentId,
        scores: {
          math: g.math,
          literature: g.literature,
          english: g.english,
          physics: g.physics,
          chemistry: g.chemistry,
          it: g.it
        }
      }));

      await api.put(`/grades/class/${selectedClass}`, {
        semester: 'HK1_2026',
        grades: payload
      });
      setIsEditing(false);
      alert('Đã lưu bảng điểm thành công!');
    } catch (error) {
      console.error('Failed to save grades', error);
      alert('Lỗi khi lưu bảng điểm');
    }
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
                        onClick={handleSave} 
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
               <select 
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 outline-none text-sm bg-white"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
               >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.className}</option>
                  ))}
               </select>
             ) : (
               <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium border border-blue-100">
                 Bảng điểm của bạn
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
          {loading ? (
            <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
          ) : (
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
                                  onChange={(e) => handleGradeChange(student.studentId, subject, e.target.value)}
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
                {processedGrades.length === 0 && (
                  <tr>
                    <td colSpan="11" className="px-4 py-8 text-gray-500 text-center">Không có dữ liệu điểm cho lớp này</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Grades;
