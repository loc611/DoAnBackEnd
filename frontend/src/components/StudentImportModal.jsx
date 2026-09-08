import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2, 
  Users, 
  ArrowRight,
  RefreshCw,
  Eye,
  AlertTriangle,
  Info
} from 'lucide-react';
import api from '../services/api';
import Swal from 'sweetalert2';

// Helper to validate phone number (10 digits, starts with 0)
const isValidPhone = (phone) => {
  if (!phone) return true;
  return /^0\d{9}$/.test(String(phone).trim());
};

// Helper to validate student code (HSxxxxxx)
const isValidStudentCode = (code) => {
  if (!code) return true;
  return /^HS\d{4,10}$/i.test(String(code).trim());
};

const StudentImportModal = ({ isOpen, onClose, classesList = [], onSuccess }) => {
  const [step, setStep] = useState('upload'); // 'upload' | 'preview' | 'result'
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [selectedDefaultClassId, setSelectedDefaultClassId] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'valid' | 'invalid'
  const [loading, setLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const fileInputRef = useRef(null);

  // Reset modal state
  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setParsedRows([]);
    setSelectedDefaultClassId('');
    setFilterMode('all');
    setLoading(false);
    setImportResults(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Download Sample Template CSV (UTF-8 with BOM for Excel compatibility)
  const handleDownloadTemplate = () => {
    const headers = 'Mã Học Sinh,Họ và Tên,Giới Tính,Ngày Sinh (YYYY-MM-DD),SĐT Học Sinh,Tên Phụ Huynh,SĐT Phụ Huynh,Lớp\n';
    const sampleData = [
      'HS100101,Nguyễn Văn An,Nam,2010-05-15,0912345678,Nguyễn Văn Hùng,0987654321,10A1',
      'HS100102,Trần Thị Mai,Nữ,2010-08-20,0912345679,Trần Văn Bình,0987654322,10A1',
      'HS100103,Lê Hoàng Nam,Nam,2010-11-10,,Lê Văn Cường,0987654323,10A2',
      ',Phạm Thu Hà,Nữ,2010-02-28,0912345680,Phạm Đức Thắng,0987654324,10A2'
    ].join('\n');

    const csvContent = '\uFEFF' + headers + sampleData;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Mau_Danh_Sach_Hoc_Sinh_THPT_TTLN.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV file content
  const parseCSV = (text) => {
    const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('File không có dữ liệu học sinh (cần ít nhất 1 dòng tiêu đề và 1 dòng dữ liệu)');
    }

    // Skip header line
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Handle comma separated
      const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length === 0 || cols.every(c => c === '')) continue;

      const studentCode = cols[0] || '';
      const fullName = cols[1] || '';
      const gender = cols[2] || 'Nam';
      const dob = cols[3] || '';
      const phone = cols[4] || '';
      const parentName = cols[5] || '';
      const parentPhone = cols[6] || '';
      const className = cols[7] || '';

      const errors = [];
      if (!fullName) {
        errors.push('Họ và tên bắt buộc');
      }
      if (studentCode && !isValidStudentCode(studentCode)) {
        errors.push('Mã HS sai định dạng (VD: HS123456)');
      }
      if (phone && !isValidPhone(phone)) {
        errors.push('SĐT học sinh không đúng 10 số');
      }
      if (parentPhone && !isValidPhone(parentPhone)) {
        errors.push('SĐT phụ huynh không đúng 10 số');
      }

      rows.push({
        id: i,
        studentCode,
        fullName,
        gender,
        dateOfBirth: dob,
        phone,
        parentName,
        parentPhone,
        className,
        errors,
        isValid: errors.length === 0
      });
    }

    return rows;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const rows = parseCSV(text);
        if (rows.length === 0) {
          Swal.fire('Lỗi', 'Không tìm thấy dòng dữ liệu nào trong file', 'warning');
          return;
        }
        setParsedRows(rows);
        setStep('preview');
      } catch (err) {
        Swal.fire('Lỗi đọc file', err.message || 'File không đúng định dạng CSV/Excel', 'error');
      }
    };

    reader.onerror = () => {
      Swal.fire('Lỗi', 'Không thể đọc file đã chọn', 'error');
    };

    reader.readAsText(selectedFile, 'UTF-8');
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const errorCount = parsedRows.filter(r => !r.isValid).length;

  const filteredRows = parsedRows.filter(r => {
    if (filterMode === 'valid') return r.isValid;
    if (filterMode === 'invalid') return !r.isValid;
    return true;
  });

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      Swal.fire('Không có dữ liệu hợp lệ', 'Tất cả các dòng đều chứa lỗi. Vui lòng kiểm tra lại.', 'warning');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        students: validRows.map(r => ({
          studentCode: r.studentCode,
          fullName: r.fullName,
          gender: r.gender,
          dateOfBirth: r.dateOfBirth,
          phone: r.phone,
          parentName: r.parentName,
          parentPhone: r.parentPhone,
          className: r.className
        })),
        defaultClassId: selectedDefaultClassId || undefined
      };

      const res = await api.post('/import-export/students/batch', payload);
      setImportResults(res.data);
      setStep('result');
      if (onSuccess) onSuccess();
    } catch (err) {
      Swal.fire('Lỗi nhập dữ liệu', err.response?.data?.message || 'Có lỗi xảy ra khi nạp dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <FileSpreadsheet size={24} className="text-emerald-300" />
            </div>
            <div>
              <h2 className="text-2xl font-black">Nhập Danh Sách Học Sinh từ Excel / CSV</h2>
              <p className="text-xs text-blue-200 mt-0.5 font-medium">
                Tự động kiểm tra dữ liệu, tạo tài khoản người dùng & gán lớp học
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Guidance Box */}
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-start gap-3.5">
                <Info size={22} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-blue-900 leading-relaxed">
                  <p className="font-bold mb-1">Hướng dẫn nhập danh sách học sinh:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>Sử dụng đúng cấu trúc file mẫu theo chuẩn của trường THPT TTLN.</li>
                    <li>Mã học sinh nếu để trống sẽ được hệ thống <strong>tự động sinh ngẫu nhiên</strong> dạng <code className="font-mono bg-white px-1.5 py-0.5 rounded border">HSxxxxxx</code>.</li>
                    <li>Mỗi học sinh được tạo sẽ tự động có tài khoản đăng nhập với mật khẩu khởi tạo mặc định là <code className="font-mono bg-white px-1.5 py-0.5 rounded border">[MãHS]@123</code>.</li>
                  </ul>
                </div>
              </div>

              {/* Download Template Button */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">File mẫu chuẩn Excel / CSV</h4>
                    <p className="text-xs text-slate-500">Chứa sẵn các cột mẫu và dữ liệu minh họa</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Download size={16} /> Tải file mẫu (.csv)
                </button>
              </div>

              {/* Upload Dropzone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/30 rounded-3xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
              >
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white flex items-center justify-center transition-all shadow-sm">
                  <Upload size={30} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                    Nhấp để chọn file Excel / CSV từ máy tính
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Hỗ trợ file định dạng .csv, .xlsx, .xls</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls, text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & VALIDATION */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Toolbar & Stats */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-600">Lọc hiển thị:</span>
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      filterMode === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Tất cả ({parsedRows.length})
                  </button>
                  <button
                    onClick={() => setFilterMode('valid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      filterMode === 'valid' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <CheckCircle2 size={13} /> Hợp lệ ({validCount})
                  </button>
                  {errorCount > 0 && (
                    <button
                      onClick={() => setFilterMode('invalid')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        filterMode === 'invalid' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white text-rose-700 border border-rose-200'
                      }`}
                    >
                      <AlertCircle size={13} /> Lỗi ({errorCount})
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs font-bold text-slate-600 whitespace-nowrap">Lớp mặc định:</label>
                  <select
                    value={selectedDefaultClassId}
                    onChange={(e) => setSelectedDefaultClassId(e.target.value)}
                    className="text-xs font-medium px-3 py-1.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Theo cột Lớp trong file --</option>
                    {classesList.map(c => (
                      <option key={c.id} value={c.id}>{c.className} (Khối {c.grade})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table of Rows */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[360px] overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-3.5 py-2.5">Dòng</th>
                      <th className="px-3.5 py-2.5">Trạng thái</th>
                      <th className="px-3.5 py-2.5">Mã HS</th>
                      <th className="px-3.5 py-2.5">Họ và Tên</th>
                      <th className="px-3.5 py-2.5">Giới tính</th>
                      <th className="px-3.5 py-2.5">SĐT</th>
                      <th className="px-3.5 py-2.5">Lớp</th>
                      <th className="px-3.5 py-2.5">Chi tiết / Lỗi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((row, idx) => (
                      <tr 
                        key={row.id}
                        className={row.isValid ? 'hover:bg-slate-50/70' : 'bg-rose-50/50 hover:bg-rose-50'}
                      >
                        <td className="px-3.5 py-2.5 font-bold text-slate-400">{row.id}</td>
                        <td className="px-3.5 py-2.5">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              <CheckCircle2 size={11} /> Hợp lệ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px]">
                              <AlertCircle size={11} /> Lỗi
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-indigo-700">
                          {row.studentCode || <span className="text-slate-400 italic">Tự sinh</span>}
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-slate-800">{row.fullName}</td>
                        <td className="px-3.5 py-2.5">{row.gender}</td>
                        <td className="px-3.5 py-2.5">{row.phone || '—'}</td>
                        <td className="px-3.5 py-2.5">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {row.className || 'Theo mặc định'}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5">
                          {row.errors.length > 0 ? (
                            <span className="text-rose-600 font-medium">{row.errors.join(', ')}</span>
                          ) : (
                            <span className="text-emerald-600 font-medium">Sẵn sàng tạo tài khoản</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: RESULT SUMMARY */}
          {step === 'result' && importResults && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">
                  Nhập Dữ Liệu Thành Công!
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Đã tạo thành công <strong className="text-emerald-700">{importResults.successCount}</strong> học sinh và tài khoản người dùng tương ứng.
                </p>
              </div>

              {/* Result List Box */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto text-left">
                <table className="w-full text-xs text-slate-600">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5">Mã Học Sinh</th>
                      <th className="px-4 py-2.5">Họ và Tên</th>
                      <th className="px-4 py-2.5">Lớp</th>
                      <th className="px-4 py-2.5">Tên Đăng Nhập</th>
                      <th className="px-4 py-2.5">Mật Khẩu Khởi Tạo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importResults.successList?.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono font-bold text-indigo-700">{s.studentCode}</td>
                        <td className="px-4 py-2 font-bold text-slate-800">{s.fullName}</td>
                        <td className="px-4 py-2">{s.className}</td>
                        <td className="px-4 py-2 font-mono text-slate-600">{s.username}</td>
                        <td className="px-4 py-2 font-mono font-bold text-emerald-700 bg-emerald-50/50">{s.defaultPassword}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          {step === 'preview' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Chọn file khác
              </button>
              <button
                type="button"
                disabled={loading || validCount === 0}
                onClick={handleConfirmImport}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Đang xử lý nạp {validCount} học sinh...</span>
                  </>
                ) : (
                  <>
                    <span>Xác nhận nạp {validCount} học sinh</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </>
          ) : step === 'result' ? (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
              >
                Hoàn tất & Đóng
              </button>
            </div>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default StudentImportModal;
