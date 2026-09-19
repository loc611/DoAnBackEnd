import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Edit, Trash2, X, Eye, 
  FileSpreadsheet, Download, Upload, Settings, 
  Copy, Check, ExternalLink, RefreshCw, HelpCircle, CheckCircle2, AlertCircle,
  Lock, Calendar, Users, PhoneCall, GraduationCap,
  Key, ArrowUpDown, ChevronLeft, ChevronRight, CheckSquare, Square, UserX, UserCheck2, Sparkles, Filter, RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import StudentImportModal from '../components/StudentImportModal';
import { generateStudentCode } from '../utils/codeGenerator';
import { isValidPhoneNumber, sanitizePhoneNumber, PHONE_ERROR_MESSAGES, PHONE_10_DIGITS_REGEX } from '../utils/phoneValidation';

// Modal Thêm / Sửa học sinh thủ công
const StudentModal = ({ isOpen, onClose, student, classesList, onSubmit }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    studentCode: '',
    gender: 'Nam',
    classId: '',
    phone: '',
    dateOfBirth: '',
    parentName: '',
    parentPhone: '',
    academicYear: '',
    status: 'active'
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (student) {
      setFormData({
        fullName: student.fullName || '',
        studentCode: student.studentCode || '',
        gender: student.gender || 'Nam',
        classId: student.classId || '',
        phone: student.phone || '',
        dateOfBirth: student.dateOfBirth ? String(student.dateOfBirth).slice(0, 10) : '',
        parentName: student.parentName || '',
        parentPhone: student.parentPhone || '',
        academicYear: student.academicYear || '',
        status: student.user?.status || 'active'
      });
    } else {
      setFormData({
        fullName: '',
        studentCode: generateStudentCode(),
        gender: 'Nam',
        classId: '',
        phone: '',
        dateOfBirth: '',
        parentName: '',
        parentPhone: '',
        academicYear: '',
        status: 'active'
      });
    }
    setErrors({});
  }, [student, isOpen]);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'phone' || name === 'parentPhone') {
      value = sanitizePhoneNumber(value);
      const newErrors = { ...errors };
      if (!value) {
        if (name === 'phone') newErrors.phone = PHONE_ERROR_MESSAGES.REQUIRED;
        else delete newErrors.parentPhone;
      } else if (!isValidPhoneNumber(value)) {
        newErrors[name] = name === 'phone' ? PHONE_ERROR_MESSAGES.INVALID : 'SĐT phụ huynh phải gồm đúng 10 chữ số, bắt đầu bằng 0';
      } else {
        delete newErrors[name];
      }
      setErrors(newErrors);
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.phone) {
      newErrors.phone = PHONE_ERROR_MESSAGES.REQUIRED;
    } else if (!isValidPhoneNumber(formData.phone)) {
      newErrors.phone = PHONE_ERROR_MESSAGES.INVALID;
    }

    if (formData.parentPhone && !isValidPhoneNumber(formData.parentPhone)) {
      newErrors.parentPhone = 'SĐT phụ huynh phải gồm đúng 10 chữ số, bắt đầu bằng 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto border border-slate-200 flex flex-col"
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/40 sticky top-0 z-10 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800">
                {student ? 'Cập nhật Hồ sơ Học sinh' : 'Thêm Học sinh mới'}
              </h2>
              {student && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase bg-blue-100 text-blue-700 border border-blue-200 font-mono">
                  {student.studentCode}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {student ? 'Quản lý thông tin cá nhân, liên hệ và niên khóa của học sinh' : 'Đăng ký hồ sơ học sinh mới vào cơ sở dữ liệu'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-xl hover:bg-white shadow-xs cursor-pointer">
            <X size={20} />
          </button>
        </div>
        
        <form className="p-6 md:p-8 font-sans space-y-6" onSubmit={handleSubmit}>
          {/* SECTION 1: Thông tin học sinh */}
          <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-sm mb-4 pb-2 border-b border-slate-200/60">
              <GraduationCap size={18} />
              <span>1. Thông tin Định danh & Học vụ</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Họ và tên học sinh *</label>
                <input 
                  type="text" 
                  name="fullName" 
                  value={formData.fullName} 
                  onChange={handleChange} 
                  required 
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium" 
                  placeholder="VD: Nguyễn Văn A" 
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Mã học sinh (Bất biến) *</label>
                  {student && (
                    <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5">
                      <Lock size={11} /> Không thể sửa
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <input 
                    type="text" 
                    name="studentCode" 
                    value={formData.studentCode} 
                    readOnly 
                    required 
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 font-mono font-bold text-blue-600 outline-none cursor-not-allowed text-sm pl-9 select-all" 
                  />
                  <Lock size={15} className="absolute left-3 text-blue-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Ngày sinh</label>
                <input 
                  type="date" 
                  name="dateOfBirth" 
                  value={formData.dateOfBirth} 
                  onChange={handleChange} 
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium text-slate-700 bg-white" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Giới tính</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium text-slate-700 bg-white">
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Lớp học</label>
                <select name="classId" value={formData.classId} onChange={handleChange} className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium text-slate-700 bg-white">
                  <option value="">-- Chưa xếp lớp --</option>
                  {classesList.map((c, cIdx) => (
                    <option key={c.id || `class-opt-${cIdx}`} value={c.id}>{c.className} (Khối {c.grade})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Năm học / Niên khóa</label>
                <input 
                  type="text" 
                  name="academicYear" 
                  value={formData.academicYear} 
                  onChange={handleChange} 
                  placeholder="VD: 2024-2027 hoặc K24" 
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium text-slate-700" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Số điện thoại cá nhân HS *</label>
                <input 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  placeholder="VD: 0912345678" 
                  maxLength={10}
                  className={`w-full px-3.5 py-2 rounded-xl border outline-none text-sm font-medium ${
                    errors.phone ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
                {errors.phone && (
                  <p className="text-rose-500 text-xs mt-1 font-medium">{errors.phone}</p>
                )}
              </div>

              {student && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Trạng thái tài khoản</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-bold text-slate-800 bg-white">
                    <option value="active">🟢 Hoạt động</option>
                    <option value="suspended">🟡 Tạm khóa (Đình chỉ)</option>
                    <option value="withdrawn">🟠 Đã thôi học</option>
                    <option value="blocked">🔴 Khóa hoàn toàn</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: Thông tin phụ huynh */}
          <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-200/70">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-4 pb-2 border-b border-amber-200/50">
              <Users size={18} />
              <span>2. Thông tin Phụ huynh & Liên hệ Khẩn cấp</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Họ và tên Phụ huynh / Người giám hộ</label>
                <input 
                  type="text" 
                  name="parentName" 
                  value={formData.parentName} 
                  onChange={handleChange} 
                  placeholder="VD: Trần Văn Phụ Huynh"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white outline-none text-sm font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-100" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">SĐT Phụ huynh (Liên hệ khẩn cấp)</label>
                <div className="relative flex items-center">
                  <input 
                    type="tel" 
                    name="parentPhone" 
                    value={formData.parentPhone} 
                    onChange={handleChange} 
                    placeholder="VD: 0988123456" 
                    maxLength={10}
                    className={`w-full px-3.5 py-2 rounded-xl border bg-white outline-none text-sm font-medium pl-9 ${
                      errors.parentPhone ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                    }`}
                  />
                  <PhoneCall size={15} className="absolute left-3 text-amber-600" />
                </div>
                {errors.parentPhone && (
                  <p className="text-rose-500 text-xs mt-1 font-medium">{errors.parentPhone}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors font-semibold text-sm cursor-pointer">
              Hủy bỏ
            </button>
            <button type="submit" className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all cursor-pointer">
              Lưu thông tin
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Modal Cài đặt & Hướng dẫn Đồng bộ Google Sheets
const GoogleSheetsModal = ({ isOpen, onClose, webhookUrl, setWebhookUrl, onSync, onExport, isSyncing, isExporting }) => {
  const [copied, setCopied] = useState(false);
  const [scriptCode, setScriptCode] = useState('');
  const [activeTab, setActiveTab] = useState('settings'); // 'settings', 'guide', 'format'

  useEffect(() => {
    if (isOpen) {
      api.get('/students/google-sheets/template')
        .then(res => {
          if (res.data?.script) setScriptCode(res.data.script);
        })
        .catch(err => console.error('Failed to load script template:', err));
    }
  }, [isOpen]);

  const handleCopyCode = () => {
    if (!scriptCode) return;
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveUrl = () => {
    localStorage.setItem('google_sheet_webhook_url', webhookUrl);
    Swal.fire({
      icon: 'success',
      title: 'Đã lưu Webhook URL!',
      text: 'URL này sẽ được sử dụng tự động cho các lần đồng bộ sau.',
      timer: 2000,
      showConfirmButton: false
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Kết Nối & Đồng Bộ Google Sheets</h2>
              <p className="text-emerald-100 text-xs mt-0.5">Quản lý danh sách học sinh 2 chiều qua Google Apps Script Webhook</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10">
            <X size={22} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50/70 px-6 pt-3 gap-3">
          <button 
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'settings' 
                ? 'border-emerald-600 text-emerald-700' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings size={16} />
            Đồng bộ & Cấu hình
          </button>
          <button 
            onClick={() => setActiveTab('guide')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'guide' 
                ? 'border-emerald-600 text-emerald-700' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <HelpCircle size={16} />
            Hướng dẫn & Lấy mã Script
          </button>
          <button 
            onClick={() => setActiveTab('format')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'format' 
                ? 'border-emerald-600 text-emerald-700' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileSpreadsheet size={16} />
            Định dạng cột Sheet
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-gray-700">
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Webhook URL Input */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <label className="block font-semibold text-gray-800">
                  Google Apps Script Webhook URL:
                </label>
                <div className="flex gap-2">
                  <input 
                    type="url" 
                    value={webhookUrl} 
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono bg-white"
                  />
                  <button 
                    onClick={handleSaveUrl}
                    className="px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium transition-colors shadow-sm"
                  >
                    Lưu URL
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  💡 Nhập Web App URL sau khi deploy Google Apps Script trên bảng tính Google Sheet của bạn.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-5 border border-emerald-100 bg-emerald-50/50 rounded-2xl flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-2 font-bold text-emerald-800 mb-1">
                      <Download className="w-5 h-5 text-emerald-600" />
                      1. Kéo dữ liệu từ Google Sheet về
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Hệ thống sẽ đọc toàn bộ học sinh từ Sheet, tự động cập nhật nếu mã đã tồn tại hoặc tạo mới tài khoản nếu là học sinh mới.
                    </p>
                  </div>
                  <button
                    onClick={onSync}
                    disabled={isSyncing || !webhookUrl}
                    className={`w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 text-white shadow-md transition-all ${
                      isSyncing || !webhookUrl
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                    }`}
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Đang đồng bộ...
                      </>
                    ) : (
                      <>
                        <Download size={18} />
                        Đồng Bộ Từ Google Sheet
                      </>
                    )}
                  </button>
                </div>

                <div className="p-5 border border-blue-100 bg-blue-50/50 rounded-2xl flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-2 font-bold text-blue-800 mb-1">
                      <Upload className="w-5 h-5 text-blue-600" />
                      2. Xuất dữ liệu lên Google Sheet
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Xuất toàn bộ danh sách học sinh hiện tại từ phần mềm lên Google Sheet với định dạng cột chuẩn và tiêu đề màu sắc đẹp mắt.
                    </p>
                  </div>
                  <button
                    onClick={onExport}
                    disabled={isExporting || !webhookUrl}
                    className={`w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 text-white shadow-md transition-all ${
                      isExporting || !webhookUrl
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                    }`}
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Đang xuất...
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        Xuất Lên Google Sheet
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <span className="font-semibold text-emerald-900">Mã Google Apps Script (Sẵn sàng triển khai):</span>
                <button 
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Đã sao chép!' : 'Sao chép mã Apps Script'}
                </button>
              </div>

              <div className="relative rounded-xl border border-gray-300 bg-gray-900 p-4 text-emerald-400 font-mono text-xs max-h-56 overflow-y-auto">
                <pre>{scriptCode || '// Đang tải mã template...'}</pre>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <h4 className="font-bold text-gray-800 text-sm">3 Bước Đơn Giản Để Thiết Lập (Chỉ 1 phút):</h4>
                <ol className="list-decimal list-inside space-y-2 text-xs text-gray-600">
                  <li>
                    Mở file Google Sheet của bạn &rarr; Chọn menu <b>Tiện ích mở rộng (Extensions)</b> &rarr; <b>Apps Script</b>.
                  </li>
                  <li>
                    Xóa hết mã cũ trong file <code className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-800 font-mono">Code.gs</code>, dán toàn bộ đoạn mã bên trên vào và bấm <b>Lưu (Ctrl + S)</b>.
                  </li>
                  <li>
                    Bấm <b>Triển khai (Deploy)</b> &rarr; <b>Tùy chọn triển khai mới (New deployment)</b>:
                    <ul className="list-disc list-inside pl-4 pt-1 space-y-1 text-gray-700">
                      <li>Chọn loại: <b>Ứng dụng web (Web app)</b></li>
                      <li>Thực thi dưới dạng: <b>Tôi (Me)</b></li>
                      <li>Ai có quyền truy cập: <b>Bất kỳ ai (Anyone)</b></li>
                    </ul>
                  </li>
                  <li>
                    Bấm <b>Triển khai</b> &rarr; Cấp quyền &rarr; <b>Sao chép URL ứng dụng web</b> và dán vào tab <b>"Đồng bộ & Cấu hình"</b>.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'format' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-600">
                Khi nhập liệu trực tiếp trên Google Sheet, bạn có thể đặt tiêu đề hàng đầu tiên (Header) theo các cột sau. Hệ thống tự động nhận diện cả Tiếng Việt có dấu hoặc không dấu:
              </p>
              <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-700 font-bold">
                    <tr>
                      <th className="px-4 py-2.5 border-b">Tên cột (Header)</th>
                      <th className="px-4 py-2.5 border-b">Mô tả</th>
                      <th className="px-4 py-2.5 border-b">Ví dụ</th>
                      <th className="px-4 py-2.5 border-b">Bắt buộc?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    <tr>
                      <td className="px-4 py-2 font-mono font-semibold text-blue-600">Mã Học Sinh</td>
                      <td className="px-4 py-2">Mã định danh duy nhất</td>
                      <td className="px-4 py-2 font-mono">HS001</td>
                      <td className="px-4 py-2 text-red-500 font-bold">Bắt buộc</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono font-semibold text-blue-600">Họ Và Tên</td>
                      <td className="px-4 py-2">Họ tên đầy đủ học sinh</td>
                      <td className="px-4 py-2">Nguyễn Văn An</td>
                      <td className="px-4 py-2 text-red-500 font-bold">Bắt buộc</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono font-semibold text-blue-600">Giới Tính</td>
                      <td className="px-4 py-2">Nam / Nữ</td>
                      <td className="px-4 py-2">Nam</td>
                      <td className="px-4 py-2 text-gray-400">Tùy chọn</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono font-semibold text-blue-600">Lớp</td>
                      <td className="px-4 py-2">Tên lớp (tự tạo nếu chưa có)</td>
                      <td className="px-4 py-2 font-mono">10A1</td>
                      <td className="px-4 py-2 text-gray-400">Tùy chọn</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono font-semibold text-blue-600">Ngày Sinh</td>
                      <td className="px-4 py-2">Định dạng YYYY-MM-DD</td>
                      <td className="px-4 py-2 font-mono">2008-05-15</td>
                      <td className="px-4 py-2 text-gray-400">Tùy chọn</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono font-semibold text-blue-600">Số Điện Thoại</td>
                      <td className="px-4 py-2">Số điện thoại của học sinh</td>
                      <td className="px-4 py-2 font-mono">0901234567</td>
                      <td className="px-4 py-2 text-gray-400">Tùy chọn</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono font-semibold text-blue-600">SĐT Phụ Huynh</td>
                      <td className="px-4 py-2">Số điện thoại liên hệ phụ huynh</td>
                      <td className="px-4 py-2 font-mono">0987654321</td>
                      <td className="px-4 py-2 text-gray-400">Tùy chọn</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono font-semibold text-blue-600">Địa Chỉ</td>
                      <td className="px-4 py-2">Nơi ở hiện tại</td>
                      <td className="px-4 py-2">Hà Nội</td>
                      <td className="px-4 py-2 text-gray-400">Tùy chọn</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono font-semibold text-blue-600">Trạng Thái</td>
                      <td className="px-4 py-2">active / inactive</td>
                      <td className="px-4 py-2 font-mono">active</td>
                      <td className="px-4 py-2 text-gray-400">Tùy chọn</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Modal cấp lại / reset mật khẩu 1 lần (One-Time Password)
const ResetPasswordModal = ({ isOpen, onClose, resetData }) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen || !resetData) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(resetData.temporaryPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100"
      >
        <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl">
              <Key size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Cấp lại Mật khẩu</h3>
              <p className="text-xs text-orange-100">Bảo mật tài khoản một lần duy nhất</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm text-gray-700">
          <div className="bg-gray-50 p-4 rounded-2xl space-y-2 border border-gray-100">
            <div className="flex justify-between">
              <span className="text-gray-500">Học sinh:</span>
              <span className="font-bold text-gray-900">{resetData.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Mã HS:</span>
              <span className="font-mono font-semibold text-blue-600">{resetData.studentCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email:</span>
              <span className="font-mono text-gray-700 text-xs">{resetData.email}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
              Mật khẩu tạm thời mới (One-Time Display)
            </label>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={resetData.temporaryPassword} 
                className="w-full font-mono text-lg font-bold bg-amber-50/70 border border-amber-200 text-amber-900 rounded-xl px-4 py-2.5 outline-none text-center select-all"
              />
              <button 
                onClick={handleCopy}
                className={`p-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  copied 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                }`}
                title="Sao chép mật khẩu"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                <span className="text-xs">{copied ? 'Đã chép' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl text-xs text-amber-800 flex gap-2.5 items-start">
            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Lưu ý bảo mật:</strong> Mật khẩu này chỉ xuất hiện <strong>01 lần duy nhất</strong> trên màn hình này. Hãy sao chép và gửi trực tiếp cho học sinh/phụ huynh.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium transition-colors"
          >
            Đã lưu & Đóng
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Modal Chuyển Lớp Hàng Loạt
const BulkChangeClassModal = ({ isOpen, onClose, selectedCount, classesList, onConfirm }) => {
  const [targetClassId, setTargetClassId] = useState('');
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100"
      >
        <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
          <h3 className="font-bold text-lg">Chuyển Lớp Hàng Loạt</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4 text-sm text-gray-700">
          <p className="text-sm text-gray-600">
            Bạn đang chọn <strong>{selectedCount}</strong> học sinh để chuyển sang lớp mới.
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">Chọn lớp đích:</label>
            <select
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">-- Chọn lớp học --</option>
              {classesList.map(c => (
                <option key={c.id} value={c.id}>{c.className} (Khối {c.grade})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-200 text-sm font-medium">Hủy</button>
          <button 
            disabled={!targetClassId}
            onClick={() => onConfirm(targetClassId)}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            Xác nhận chuyển
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Modal Wizard Chuyển năm học & Xếp lớp tự động
const RolloverWizardModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [fromYear, setFromYear] = useState('2025-2026');
  const [toYear, setToYear] = useState('2026-2027');
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    try {
      setLoading(true);
      const res = await api.post('/students/rollover/simulate', { fromYear, toYear });
      setSimulation(res.data.data);
      setStep(2);
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.message || 'Lỗi khi mô phỏng chuyển năm học', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    try {
      setLoading(true);
      const res = await api.post('/students/rollover/execute', { toYear });
      Swal.fire('Thành công', res.data.message, 'success');
      onSuccess();
      onClose();
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.message || 'Lỗi khi thực thi chuyển năm học', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
      >
        <div className="p-6 bg-gradient-to-r from-purple-700 to-indigo-800 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl">
              <Sparkles size={22} className="text-purple-200" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Chuyển Năm Học & Xếp Lớp Tự Động</h3>
              <p className="text-xs text-purple-200">Quy trình 3 bước chuẩn ERP THPT TTLN</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-gray-100 bg-gray-50 px-6 py-3 justify-between text-xs font-semibold text-gray-500">
          <span className={step >= 1 ? 'text-purple-700 font-bold' : ''}>1. Chọn Niên khóa</span>
          <span>→</span>
          <span className={step >= 2 ? 'text-purple-700 font-bold' : ''}>2. Mô phỏng & Quét điều kiện</span>
          <span>→</span>
          <span className={step >= 3 ? 'text-purple-700 font-bold' : ''}>3. Xác nhận thực thi</span>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-sm text-gray-700">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-gray-600 leading-relaxed">
                Hệ thống sẽ quét toàn bộ học sinh của năm học cũ, tự động xét điều kiện tốt nghiệp cho Khối 12, thăng hạng Khối 11 lên 12, Khối 10 lên 11 và lọc học sinh có nguy cơ lưu ban (&gt;45 buổi vắng).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Năm học hiện tại (Nguồn):</label>
                  <input type="text" value={fromYear} onChange={e => setFromYear(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl font-mono text-sm bg-white outline-none" />
                </div>
                <div className="bg-purple-50/40 p-4 rounded-2xl border border-purple-200">
                  <label className="block text-xs font-semibold text-purple-700 mb-1.5 uppercase">Năm học mới (Đích):</label>
                  <input type="text" value={toYear} onChange={e => setToYear(e.target.value)} className="w-full px-4 py-2.5 border border-purple-300 rounded-xl font-mono text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && simulation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <div className="text-2xl font-black text-emerald-700">{simulation.summary.graduatedCount}</div>
                  <div className="text-xs text-emerald-600 font-bold mt-1">K12 Tốt Nghiệp</div>
                </div>
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl">
                  <div className="text-2xl font-black text-blue-700">{simulation.summary.promoteTo12Count}</div>
                  <div className="text-xs text-blue-600 font-bold mt-1">K11 Lên Lớp 12</div>
                </div>
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl">
                  <div className="text-2xl font-black text-indigo-700">{simulation.summary.promoteTo11Count}</div>
                  <div className="text-xs text-indigo-600 font-bold mt-1">K10 Lên Lớp 11</div>
                </div>
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl">
                  <div className="text-2xl font-black text-red-700">{simulation.summary.retainCount}</div>
                  <div className="text-xs text-red-600 font-bold mt-1">Lưu Ban (Vắng &gt;45)</div>
                </div>
              </div>

              {simulation.retainList.length > 0 && (
                <div className="p-4 bg-red-50/80 border border-red-200 rounded-2xl text-xs space-y-1.5">
                  <span className="font-bold text-red-800">Cảnh báo học sinh lưu ban (ở lại lớp):</span>
                  <ul className="list-disc pl-5 text-red-700 space-y-1">
                    {simulation.retainList.map(r => (
                      <li key={r.id}><strong>{r.fullName}</strong> ({r.studentCode} - {r.currentClass}): {r.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
          {step === 1 ? (
            <div></div>
          ) : (
            <button onClick={() => setStep(1)} className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-200 text-sm font-medium">
              Quay lại
            </button>
          )}

          {step === 1 ? (
            <button 
              onClick={handleSimulate} 
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-sm flex items-center gap-2 shadow-md cursor-pointer"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Mô phỏng & Xem trước
            </button>
          ) : (
            <button 
              onClick={handleExecute} 
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center gap-2 shadow-md cursor-pointer"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Xác nhận Thực thi
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const Students = () => {
  const [students, setStudents] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedFilterClass, setSelectedFilterClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');

  // Sorting states
  const [sortField, setSortField] = useState('studentCode');
  const [sortOrder, setSortOrder] = useState('asc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Bulk Selection state
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // New Modals: Reset Password, Bulk Change Class, Rollover Wizard
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState(null);
  const [isBulkClassModalOpen, setIsBulkClassModalOpen] = useState(false);
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);

  // Google Sheets state
  const [webhookUrl, setWebhookUrl] = useState(() => 
    localStorage.getItem('google_sheet_webhook_url') || 'https://script.google.com/macros/s/AKfycbxGfcWXmnD0-pKDZiC8NbOQn0v_9fsfIw18iaFgv0PpUE8Pt0myFUGVNhswWnxXmNQ49A/exec'
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole') || 'student';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resStudents, resClasses] = await Promise.all([
        api.get('/students'),
        api.get('/classes')
      ]);
      setStudents(resStudents.data);
      setClassesList(resClasses.data);
      setSelectedStudentIds([]);
    } catch (err) {
      console.error(err);
      Swal.fire('Lỗi', 'Không thể tải dữ liệu học sinh!', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Trạng thái kiểm tra có bộ lọc nào đang được áp dụng
  const isFilterActive = Boolean(
    searchTerm.trim() || 
    selectedGrade !== 'all' || 
    selectedFilterClass !== 'all' || 
    selectedStatus !== 'all' || 
    selectedGender !== 'all'
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedGrade('all');
    setSelectedFilterClass('all');
    setSelectedStatus('all');
    setSelectedGender('all');
    setCurrentPage(1);
  };

  // Lọc danh sách học sinh
  const filteredStudents = students.filter(s => {
    const term = searchTerm.toLowerCase().trim();
    const matchSearch = !term || 
      s.fullName?.toLowerCase().includes(term) || 
      s.studentCode?.toLowerCase().includes(term) ||
      (s.phone && s.phone.includes(term)) ||
      (s.parentPhone && s.parentPhone.includes(term));

    const matchGrade = selectedGrade === 'all' || 
      (s.class && String(s.class.grade) === String(selectedGrade));

    const matchClass = selectedFilterClass === 'all' || s.classId === selectedFilterClass;

    const rawStatus = (s.status || 'active').toLowerCase();
    const matchStatus = selectedStatus === 'all' || 
      (selectedStatus === 'active' 
        ? (!s.status || rawStatus === 'active') 
        : rawStatus === selectedStatus.toLowerCase());

    const matchGender = selectedGender === 'all' || s.gender === selectedGender;

    return matchSearch && matchGrade && matchClass && matchStatus && matchGender;
  });

  // Sắp xếp danh sách
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';
    if (sortField === 'class') {
      aVal = a.class?.className || '';
      bVal = b.class?.className || '';
    }
    if (typeof aVal === 'string') {
      return sortOrder === 'asc' 
        ? aVal.localeCompare(bVal, 'vi', { sensitivity: 'base' }) 
        : bVal.localeCompare(aVal, 'vi', { sensitivity: 'base' });
    }
    return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  // Phân trang
  const totalItems = sortedStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const paginatedStudents = sortedStudents.slice((currentPageSafe - 1) * pageSize, currentPageSafe * pageSize);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Selection
  const isAllCurrentPageSelected = paginatedStudents.length > 0 && 
    paginatedStudents.every(s => selectedStudentIds.includes(s.id));

  const handleToggleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      const pageIds = new Set(paginatedStudents.map(s => s.id));
      setSelectedStudentIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const pageIds = paginatedStudents.map(s => s.id);
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Reset MK cho 1 học sinh
  const handleResetPassword = async (student) => {
    const result = await Swal.fire({
      title: 'Cấp lại Mật khẩu?',
      html: `Hệ thống sẽ sinh mật khẩu ngẫu nhiên mới cho <strong>${student.fullName}</strong> (${student.studentCode}).`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Tạo mật khẩu mới',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#f59e0b'
    });

    if (result.isConfirmed) {
      try {
        const res = await api.post(`/students/${student.id}/reset-password`);
        setResetPasswordData(res.data.data);
        setIsResetModalOpen(true);
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Không thể đặt lại mật khẩu', 'error');
      }
    }
  };

  // Bulk Actions
  const handleBulkChangeClassConfirm = async (targetClassId) => {
    try {
      const res = await api.post('/students/bulk/change-class', {
        studentIds: selectedStudentIds,
        targetClassId
      });
      Swal.fire('Thành công', res.data.message, 'success');
      setIsBulkClassModalOpen(false);
      fetchData();
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.message || 'Lỗi khi chuyển lớp hàng loạt', 'error');
    }
  };

  const handleBulkToggleStatus = async (status) => {
    const actionText = status === 'blocked' ? 'khóa' : 'mở khóa';
    const result = await Swal.fire({
      title: `Xác nhận ${actionText}?`,
      text: `Bạn có chắc muốn ${actionText} tài khoản của ${selectedStudentIds.length} học sinh đã chọn?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Đồng ý ${actionText}`,
      cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
      try {
        const res = await api.post('/students/bulk/toggle-status', {
          studentIds: selectedStudentIds,
          status
        });
        Swal.fire('Thành công', res.data.message, 'success');
        fetchData();
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Lỗi khi cập nhật trạng thái', 'error');
      }
    }
  };

  const handleBulkResetPassword = async () => {
    const result = await Swal.fire({
      title: 'Reset MK Hàng Loạt?',
      text: `Hệ thống sẽ sinh mật khẩu mới cho ${selectedStudentIds.length} học sinh và xuất file danh sách.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Thực hiện & Xuất file',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#f59e0b'
    });

    if (result.isConfirmed) {
      try {
        const res = await api.post('/students/bulk/reset-password', {
          studentIds: selectedStudentIds
        });
        const credentials = res.data.data || [];

        // Xuất file CSV
        const headers = 'STT,Mã Học Sinh,Họ và Tên,Email,Mật Khẩu Tạm Thời\n';
        const rows = credentials.map((c, idx) => 
          `"${idx + 1}","${c.studentCode}","${c.fullName}","${c.email}","${c.temporaryPassword}"`
        ).join('\n');

        const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Mat_Khau_Moi_Hoc_Sinh_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        Swal.fire('Thành công', `Đã cấp mật khẩu mới cho ${credentials.length} học sinh và tải xuống file danh sách.`, 'success');
        fetchData();
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Lỗi khi reset mật khẩu hàng loạt', 'error');
      }
    }
  };

  const handleBulkDelete = async () => {
    const result = await Swal.fire({
      title: 'Xóa hàng loạt học sinh?',
      text: `Toàn bộ hồ sơ và tài khoản của ${selectedStudentIds.length} học sinh đã chọn sẽ bị xóa. Hành động này không thể hoàn tác!`,
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Hủy',
      confirmButtonText: 'Xóa vĩnh viễn'
    });

    if (result.isConfirmed) {
      try {
        const res = await api.post('/students/bulk/delete', {
          studentIds: selectedStudentIds
        });
        Swal.fire('Thành công', res.data.message, 'success');
        fetchData();
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Lỗi khi xóa học sinh hàng loạt', 'error');
      }
    }
  };

  // Xuất Excel danh sách
  const handleExportExcel = () => {
    try {
      const exportList = filteredStudents.length > 0 ? filteredStudents : students;
      if (exportList.length === 0) {
        Swal.fire('Thông báo', 'Không có học sinh nào để xuất', 'info');
        return;
      }

      const headers = 'STT,Mã Học Sinh,Họ và Tên,Giới Tính,Ngày Sinh,Khối,Lớp,SĐT Cá Nhân,Tên Phụ Huynh,SĐT Phụ Huynh,Trạng Thái\n';
      const rows = exportList.map((s, idx) => {
        const dob = s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('vi-VN') : '';
        const className = s.class?.className || 'Chưa xếp lớp';
        const grade = s.class?.grade ? `Khối ${s.class.grade}` : '';
        const status = s.user?.status === 'blocked' ? 'Đã khóa' : (s.user?.status === 'suspended' ? 'Đình chỉ' : 'Hoạt động');
        return `"${idx + 1}","${s.studentCode || ''}","${s.fullName || ''}","${s.gender || 'Nam'}","${dob}","${grade}","${className}","${s.phone || ''}","${s.parentName || ''}","${s.parentPhone || ''}","${status}"`;
      }).join('\n');

      const csvContent = '\uFEFF' + headers + rows;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Danh_Sach_Hoc_Sinh_THPT_TTLN_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      Swal.fire('Thành công', `Đã xuất ${exportList.length} học sinh ra file CSV/Excel thành công!`, 'success');
    } catch (err) {
      console.error('Export error:', err);
      Swal.fire('Lỗi', 'Không thể xuất danh sách học sinh', 'error');
    }
  };

  const handleEdit = (student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedStudent(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Xóa học sinh?',
      text: 'Toàn bộ dữ liệu tài khoản và hồ sơ học sinh sẽ bị xóa. Bạn có chắc chắn?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: 'Hủy',
      confirmButtonText: 'Xóa ngay'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/students/${id}`);
        Swal.fire('Thành công', 'Đã xoá học sinh', 'success');
        fetchData();
      } catch (err) {
        Swal.fire('Lỗi', err.response?.data?.message || 'Lỗi khi xoá học sinh', 'error');
      }
    }
  };

  const handleModalSubmit = async (formData) => {
    try {
      if (selectedStudent) {
        await api.put(`/students/${selectedStudent.id}`, formData);
        Swal.fire('Thành công', 'Cập nhật thông tin học sinh thành công', 'success');
      } else {
        await api.post('/students', formData);
        Swal.fire('Thành công', 'Thêm học sinh mới thành công', 'success');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      Swal.fire('Lỗi', err.response?.data?.message || 'Không thể lưu học sinh', 'error');
    }
  };

  const handleSyncFromSheets = async () => {
    if (!webhookUrl) {
      setIsSheetModalOpen(true);
      Swal.fire('Chưa có Webhook URL', 'Vui lòng cài đặt Webhook URL trước khi đồng bộ', 'info');
      return;
    }
    try {
      setIsSyncing(true);
      const res = await api.post('/students/google-sheets/sync', { webhookUrl });
      Swal.fire('Thành công', res.data.message || 'Đồng bộ từ Google Sheet hoàn tất', 'success');
      fetchData();
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.message || 'Lỗi khi kéo dữ liệu Google Sheet', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportToSheets = async () => {
    if (!webhookUrl) {
      setIsSheetModalOpen(true);
      Swal.fire('Chưa có Webhook URL', 'Vui lòng nhập Webhook URL', 'info');
      return;
    }
    try {
      setIsExporting(true);
      const res = await api.post('/students/google-sheets/export', { webhookUrl });
      Swal.fire('Thành công', `Đã xuất ${res.data.count} học sinh lên Google Sheet`, 'success');
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.message || 'Lỗi khi gửi dữ liệu sang Google Sheet', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 font-poppins pb-24 relative">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-800">Quản lý Học sinh</h2>
            {isFilterActive ? (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200 flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Đang lọc: {totalItems} / {students.length} Học sinh
                </span>
                <button 
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-semibold cursor-pointer"
                  title="Xóa nhanh các bộ lọc đang chọn"
                >
                  (Xóa bộ lọc)
                </button>
              </div>
            ) : (
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                {totalItems} Học sinh
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">Danh sách hồ sơ, tác vụ hàng loạt và chuyển năm học tự động</p>
        </div>

        {userRole === 'admin' && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Rollover Wizard Button */}
            <button 
              onClick={() => setIsRolloverModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold text-sm transition-all border border-purple-200 shadow-sm cursor-pointer"
              title="Chuyển năm học & Xếp lớp tự động (K12 tốt nghiệp, K10-K11 lên lớp)"
            >
              <Sparkles size={16} className="text-purple-600" />
              <span>Chuyển Năm Học</span>
            </button>

            {/* Excel / CSV Import */}
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-sm transition-all border border-indigo-200 shadow-sm cursor-pointer"
            >
              <FileSpreadsheet size={16} className="text-indigo-600" />
              <span>Nhập Excel</span>
            </button>

            {/* Excel Export */}
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-sm transition-all border border-emerald-200 shadow-sm cursor-pointer"
            >
              <Download size={16} className="text-emerald-600" />
              <span>Xuất Excel</span>
            </button>

            {/* Google Sheets Sync */}
            <button 
              onClick={handleSyncFromSheets}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-50 text-slate-700 hover:bg-slate-100 font-semibold text-sm transition-all border border-slate-200 shadow-sm"
              title="Đồng bộ 2 chiều với Google Sheets"
            >
              {isSyncing ? <RefreshCw size={16} className="animate-spin text-slate-600" /> : <RefreshCw size={16} />}
              <span>Đồng bộ Sheet</span>
            </button>

            {/* Add Student Button */}
            <button onClick={handleAdd} className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm rounded-2xl cursor-pointer">
              <Plus size={18} />
              Thêm Học sinh
            </button>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Multi-filter Toolbar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/60 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Tìm tên, mã HS, SĐT..."
                className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white shadow-sm"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Filter by Grade */}
              <select 
                className="px-3.5 py-2.5 border border-gray-200 rounded-2xl text-gray-700 outline-none text-sm bg-white focus:ring-2 focus:ring-blue-500 shadow-sm"
                value={selectedGrade}
                onChange={(e) => { setSelectedGrade(e.target.value); setSelectedFilterClass('all'); setCurrentPage(1); }}
              >
                <option value="all">Tất cả Khối</option>
                <option value="10">Khối 10</option>
                <option value="11">Khối 11</option>
                <option value="12">Khối 12</option>
              </select>

              {/* Filter by Class */}
              <select 
                className="px-3.5 py-2.5 border border-gray-200 rounded-2xl text-gray-700 outline-none text-sm bg-white focus:ring-2 focus:ring-blue-500 shadow-sm"
                value={selectedFilterClass}
                onChange={(e) => { setSelectedFilterClass(e.target.value); setCurrentPage(1); }}
              >
                <option value="all">Tất cả lớp học</option>
                {classesList
                  .filter(c => selectedGrade === 'all' || String(c.grade) === String(selectedGrade))
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.className}</option>
                  ))}
              </select>

              {/* Filter by Status */}
              <select 
                className="px-3.5 py-2.5 border border-gray-200 rounded-2xl text-gray-700 outline-none text-sm bg-white focus:ring-2 focus:ring-blue-500 shadow-sm"
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang học</option>
                <option value="graduated">Đã tốt nghiệp</option>
                <option value="suspended">Đình chỉ</option>
                <option value="reserved">Bảo lưu</option>
              </select>

              {/* Filter by Gender */}
              <select 
                className="px-3.5 py-2.5 border border-gray-200 rounded-2xl text-gray-700 outline-none text-sm bg-white focus:ring-2 focus:ring-blue-500 shadow-sm"
                value={selectedGender}
                onChange={(e) => { setSelectedGender(e.target.value); setCurrentPage(1); }}
              >
                <option value="all">Tất cả giới tính</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>

              {/* Reset Filters Button */}
              {isFilterActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-sm font-semibold transition-all shadow-sm cursor-pointer active:scale-95"
                  title="Đặt lại tất cả bộ lọc về mặc định"
                >
                  <RotateCcw size={15} />
                  <span>Xóa bộ lọc</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <span>Đang nạp dữ liệu học sinh...</span>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-600 border-collapse">
              <thead className="bg-gray-50/80 text-gray-700 font-semibold border-b border-gray-100">
                <tr>
                  {userRole === 'admin' && (
                    <th className="px-4 py-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        checked={isAllCurrentPageSelected} 
                        onChange={handleToggleSelectAll} 
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                  )}
                  <th 
                    onClick={() => handleSort('studentCode')} 
                    className="px-5 py-4 cursor-pointer select-none hover:text-blue-600 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Mã HS</span>
                      <ArrowUpDown size={14} className="text-gray-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('fullName')} 
                    className="px-5 py-4 cursor-pointer select-none hover:text-blue-600 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Họ và tên</span>
                      <ArrowUpDown size={14} className="text-gray-400" />
                    </div>
                  </th>
                  <th className="px-4 py-4">Giới tính</th>
                  <th 
                    onClick={() => handleSort('class')} 
                    className="px-5 py-4 cursor-pointer select-none hover:text-blue-600 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Khối / Lớp</span>
                      <ArrowUpDown size={14} className="text-gray-400" />
                    </div>
                  </th>
                  <th className="px-4 py-4">SĐT Học Sinh</th>
                  <th className="px-4 py-4">SĐT Phụ Huynh</th>
                  <th className="px-4 py-4">Trạng thái HS</th>
                  <th className="px-4 py-4">Tài khoản</th>
                  {userRole === 'admin' && (
                    <th className="px-5 py-4 text-right">Thao tác</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={userRole === 'admin' ? 10 : 8} className="px-6 py-16 text-center text-gray-400">
                      <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-semibold text-gray-700">Không tìm thấy học sinh nào phù hợp.</p>
                      <p className="text-xs mt-1 text-gray-400">Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc.</p>
                      {isFilterActive && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 text-xs font-semibold cursor-pointer transition-all active:scale-95"
                        >
                          <RotateCcw size={14} />
                          <span>Đặt lại tất cả bộ lọc</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ) : paginatedStudents.map((student) => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  const isAccountActive = student.user?.status === 'active';

                  return (
                    <tr 
                      key={student.id} 
                      className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50/60' : ''
                      }`}
                      onClick={() => navigate(`/students/${student.id}`)}
                    >
                      {userRole === 'admin' && (
                        <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={isSelected} 
                            onChange={() => handleToggleSelect(student.id)} 
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-5 py-4 font-mono font-bold text-blue-600 text-xs">
                        {student.studentCode}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">{student.fullName}</div>
                        <div className="text-xs text-gray-400 font-mono">{student.user?.email || 'Chưa có email'}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          student.gender === 'Nữ' 
                            ? 'bg-pink-50 text-pink-700 border border-pink-200' 
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {student.gender || 'Nam'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {student.class ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              K{student.class.grade}
                            </span>
                            <span className="font-semibold text-gray-800 text-xs">
                              {student.class.className}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Chưa xếp</span>
                        )}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-gray-600">
                        {student.phone || '---'}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-gray-600" onClick={e => e.stopPropagation()}>
                        {student.parentPhone ? (
                          <a href={`tel:${student.parentPhone}`} className="text-emerald-600 hover:underline font-semibold flex items-center gap-1">
                            <PhoneCall size={12} />
                            {student.parentPhone}
                          </a>
                        ) : (
                          student.parentName || '---'
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {(() => {
                          const rawStatus = (student.status || 'active').toLowerCase();
                          if (rawStatus === 'graduated') {
                            return (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                                Tốt nghiệp
                              </span>
                            );
                          }
                          if (rawStatus === 'suspended') {
                            return (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                                Đình chỉ
                              </span>
                            );
                          }
                          if (rawStatus === 'reserved') {
                            return (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                                Bảo lưu
                              </span>
                            );
                          }
                          if (rawStatus === 'withdrawn') {
                            return (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                Thôi học
                              </span>
                            );
                          }
                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              Đang học
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isAccountActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                          {isAccountActive ? 'Hoạt động' : 'Bị khóa'}
                        </span>
                      </td>
                      {userRole === 'admin' && (
                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end items-center gap-1">
                            <button 
                              onClick={() => navigate(`/students/${student.id}`)} 
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" 
                              title="Hồ sơ 360°"
                            >
                              <Eye size={17} />
                            </button>
                            <button 
                              onClick={() => handleResetPassword(student)} 
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" 
                              title="Cấp lại / Reset Mật khẩu"
                            >
                              <Key size={17} />
                            </button>
                            <button 
                              onClick={() => handleEdit(student)} 
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                              title="Sửa thông tin"
                            >
                              <Edit size={17} />
                            </button>
                            <button 
                              onClick={() => handleDelete(student.id)} 
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" 
                              title="Xóa học sinh"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span>Hiển thị</span>
            <select 
              value={pageSize} 
              onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2.5 py-1 border border-gray-200 rounded-lg bg-white outline-none font-semibold text-gray-700"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>trên tổng <strong>{totalItems}</strong> học sinh</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              disabled={currentPageSafe <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 transition-colors"
              title="Trang trước"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 font-semibold text-gray-800">
              Trang {currentPageSafe} / {totalPages}
            </span>
            <button 
              disabled={currentPageSafe >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 transition-colors"
              title="Trang sau"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedStudentIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white backdrop-blur-md px-6 py-3.5 rounded-3xl shadow-2xl border border-slate-700 flex flex-wrap items-center gap-3 sm:gap-4 max-w-3xl w-[92vw]"
          >
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                {selectedStudentIds.length}
              </span>
              <span className="text-xs font-medium text-slate-300 hidden sm:inline">học sinh được chọn</span>
            </div>

            <div className="h-4 w-px bg-slate-700 hidden sm:block" />

            <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
              <button 
                onClick={() => setIsBulkClassModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Chuyển Lớp</span>
              </button>

              <button 
                onClick={() => handleBulkToggleStatus('blocked')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              >
                <span>Khóa TK</span>
              </button>

              <button 
                onClick={() => handleBulkToggleStatus('active')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              >
                <span>Mở Khóa</span>
              </button>

              <button 
                onClick={handleBulkResetPassword}
                className="px-3 py-1.5 rounded-xl bg-amber-600/90 hover:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Reset MK Batch</span>
              </button>

              <button 
                onClick={handleBulkDelete}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Xóa</span>
              </button>

              <button 
                onClick={() => setSelectedStudentIds([])}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
                title="Bỏ chọn tất cả"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <StudentModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            student={selectedStudent} 
            classesList={classesList} 
            onSubmit={handleModalSubmit} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSheetModalOpen && (
          <GoogleSheetsModal 
            isOpen={isSheetModalOpen} 
            onClose={() => setIsSheetModalOpen(false)} 
            webhookUrl={webhookUrl}
            setWebhookUrl={setWebhookUrl}
            onSync={handleSyncFromSheets}
            onExport={handleExportToSheets}
            isSyncing={isSyncing}
            isExporting={isExporting}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isImportModalOpen && (
          <StudentImportModal 
            isOpen={isImportModalOpen} 
            onClose={() => setIsImportModalOpen(false)} 
            classesList={classesList} 
            onSuccess={fetchData} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Students;
