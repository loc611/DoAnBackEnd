import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Edit, Trash2, X, Eye, 
  FileSpreadsheet, Download, Upload, Settings, 
  Copy, Check, ExternalLink, RefreshCw, HelpCircle, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import { generateStudentCode } from '../utils/codeGenerator';
import { isValidPhoneNumber, sanitizePhoneNumber, PHONE_ERROR_MESSAGES } from '../utils/phoneValidation';

// Modal Thêm / Sửa học sinh thủ công
const StudentModal = ({ isOpen, onClose, student, classesList, onSubmit }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    studentCode: '',
    gender: 'Nam',
    classId: '',
    phone: '',
    parentPhone: '',
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
        parentPhone: student.parentPhone || '',
        status: student.user?.status || 'active'
      });
    } else {
      setFormData({
        fullName: '',
        studentCode: generateStudentCode(),
        gender: 'Nam',
        classId: '',
        phone: '',
        parentPhone: '',
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
        newErrors[name] = name === 'phone' ? PHONE_ERROR_MESSAGES.REQUIRED : PHONE_ERROR_MESSAGES.PARENT_REQUIRED;
      } else if (!isValidPhoneNumber(value)) {
        newErrors[name] = name === 'phone' ? PHONE_ERROR_MESSAGES.INVALID : PHONE_ERROR_MESSAGES.PARENT_INVALID;
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

    if (!formData.parentPhone) {
      newErrors.parentPhone = PHONE_ERROR_MESSAGES.PARENT_REQUIRED;
    } else if (!isValidPhoneNumber(formData.parentPhone)) {
      newErrors.parentPhone = PHONE_ERROR_MESSAGES.PARENT_INVALID;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">
            {student ? 'Sửa thông tin Học sinh' : 'Thêm Học sinh mới'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
            <X size={24} />
          </button>
        </div>
        
        <form className="p-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Họ và tên *</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nhập họ tên..." />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mã học sinh (Tự động) *</label>
              <input type="text" name="studentCode" value={formData.studentCode} readOnly required className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-100 font-mono font-semibold text-blue-600 outline-none cursor-not-allowed" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Giới tính</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lớp học</label>
              <select name="classId" value={formData.classId} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">-- Chưa có lớp --</option>
                {classesList.map((c, cIdx) => (
                  <option key={c.id || `class-opt-${cIdx}`} value={c.id}>{c.className} (Khối {c.grade})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại HS *</label>
              <input 
                type="tel" 
                name="phone" 
                value={formData.phone} 
                onChange={handleChange} 
                placeholder="VD: 0912345678" 
                maxLength={10}
                className={`w-full px-4 py-2 rounded-lg border outline-none transition-colors ${
                  errors.phone ? 'border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50/20' : 'border-gray-200 focus:ring-2 focus:ring-blue-500'
                }`}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                  <span>⚠️</span> {errors.phone}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Số ĐT Phụ huynh *</label>
              <input 
                type="tel" 
                name="parentPhone" 
                value={formData.parentPhone} 
                onChange={handleChange} 
                placeholder="VD: 0987654321" 
                maxLength={10}
                className={`w-full px-4 py-2 rounded-lg border outline-none transition-colors ${
                  errors.parentPhone ? 'border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50/20' : 'border-gray-200 focus:ring-2 focus:ring-blue-500'
                }`}
              />
              {errors.parentPhone && (
                <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                  <span>⚠️</span> {errors.parentPhone}
                </p>
              )}
            </div>

            {student && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái tài khoản</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Bị khóa</option>
                </select>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium">
              Hủy bỏ
            </button>
            <button type="submit" className="btn-primary px-5 py-2.5">
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

const Students = () => {
  const [students, setStudents] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilterClass, setSelectedFilterClass] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  
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
    } catch (err) {
      console.error(err);
      Swal.fire('Lỗi', 'Không thể tải dữ liệu!', 'error');
    } finally {
      setLoading(false);
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
        Swal.fire('Thành công', 'Cập nhật thành công', 'success');
      } else {
        await api.post('/students', formData);
        Swal.fire('Thành công', 'Thêm học sinh thành công', 'success');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.message || 'Có lỗi xảy ra', 'error');
    }
  };

  // Đồng bộ từ Google Sheet (Import)
  const handleSyncFromSheets = async () => {
    if (!webhookUrl) {
      setIsSheetModalOpen(true);
      Swal.fire({
        icon: 'info',
        title: 'Chưa có Webhook URL',
        text: 'Vui lòng nhập Google Apps Script Webhook URL để tiến hành đồng bộ!'
      });
      return;
    }

    try {
      setIsSyncing(true);
      const res = await api.post('/students/google-sheets/sync', { webhookUrl });
      
      Swal.fire({
        icon: 'success',
        title: 'Đồng bộ Google Sheet thành công!',
        html: `
          <div class="text-left text-sm space-y-1">
            <p><b>Tổng số dòng xử lý:</b> ${res.data.total}</p>
            <p class="text-emerald-600"><b>✨ Thêm mới:</b> ${res.data.added} học sinh</p>
            <p class="text-blue-600"><b>🔄 Cập nhật:</b> ${res.data.updated} học sinh</p>
            ${res.data.errors?.length ? `<p class="text-red-500"><b>⚠️ Cảnh báo:</b> ${res.data.errors.length} dòng lỗi</p>` : ''}
          </div>
        `
      });

      fetchData();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Đồng bộ thất bại',
        text: err.response?.data?.message || 'Không thể kết nối đến Google Sheet Webhook'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Xuất dữ liệu lên Google Sheet (Export)
  const handleExportToSheets = async () => {
    if (!webhookUrl) {
      setIsSheetModalOpen(true);
      Swal.fire({
        icon: 'info',
        title: 'Chưa có Webhook URL',
        text: 'Vui lòng nhập Google Apps Script Webhook URL để tiến hành xuất dữ liệu!'
      });
      return;
    }

    try {
      setIsExporting(true);
      const res = await api.post('/students/google-sheets/export', { webhookUrl });
      
      Swal.fire({
        icon: 'success',
        title: 'Xuất dữ liệu thành công!',
        text: `Đã xuất ${res.data.count} học sinh lên Google Sheet.`
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Xuất dữ liệu thất bại',
        text: err.response?.data?.message || 'Lỗi khi gửi dữ liệu sang Google Sheet Webhook'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchSearch = s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        s.studentCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = selectedFilterClass === 'all' || s.classId === selectedFilterClass;
    return matchSearch && matchClass;
  });

  return (
    <div className="space-y-6 font-poppins">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Quản lý Học sinh</h2>
          <p className="text-sm text-gray-500 mt-1">Danh sách học sinh, hồ sơ và đồng bộ dữ liệu thời gian thực</p>
        </div>

        {userRole === 'admin' && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Google Sheets Actions */}
            <button 
              onClick={handleSyncFromSheets}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-sm transition-all border border-emerald-200 shadow-sm"
              title="Kéo danh sách học sinh từ Google Sheet về hệ thống"
            >
              {isSyncing ? <RefreshCw size={16} className="animate-spin text-emerald-600" /> : <Download size={16} />}
              <span>Đồng bộ từ Sheet</span>
            </button>

            <button 
              onClick={handleExportToSheets}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-sm transition-all border border-blue-200 shadow-sm"
              title="Ghi toàn bộ học sinh lên Google Sheet"
            >
              {isExporting ? <RefreshCw size={16} className="animate-spin text-blue-600" /> : <Upload size={16} />}
              <span>Xuất ra Sheet</span>
            </button>

            <button 
              onClick={() => setIsSheetModalOpen(true)}
              className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              title="Cài đặt kết nối Google Sheet & Xem mã Apps Script"
            >
              <Settings size={18} />
            </button>

            {/* Standard Add Student Button */}
            <button onClick={handleAdd} className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm">
              <Plus size={18} />
              Thêm Học sinh
            </button>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50">
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, mã HS..."
              className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Lọc theo lớp:</span>
            <select 
              className="px-4 py-2.5 w-full sm:w-auto border border-gray-200 rounded-xl text-gray-700 outline-none text-sm bg-white focus:ring-2 focus:ring-blue-500 shadow-sm"
              value={selectedFilterClass}
              onChange={(e) => setSelectedFilterClass(e.target.value)}
            >
              <option value="all">Tất cả lớp học</option>
              {classesList.map((c, cIdx) => (
                <option key={c.id || `class-filter-${cIdx}`} value={c.id}>{c.className} (Khối {c.grade})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <span>Đang tải danh sách học sinh...</span>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-semibold">
                <tr>
                  <th className="px-6 py-4 border-b border-gray-100">Mã HS</th>
                  <th className="px-6 py-4 border-b border-gray-100">Họ và tên</th>
                  <th className="px-6 py-4 border-b border-gray-100">Giới tính</th>
                  <th className="px-6 py-4 border-b border-gray-100">Lớp</th>
                  <th className="px-6 py-4 border-b border-gray-100">SĐT</th>
                  <th className="px-6 py-4 border-b border-gray-100">Trạng thái</th>
                  {userRole === 'admin' && (
                    <th className="px-6 py-4 border-b border-gray-100">Tài khoản (Tự động)</th>
                  )}
                  {userRole === 'admin' && (
                    <th className="px-6 py-4 border-b border-gray-100 text-right">Thao tác</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={userRole === 'admin' ? 8 : 6} className="px-6 py-12 text-center text-gray-400">
                      <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium text-gray-600">Không tìm thấy dữ liệu học sinh nào.</p>
                      <p className="text-xs mt-1 text-gray-400">Thêm học sinh mới hoặc Đồng bộ từ Google Sheet để nạp dữ liệu.</p>
                    </td>
                  </tr>
                ) : filteredStudents.map((student, sIdx) => (
                  <tr 
                    key={student.id || student.studentCode || `student-row-${sIdx}`} 
                    className="hover:bg-blue-50/50 transition-colors border-b border-gray-50 last:border-0 cursor-pointer"
                    onClick={() => navigate(`/students/${student.id}`)}
                  >
                    <td className="px-6 py-4 font-semibold text-blue-600">{student.studentCode}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{student.fullName}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                        student.gender === 'Nữ' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {student.gender || 'Nam'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-semibold">
                        {student.class ? student.class.className : 'Chưa xếp'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">{student.phone || '---'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        student.user?.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {student.user?.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                    {userRole === 'admin' && (
                      <td className="px-6 py-4 text-xs text-gray-500">
                        <span className="font-mono text-gray-700">{student.user?.email || 'N/A'}</span><br/>
                        <span className="text-emerald-600 font-mono">Pass: {student.studentCode}@123</span>
                      </td>
                    )}
                    {userRole === 'admin' && (
                      <td className="px-6 py-4">
                        <div className="flex justify-end space-x-2">
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/students/${student.id}`); }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Xem chi tiết">
                            <Eye size={18} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(student); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Sửa">
                            <Edit size={18} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(student.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
    </div>
  );
};

export default Students;
