import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Printer, 
  Download, 
  X, 
  Award, 
  GraduationCap, 
  School, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  UserCheck,
  FileText
} from 'lucide-react';

const StudentGradeReportCardModal = ({ 
  isOpen, 
  onClose, 
  studentData, 
  classData, 
  studentsList = [],
  semester = 'HK1_2026'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const printAreaRef = useRef(null);

  if (!isOpen) return null;

  // Active student resolution
  const activeStudent = studentData || (studentsList.length > 0 ? studentsList[currentIndex] : null);

  const subjects = [
    { key: 'math', name: 'Toán học', credits: 4, teacher: 'ThS. Nguyễn Văn Quản Khoa' },
    { key: 'literature', name: 'Ngữ văn', credits: 4, teacher: 'Trần Thị Mai' },
    { key: 'english', name: 'Tiếng Anh', credits: 3, teacher: 'Lê Hoàng Anh' },
    { key: 'physics', name: 'Vật lý', credits: 2, teacher: 'Phạm Minh Đức' },
    { key: 'chemistry', name: 'Hóa học', credits: 2, teacher: 'Hoàng Thu Trang' },
    { key: 'it', name: 'Tin học', credits: 2, teacher: 'Ngô Quang Huy' }
  ];

  const getScore = (key) => {
    if (!activeStudent) return 0;
    if (activeStudent.scores && activeStudent.scores[key] !== undefined) return activeStudent.scores[key];
    if (activeStudent[key] !== undefined && activeStudent[key] !== '—') return Number(activeStudent[key]);
    return 0;
  };

  const scoresList = subjects.map(s => getScore(s.key));
  const avg = scoresList.reduce((a, b) => a + b, 0) / (scoresList.length || 1);
  const gpaStr = activeStudent?.gpa && activeStudent.gpa !== '—' ? activeStudent.gpa : avg.toFixed(2);

  let rank = activeStudent?.rank || 'Chưa xếp loại';
  if (rank === 'Chưa xếp loại' && avg > 0) {
    if (avg >= 8.0) rank = 'Học lực Giỏi';
    else if (avg >= 6.5) rank = 'Học lực Khá';
    else if (avg >= 5.0) rank = 'Học lực Trung Bình';
    else rank = 'Học lực Yếu';
  }

  const conduct = activeStudent?.conduct || 'Tốt';
  const className = activeStudent?.className || classData?.className || '10A1';
  const homeroomTeacher = classData?.homeroomTeacherName || 'ThS. Nguyễn Văn Quản Khoa';

  const handlePrint = () => {
    window.print();
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex < studentsList.length - 1) setCurrentIndex(currentIndex + 1);
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 font-sans">
      {/* Printable CSS Rules */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report-card, #printable-report-card * {
            visibility: visible;
          }
          #printable-report-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-slate-100 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col border border-slate-300"
      >
        {/* Top Control Bar (Hidden on Print) */}
        <div className="no-print p-4 bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm">Xem Trước & In Phiếu Báo Điểm Chính Thức</h3>
              <p className="text-xs text-slate-400">Mẫu biểu chuẩn nhận diện Trường THPT TTLN</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {studentsList.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold mr-2">
                <button 
                  onClick={handlePrev} 
                  disabled={currentIndex === 0}
                  className="p-1 hover:bg-slate-700 rounded-lg disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <span>{currentIndex + 1} / {studentsList.length}</span>
                <button 
                  onClick={handleNext} 
                  disabled={currentIndex === studentsList.length - 1}
                  className="p-1 hover:bg-slate-700 rounded-lg disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-sm cursor-pointer transition-all"
            >
              <Printer size={16} /> In / Lưu PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Report Card Page Container (Scrollable on screen, Full on Print) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-200/60">
          <div 
            id="printable-report-card"
            ref={printAreaRef}
            className="w-full max-w-[780px] bg-white rounded-2xl shadow-xl p-8 sm:p-12 text-slate-900 border border-slate-200 print:border-none print:shadow-none font-serif relative"
          >
            {/* Header: School & National Emblem */}
            <div className="grid grid-cols-2 gap-4 pb-6 border-b-2 border-slate-900">
              <div className="text-center font-sans">
                <p className="text-[11px] uppercase tracking-wider text-slate-600 font-semibold">SỞ GD&ĐT TP. HỒ CHÍ MINH</p>
                <h4 className="text-sm sm:text-base font-black uppercase text-blue-900 mt-0.5">TRƯỜNG THPT TTLN</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Mã trường: THPT-TTLN • Hotline: 028.3838.8899</p>
              </div>

              <div className="text-center font-sans">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-800">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="text-xs font-bold text-slate-700 mt-0.5">Độc lập - Tự do - Hạnh phúc</p>
                <div className="w-24 h-0.5 bg-slate-800 mx-auto mt-1.5" />
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-6">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 font-sans">
                PHIẾU BÁO ĐIỂM & ĐÁNH GIÁ KẾT QUẢ HỌC TẬP
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-sans mt-1 font-medium italic">
                Học kỳ 1 • Năm học 2026 - 2027
              </p>
            </div>

            {/* Student Information Grid */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 font-sans text-xs sm:text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-6">
              <div>
                <span className="text-slate-500">Họ và tên học sinh:</span>{' '}
                <strong className="text-slate-900 uppercase font-black">{activeStudent?.fullName || 'Trần Học Sinh'}</strong>
              </div>
              <div>
                <span className="text-slate-500">Mã định danh HS:</span>{' '}
                <strong className="text-blue-800 font-mono font-bold">{activeStudent?.studentCode || activeStudent?.id || 'HS100101'}</strong>
              </div>
              <div>
                <span className="text-slate-500">Lớp học:</span>{' '}
                <strong className="text-slate-900">{className}</strong>
              </div>
              <div>
                <span className="text-slate-500">Giới tính / Ngày sinh:</span>{' '}
                <strong className="text-slate-900">{activeStudent?.gender || 'Nam'} • {activeStudent?.dob || '15/03/2010'}</strong>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500">Giáo viên chủ nhiệm:</span>{' '}
                <strong className="text-slate-900">{homeroomTeacher}</strong>
              </div>
            </div>

            {/* Scores Table */}
            <div className="mb-6 font-sans">
              <table className="w-full border-collapse border border-slate-300 text-xs sm:text-sm text-center">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="border border-slate-300 px-3 py-2 w-12">STT</th>
                    <th className="border border-slate-300 px-3 py-2 text-left">Môn học</th>
                    <th className="border border-slate-300 px-3 py-2 w-16">Số tiết</th>
                    <th className="border border-slate-300 px-3 py-2 w-24">Điểm số</th>
                    <th className="border border-slate-300 px-3 py-2 text-left">Giáo viên bộ môn</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s, idx) => {
                    const score = getScore(s.key);
                    return (
                      <tr key={s.key} className="hover:bg-slate-50/50">
                        <td className="border border-slate-300 px-3 py-2 text-slate-500">{idx + 1}</td>
                        <td className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-800">{s.name}</td>
                        <td className="border border-slate-300 px-3 py-2 text-slate-600">{s.credits}</td>
                        <td className="border border-slate-300 px-3 py-2 font-mono font-bold text-blue-900 text-sm">
                          {score > 0 ? score.toFixed(1) : '—'}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-left text-xs text-slate-600">{s.teacher}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Evaluation Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-sans text-center mb-6">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-[11px] font-bold uppercase text-blue-800">Điểm TB Học Kỳ</p>
                <p className="text-xl font-black text-blue-950 mt-0.5">{gpaStr}</p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-[11px] font-bold uppercase text-emerald-800">Xếp Loại Học Lực</p>
                <p className="text-sm sm:text-base font-black text-emerald-950 mt-1">{rank}</p>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-[11px] font-bold uppercase text-amber-800">Xếp Loại Hạnh Kiểm</p>
                <p className="text-sm sm:text-base font-black text-amber-950 mt-1">{conduct}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[11px] font-bold uppercase text-slate-700">Chuyên Cần</p>
                <p className="text-xs font-bold text-slate-800 mt-1.5">Vắng có phép: 0</p>
              </div>
            </div>

            {/* Homeroom Remarks */}
            <div className="p-4 rounded-xl border border-slate-200 font-sans text-xs sm:text-sm mb-8">
              <p className="font-bold text-slate-800 mb-1">Nhận xét của Giáo viên chủ nhiệm:</p>
              <p className="text-slate-600 italic leading-relaxed">
                "Học sinh có ý thức học tập tốt, nề nếp kỷ luật gương mẫu, tích cực tham gia các phong trào thi đua của chi đoàn và nhà trường. Cần tiếp tục duy trì và phát huy thành tích trong học kỳ tiếp theo."
              </p>
            </div>

            {/* Signature Blocks */}
            <div className="grid grid-cols-2 gap-8 font-sans text-center mt-8 pt-4">
              <div>
                <p className="text-xs text-slate-500 italic">TP. Hồ Chí Minh, ngày 15 tháng 01 năm 2027</p>
                <p className="text-xs sm:text-sm font-bold uppercase text-slate-800 mt-1">GIÁO VIÊN CHỦ NHIỆM</p>
                <div className="h-20 flex items-center justify-center">
                  <span className="text-xs text-slate-400 italic">(Đã ký & xác nhận)</span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-900">{homeroomTeacher}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 italic">TP. Hồ Chí Minh, ngày 15 tháng 01 năm 2027</p>
                <p className="text-xs sm:text-sm font-bold uppercase text-blue-900 mt-1">HIỆU TRƯỞNG / BAN GIÁM HIỆU</p>
                <div className="h-20 flex items-center justify-center relative">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-rose-400/50 flex items-center justify-center text-[10px] text-rose-500 font-bold uppercase rotate-12">
                    Mộc Đỏ THPT TTLN
                  </div>
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-900">ThS. Nguyễn Văn Quản</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default StudentGradeReportCardModal;
